package ar.edu.unlpam.convenios.servicio;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PagedModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import ar.edu.unlpam.convenios.dto.ArbolNodo;
import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.dto.ConvenioSolicitud;
import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.ConvenioImplicado;
import ar.edu.unlpam.convenios.entidad.Documento;
import ar.edu.unlpam.convenios.entidad.Historial;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import ar.edu.unlpam.convenios.excepcion.ConflictoException;
import ar.edu.unlpam.convenios.excepcion.NoEncontradoException;
import ar.edu.unlpam.convenios.excepcion.SinPermisoException;
import ar.edu.unlpam.convenios.excepcion.SolicitudInvalidaException;
import ar.edu.unlpam.convenios.repositorio.ConvenioImplicadoRepositorio;
import ar.edu.unlpam.convenios.repositorio.ConvenioRepositorio;
import ar.edu.unlpam.convenios.repositorio.DocumentoRepositorio;
import ar.edu.unlpam.convenios.repositorio.UnidadRepositorio;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor 
public class ConvenioServicio {

    private final ConvenioRepositorio convenioRepo;
    private final ConvenioImplicadoRepositorio implicadoRepo;
    private final DocumentoRepositorio documentoRepo;
    private final UsuarioRepositorio usuarioRepo;
    private final UnidadRepositorio unidadRepo;
    private final HistorialServicio historialServicio;
    private final AlmacenamientoServicio almacenamiento;

    @Value("${convenios.dias-por-vencer:30}")
    private int diasPorVencer;

    // ================= Visibilidad y permisos =================

    // Todo parte de acá: Admin ve todo, Gestión su unidad, Consulta los suyos (sin borradores)
    @Transactional(readOnly = true)
    public List<Convenio> visibles() {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        return switch (u.rol()) {
            case ADMINISTRACION -> convenioRepo.findAll();
            case GESTION -> convenioRepo.findByUnidadId(u.unidadId());
            default -> implicadoRepo.findByUsuarioId(u.id()).stream()
                .map(ConvenioImplicado::getConvenio)
                .filter(c -> c.getEstado() != EstadoConvenio.BORRADOR)
                .toList();
        };
    }

    private boolean puedeVer(Convenio c, UsuarioAutenticado u) {
        return switch (u.rol()) {
            case ADMINISTRACION -> true;
            case GESTION -> u.perteneceAUnidad(c.getUnidad().getId());
            default -> c.getEstado() != EstadoConvenio.BORRADOR
                && implicadoRepo.findByConvenioIdAndUsuarioId(c.getId(), u.id()).isPresent();
        };
    }

    public boolean puedeEscribir(Convenio c) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        return u.esAdministracion()
            || (u.tieneRol(Rol.GESTION) && u.perteneceAUnidad(c.getUnidad().getId()));
    }

    public void exigirEscritura(Convenio c) {
        if (!puedeEscribir(c))
            throw new SinPermisoException("No tiene permisos para modificar este convenio");
    }

    // 404 tanto si no existe como si el usuario no lo puede ver (no revela su existencia)
    public Convenio obtenerVisible(Long id) {
        Convenio c = convenioRepo.findById(id)
            .orElseThrow(() -> new NoEncontradoException("Convenio no encontrado"));
        if (!puedeVer(c, UsuarioAutenticado.actual()))
            throw new NoEncontradoException("Convenio no encontrado");
        return c;
    }

    // ================= Vigencia (se calcula, no se guarda) =================

    public String calcularVigencia(Convenio c) {
        if (c.getEstado() != EstadoConvenio.FIRMADO) return null;
        if (c.getFechaVencimiento() == null) return "SIN_VENCIMIENTO";
        LocalDate hoy = LocalDate.now();
        if (c.getFechaVencimiento().isBefore(hoy)) return "EXPIRADO";
        if (!c.getFechaVencimiento().isAfter(hoy.plusDays(diasPorVencer))) return "POR_VENCER";
        return "VIGENTE";
    }

    // "Vigente" incluye los por vencer y los sin vencimiento
    public static boolean esVigente(String vigencia) {
        return "VIGENTE".equals(vigencia) || "POR_VENCER".equals(vigencia)
            || "SIN_VENCIMIENTO".equals(vigencia);
    }

    private boolean coincideVigencia(Convenio c, String filtro) {
        if (filtro == null || filtro.isBlank()) return true;
        String v = calcularVigencia(c);
        return "VIGENTE".equals(filtro) ? esVigente(v) : filtro.equals(v);
    }

    public ConvenioRespuesta aRespuesta(Convenio c) {
        return ConvenioRespuesta.desde(c, calcularVigencia(c), implicadoRepo.findByConvenioId(c.getId()));
    }

    // ================= Lectura =================

    private List<Convenio> filtrar(String q, TipoConvenio tipo, Subtipo subtipo,
            EstadoConvenio estado, Long unidadId, Integer anioFirma, String vigencia,
            boolean incluirArchivados) {
        String texto = q == null ? "" : q.trim().toLowerCase();
        return visibles().stream()
            .filter(c -> texto.isEmpty() || c.getTitulo().toLowerCase().contains(texto)
                      || c.getCodigo().toLowerCase().contains(texto))
            .filter(c -> tipo == null || c.getTipo() == tipo)
            .filter(c -> subtipo == null || c.getSubtipo() == subtipo)
            .filter(c -> estado == null || c.getEstado() == estado)
            // Los archivados quedan fuera salvo que se pidan o se filtre por ese estado
            .filter(c -> incluirArchivados || estado == EstadoConvenio.ARCHIVADO
                      || c.getEstado() != EstadoConvenio.ARCHIVADO)
            .filter(c -> unidadId == null || c.getUnidad().getId().equals(unidadId))
            .filter(c -> anioFirma == null
                      || (c.getFechaFirma() != null && c.getFechaFirma().getYear() == anioFirma))
            .filter(c -> coincideVigencia(c, vigencia))
            .sorted(Comparator.comparing(Convenio::getFechaActualizacion).reversed())
            .toList();
    }

    @Transactional(readOnly = true)
    public PagedModel<ConvenioRespuesta> listar(String q, TipoConvenio tipo, Subtipo subtipo,
            EstadoConvenio estado, Long unidadId, Integer anioFirma, String vigencia,
            boolean incluirArchivados, int pagina, int tamanio) {
        List<Convenio> lista = filtrar(q, tipo, subtipo, estado, unidadId, anioFirma,
                                       vigencia, incluirArchivados);
        Pageable pageable = PageRequest.of(Math.max(pagina, 0), Math.min(Math.max(tamanio, 1), 100));
        // Paginación manual sobre la lista ya filtrada
        int desde = (int) Math.min(pageable.getOffset(), lista.size());
        int hasta = Math.min(desde + pageable.getPageSize(), lista.size());
        List<ConvenioRespuesta> contenido = lista.subList(desde, hasta).stream()
            .map(this::aRespuesta).toList();
        return new PagedModel<>(new PageImpl<>(contenido, pageable, lista.size()));
    }

    @Transactional(readOnly = true)
    public ConvenioRespuesta obtener(Long id) {
        return aRespuesta(obtenerVisible(id));
    }

    @Transactional(readOnly = true)
    public List<Historial> historial(Long id) {
        obtenerVisible(id); // valida que el usuario pueda ver el convenio
        return historialServicio.listar(id);
    }

    // ================= Árbol =================

    // Si el padre no está entre los resultados filtrados, el hijo se muestra como raíz
    @Transactional(readOnly = true)
    public List<ArbolNodo> arbol(String q, TipoConvenio tipo, Subtipo subtipo,
            EstadoConvenio estado, Long unidadId, Integer anioFirma, String vigencia,
            boolean incluirArchivados) {
        List<Convenio> lista = filtrar(q, tipo, subtipo, estado, unidadId, anioFirma,
                                       vigencia, incluirArchivados);
        Set<Long> ids = lista.stream().map(Convenio::getId).collect(Collectors.toSet());
        Map<Long, List<Convenio>> hijosPorPadre = lista.stream()
            .filter(c -> c.getConvenioPadre() != null && ids.contains(c.getConvenioPadre().getId()))
            .collect(Collectors.groupingBy(c -> c.getConvenioPadre().getId()));
        return lista.stream()
            .filter(c -> c.getConvenioPadre() == null || !ids.contains(c.getConvenioPadre().getId()))
            .map(c -> construirNodo(c, hijosPorPadre))
            .toList();
    }

    // Recursivo: cada nodo es un convenio y sus hijos son los convenios que cuelgan de él
    private ArbolNodo construirNodo(Convenio c, Map<Long, List<Convenio>> hijosPorPadre) {
        ArbolNodo nodo = new ArbolNodo();
        nodo.setId(c.getId());
        nodo.setCodigo(c.getCodigo());
        nodo.setTitulo(c.getTitulo());
        nodo.setTipo(c.getTipo());
        nodo.setSubtipo(c.getSubtipo());
        nodo.setEstado(c.getEstado());
        nodo.setUnidadNombre(c.getUnidad().getNombre());
        nodo.setFechaVencimiento(c.getFechaVencimiento());
        for (Convenio h : hijosPorPadre.getOrDefault(c.getId(), List.of()))
            nodo.getHijos().add(construirNodo(h, hijosPorPadre));
        return nodo;
    }

    // ================= Crear, editar, eliminar =================

    public ConvenioRespuesta crear(ConvenioSolicitud s) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        if (!u.esAdministracion() && !u.tieneRol(Rol.GESTION))
            throw new SinPermisoException("No tiene permisos para crear convenios");
        Convenio c = new Convenio();
        c.setEstado(EstadoConvenio.BORRADOR);
        c.setCreadoPor(usuarioRepo.getReferenceById(u.id()));
        aplicar(c, s, u);
        c.setCodigo(generarCodigo(s.getTipo(), s.getSubtipo()));
        Convenio guardado = convenioRepo.saveAndFlush(c);
        crearImplicados(guardado, s.getImplicadosIds());
        historialServicio.registrar(guardado, "CREAR", null, EstadoConvenio.BORRADOR, null);
        return aRespuesta(guardado);
    }

    public ConvenioRespuesta editar(Long id, ConvenioSolicitud s) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        Convenio c = obtenerVisible(id);
        exigirEscritura(c);
        if (c.getEstado() != EstadoConvenio.BORRADOR && c.getEstado() != EstadoConvenio.ACEPTADO)
            throw new ConflictoException("TRANSICION_INVALIDA",
                "Solo se puede editar un convenio en Borrador o Aceptado");
        if (s.getRevision() == null || !s.getRevision().equals(c.getRevision()))
            throw new ConflictoException("VERSION_DESACTUALIZADA",
                "El convenio fue modificado por otra persona. Recargue para ver los cambios");
        // El código se genera con el tipo y el subtipo: si cambiaran, quedaría desfasado
        if (s.getTipo() != c.getTipo() || s.getSubtipo() != c.getSubtipo())
            throw new SolicitudInvalidaException("No se puede cambiar el tipo ni el subtipo de un convenio");
        boolean eraAceptado = c.getEstado() == EstadoConvenio.ACEPTADO;
        if (eraAceptado && (s.getMotivo() == null || s.getMotivo().isBlank()))
            throw new SolicitudInvalidaException("Debe indicar el motivo de la modificación");

        aplicar(c, s, u);
        if (s.getImplicadosIds() != null) {
            // Lista nueva: las filas se recrean sin firmar (en un Aceptado esto anula las firmas)
            reemplazarImplicados(c, s.getImplicadosIds());
        } else if (eraAceptado) {
            // No vino la lista: se conservan los firmantes, pero se anulan sus firmas
            anularFirmas(c);
        }
        // Un Aceptado editado debe seguir cumpliendo todo lo que se pidió para aceptarlo
        if (eraAceptado) validarParaAceptar(c);

        // Fuerza el UPDATE aunque solo hayan cambiado los implicados:
        // así se incrementa 'revision' y se actualiza la fecha
        c.setFechaActualizacion(LocalDateTime.now());
        Convenio guardado = convenioRepo.saveAndFlush(c);
        historialServicio.registrar(guardado, eraAceptado ? "MODIFICAR" : "EDITAR",
            guardado.getEstado(), guardado.getEstado(), s.getMotivo());
        return aRespuesta(guardado);
    }

    public void eliminar(Long id) {
        Convenio c = obtenerVisible(id);
        exigirEscritura(c);
        if (c.getEstado() != EstadoConvenio.BORRADOR)
            throw new ConflictoException("TRANSICION_INVALIDA", "Solo se pueden eliminar borradores");
        if (convenioRepo.existsByConvenioPadreId(id))
            throw new ConflictoException("TIENE_DEPENDIENTES", "El convenio tiene convenios dependientes");
        List<String> rutas = documentoRepo.findByConvenioId(id).stream()
            .map(Documento::getRutaArchivo).toList();
        convenioRepo.delete(c); // las filas hijas se borran por ON DELETE CASCADE
        convenioRepo.flush();
        borrarArchivosDespuesDelCommit(rutas);
    }

    // Los PDFs se borran del disco solo si la transacción terminó bien
    private void borrarArchivosDespuesDelCommit(List<String> rutas) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                for (String ruta : rutas) {
                    try {
                        almacenamiento.borrar(ruta);
                    } catch (RuntimeException e) {
                        // El registro ya se borró: un archivo huérfano no debe devolver error
                    }
                }
            }
        });
    }

    // ================= Transiciones de estado =================

    public ConvenioRespuesta aceptar(Long id) {
        return transicionar(id, Set.of(EstadoConvenio.BORRADOR), EstadoConvenio.ACEPTADO,
            "ACEPTAR", null, this::validarParaAceptar);
    }

    public ConvenioRespuesta rescindir(Long id, String motivo) {
        if (motivo == null || motivo.isBlank())
            throw new SolicitudInvalidaException("Debe indicar el fundamento de la rescisión");
        return transicionar(id, Set.of(EstadoConvenio.FIRMADO), EstadoConvenio.RESCINDIDO,
            "RESCINDIR", motivo, null);
    }

    // El motivo es opcional: archivar es un cierre administrativo
    public ConvenioRespuesta archivar(Long id, String motivo) {
        return transicionar(id, Set.of(EstadoConvenio.FIRMADO, EstadoConvenio.RESCINDIDO),
            EstadoConvenio.ARCHIVADO, "ARCHIVAR", motivo, null);
    }

    // Todas las transiciones comparten estas reglas: acá está el "circuito de estados"
    private ConvenioRespuesta transicionar(Long id, Set<EstadoConvenio> permitidos,
            EstadoConvenio nuevo, String accion, String motivo, Consumer<Convenio> validacion) {
        Convenio c = obtenerVisible(id);
        exigirEscritura(c);
        if (!permitidos.contains(c.getEstado()))
            throw new ConflictoException("TRANSICION_INVALIDA",
                "No se puede pasar de " + c.getEstado() + " a " + nuevo);
        if (validacion != null) validacion.accept(c);
        EstadoConvenio anterior = c.getEstado();
        c.setEstado(nuevo);
        Convenio guardado = convenioRepo.saveAndFlush(c);
        historialServicio.registrar(guardado, accion, anterior, nuevo, motivo);
        return aRespuesta(guardado);
    }

    // Se necesitan al menos dos partes: la organización (externa) y un firmante con usuario
    private void validarParaAceptar(Convenio c) {
        if (c.getOrganizacion() == null || c.getOrganizacion().isBlank() || c.getFechaInicio() == null)
            throw new SolicitudInvalidaException("Faltan datos obligatorios: organización y fecha de inicio");
        if (c.getTipo() != TipoConvenio.MARCO && c.getConvenioPadre() == null)
            throw new SolicitudInvalidaException("Un específico o una adenda necesita un convenio padre");
        if (!documentoRepo.existsByConvenioId(c.getId()))
            throw new SolicitudInvalidaException("Debe adjuntar el PDF del convenio");
        if (implicadoRepo.findByConvenioId(c.getId()).isEmpty())
            throw new SolicitudInvalidaException(
                "Debe indicar al menos un firmante, además de la organización");
    }

    // ================= Auxiliares =================

    // Copia los datos de la solicitud a la entidad (la usan crear y editar)
    private void aplicar(Convenio c, ConvenioSolicitud s, UsuarioAutenticado u) {
        if (s.getFechaInicio() != null && s.getFechaVencimiento() != null
                && s.getFechaVencimiento().isBefore(s.getFechaInicio()))
            throw new SolicitudInvalidaException("El vencimiento no puede ser anterior al inicio");
        // Gestión siempre trabaja en su unidad; Administración debe indicarla
        Long unidadId = u.tieneRol(Rol.GESTION) ? u.unidadId() : s.getUnidadId();
        if (unidadId == null)
            throw new SolicitudInvalidaException("Debe indicar la unidad responsable");
        c.setUnidad(unidadRepo.findById(unidadId)
            .orElseThrow(() -> new SolicitudInvalidaException("La unidad no existe")));
        c.setTitulo(s.getTitulo().trim());
        c.setTipo(s.getTipo());
        c.setSubtipo(s.getSubtipo());
        c.setOrganizacion(s.getOrganizacion());
        c.setObjeto(s.getObjeto());
        c.setResolucion(s.getResolucion());
        c.setExpediente(s.getExpediente());
        c.setFechaInicio(s.getFechaInicio());
        c.setFechaVencimiento(s.getFechaVencimiento());
        c.setConvenioPadre(resolverPadre(c, s));
    }

    private Convenio resolverPadre(Convenio c, ConvenioSolicitud s) {
        if (s.getConvenioPadreId() == null) return null;
        if (s.getTipo() == TipoConvenio.MARCO)
            throw new SolicitudInvalidaException("Un marco no puede tener convenio padre");
        // Usa obtenerVisible: Gestión solo puede elegir padres de su propia unidad
        Convenio padre = obtenerVisible(s.getConvenioPadreId());
        if (s.getTipo() == TipoConvenio.ESPECIFICO
                && (padre.getTipo() != TipoConvenio.MARCO || padre.getSubtipo() != s.getSubtipo()))
            throw new SolicitudInvalidaException(
                "El padre de un específico debe ser un marco del mismo subtipo");
        // Recorre los ancestros para evitar ciclos (el árbol recursivo nunca terminaría)
        for (Convenio a = padre; a != null; a = a.getConvenioPadre())
            if (a.getId().equals(c.getId()))
                throw new SolicitudInvalidaException("El convenio padre genera un ciclo");
        return padre;
    }

    private void reemplazarImplicados(Convenio c, List<Long> ids) {
        implicadoRepo.deleteByConvenioId(c.getId());
        // Hibernate ejecuta los INSERT antes que los DELETE: sin este flush, volver a insertar
        // el mismo (convenio, usuario) violaría la restricción UNIQUE uq_implicado
        implicadoRepo.flush();
        crearImplicados(c, ids);
    }

    private void crearImplicados(Convenio c, List<Long> ids) {
        if (ids == null) return;
        for (Long idUsuario : new LinkedHashSet<>(ids)) { // el Set descarta repetidos
            Usuario usuario = usuarioRepo.findById(idUsuario).orElseThrow(
                () -> new SolicitudInvalidaException("Usuario inexistente: " + idUsuario));
            if (!Boolean.TRUE.equals(usuario.getActivo()) || !UsuarioServicio.esDeConsulta(usuario.getRol()))
                throw new SolicitudInvalidaException(
                    "Solo pueden firmar usuarios activos de consulta: " + usuario.getMail());
            ConvenioImplicado implicado = new ConvenioImplicado();
            implicado.setConvenio(c);
            implicado.setUsuario(usuario);
            implicadoRepo.save(implicado);
        }
    }

    void anularFirmas(Convenio c) {
        for (ConvenioImplicado i : implicadoRepo.findByConvenioId(c.getId())) {
            i.setFirmado(false);
            i.setFechaFirma(null);
            i.setLatitud(null);
            i.setLongitud(null);
            i.setFirmaRuta(null);
        }
    }

    // MCO-2026-001: M/E + subtipo (CO, PA, PR, IN) o ADE para adendas
    private String generarCodigo(TipoConvenio tipo, Subtipo subtipo) {
        String sub = switch (subtipo) {
            case COLABORACION -> "CO";
            case PASANTIA -> "PA";
            case PRACTICA -> "PR";
            case INTERCAMBIO -> "IN";
        };
        String prefijo = switch (tipo) {
            case MARCO -> "M" + sub;
            case ESPECIFICO -> "E" + sub;
            case ADENDA -> "ADE";
        };
        String inicio = prefijo + "-" + LocalDate.now().getYear() + "-";
        long n = countConPrefijo(inicio) + 1;
        // Si se borró un borrador, el conteo puede repetir un código existente
        while (convenioRepo.existsByCodigo(inicio + String.format("%03d", n))) n++;
        return inicio + String.format("%03d", n);
    }

    private long countConPrefijo(String inicio) {
        return convenioRepo.countByCodigoStartingWith(inicio);
    }
}