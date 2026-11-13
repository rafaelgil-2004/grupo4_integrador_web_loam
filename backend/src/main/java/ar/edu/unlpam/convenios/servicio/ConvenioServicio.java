@Service
@Transactional
public class ConvenioServicio {

    @Autowired private ConvenioRepositorio convenioRepo;
    @Autowired private ConvenioImplicadoRepositorio implicadoRepo;
    @Autowired private DocumentoRepositorio documentoRepo;
    @Autowired private UsuarioRepositorio usuarioRepo;
    @Autowired private UnidadRepositorio unidadRepo;
    @Autowired private HistorialServicio historialServicio;
    @Autowired private AlmacenamientoServicio almacenamiento;

    @Value("${convenios.dias-por-vencer}")
    private int diasPorVencer;

    // ================= Visibilidad y permisos =================

    // Todo parte de acá: Admin ve todo, Gestión su unidad, Consulta los suyos (sin borradores)
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
            case GESTION -> c.getUnidad().getId().equals(u.unidadId());
            default -> c.getEstado() != EstadoConvenio.BORRADOR
                && implicadoRepo.findByConvenioIdAndUsuarioId(c.getId(), u.id()).isPresent();
        };
    }

    public boolean puedeEscribir(Convenio c) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        return u.rol() == Rol.ADMINISTRACION
            || (u.rol() == Rol.GESTION && c.getUnidad().getId().equals(u.unidadId()));
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

    // ================= R1: lectura =================

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
            .filter(c -> incluirArchivados || estado == EstadoConvenio.ARCHIVADO
                      || c.getEstado() != EstadoConvenio.ARCHIVADO)
            .filter(c -> unidadId == null || c.getUnidad().getId().equals(unidadId))
            .filter(c -> anioFirma == null
                      || (c.getFechaFirma() != null && c.getFechaFirma().getYear() == anioFirma))
            .filter(c -> coincideVigencia(c, vigencia))
            .sorted(Comparator.comparing(Convenio::getFechaActualizacion).reversed())
            .toList();
    }

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

    public ConvenioRespuesta obtener(Long id) {
        return aRespuesta(obtenerVisible(id));
    }

    public List<Historial> historial(Long id) {
        obtenerVisible(id); // valida que el usuario pueda ver el convenio
        return historialServicio.listar(id);
    }

    // ================= R4: árbol =================

    // Si el padre no está entre los resultados filtrados, el hijo se muestra como raíz
    public List<ArbolNodo> arbol(String q, TipoConvenio tipo, Subtipo subtipo,
            EstadoConvenio estado, Long unidadId, Integer anioFirma, String vigencia,
            boolean incluirArchivados) {
        List<Convenio> lista = filtrar(q, tipo, subtipo, estado, unidadId, anioFirma,
                                       vigencia, incluirArchivados);
        Set<Long> ids = lista.stream().map(Convenio::getId).collect(Collectors.toSet());
        Map<Long, List<Convenio>> hijosPorPadre = lista.stream()
            .filter(c -> c.getPadre() != null && ids.contains(c.getPadre().getId()))
            .collect(Collectors.groupingBy(c -> c.getPadre().getId()));
        return lista.stream()
            .filter(c -> c.getPadre() == null || !ids.contains(c.getPadre().getId()))
            .map(c -> construirNodo(c, hijosPorPadre))
            .toList();
    }

    // Recursivo: hijos convenio + documentos del convenio como hojas
    private ArbolNodo construirNodo(Convenio c, Map<Long, List<Convenio>> hijosPorPadre) {
        List<ArbolNodo> hijos = new ArrayList<>();
        for (Convenio h : hijosPorPadre.getOrDefault(c.getId(), List.of()))
            hijos.add(construirNodo(h, hijosPorPadre));
        for (Documento d : documentoRepo.findByConvenioId(c.getId()))
            hijos.add(new ArbolNodo(d.getId(), "DOCUMENTO", null, d.getNombre(), null, List.of()));
        return new ArbolNodo(c.getId(), "CONVENIO", c.getCodigo(), c.getTitulo(), c.getEstado(), hijos);
    }

    // ================= R2: crear, editar, eliminar =================

    public ConvenioRespuesta crear(ConvenioSolicitud s) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        if (u.rol() != Rol.ADMINISTRACION && u.rol() != Rol.GESTION)
            throw new SinPermisoException("No tiene permisos para crear convenios");
        Convenio c = new Convenio();
        c.setEstado(EstadoConvenio.BORRADOR);
        c.setCreadoPor(usuarioRepo.getReferenceById(u.id()));
        aplicar(c, s, u);
        c.setCodigo(generarCodigo(s.tipo(), s.subtipo()));
        Convenio guardado = convenioRepo.saveAndFlush(c);
        reemplazarImplicados(guardado, s.implicadosIds());
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
        if (s.revision() == null || !s.revision().equals(c.getRevision()))
            throw new ConflictoException("VERSION_DESACTUALIZADA",
                "El convenio fue modificado por otra persona. Recargue para ver los cambios");
        boolean eraAceptado = c.getEstado() == EstadoConvenio.ACEPTADO;
        if (eraAceptado && (s.motivo() == null || s.motivo().isBlank()))
            throw new SolicitudInvalidaException("Debe indicar el motivo de la modificación");

        aplicar(c, s, u);
        // La lista de implicados se reemplaza siempre: en un Aceptado esto anula las firmas
        reemplazarImplicados(c, s.implicadosIds());
        Convenio guardado = convenioRepo.saveAndFlush(c); // @Version incrementa 'revision'
        historialServicio.registrar(guardado, eraAceptado ? "MODIFICAR" : "EDITAR",
            guardado.getEstado(), guardado.getEstado(), s.motivo());
        return aRespuesta(guardado);
    }

    public void eliminar(Long id) {
        Convenio c = obtenerVisible(id);
        exigirEscritura(c);
        if (c.getEstado() != EstadoConvenio.BORRADOR)
            throw new ConflictoException("TRANSICION_INVALIDA", "Solo se pueden eliminar borradores");
        if (convenioRepo.existsByPadreId(id))
            throw new ConflictoException("TIENE_DEPENDIENTES", "El convenio tiene convenios dependientes");
        documentoRepo.findByConvenioId(id).forEach(d -> almacenamiento.borrar(d.getRutaArchivo()));
        convenioRepo.delete(c); // las filas hijas se borran por ON DELETE CASCADE
    }

    // ================= R2: transiciones de estado =================

    public ConvenioRespuesta aceptar(Long id) {
        return transicionar(id, Set.of(EstadoConvenio.BORRADOR), EstadoConvenio.ACEPTADO,
            "ACEPTAR", null, this::validarParaAceptar);
    }

    public ConvenioRespuesta rescindir(Long id, String motivo) {
        return transicionar(id, Set.of(EstadoConvenio.FIRMADO), EstadoConvenio.RESCINDIDO,
            "RESCINDIR", motivo, null);
    }

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

    private void validarParaAceptar(Convenio c) {
        if (c.getOrganizacion() == null || c.getOrganizacion().isBlank() || c.getFechaInicio() == null)
            throw new SolicitudInvalidaException("Faltan datos obligatorios: organización y fecha de inicio");
        if (c.getTipo() != TipoConvenio.MARCO && c.getPadre() == null)
            throw new SolicitudInvalidaException("Un específico o una adenda necesita un convenio padre");
        if (!documentoRepo.existsByConvenioId(c.getId()))
            throw new SolicitudInvalidaException("Debe adjuntar el PDF del convenio");
        if (implicadoRepo.findByConvenioId(c.getId()).isEmpty())
            throw new SolicitudInvalidaException("Debe indicar al menos un firmante");
    }

    // ================= Auxiliares =================

    // Copia los datos de la solicitud a la entidad (la usan crear y editar)
    private void aplicar(Convenio c, ConvenioSolicitud s, UsuarioAutenticado u) {
        if (s.fechaInicio() != null && s.fechaVencimiento() != null
                && s.fechaVencimiento().isBefore(s.fechaInicio()))
            throw new SolicitudInvalidaException("El vencimiento no puede ser anterior al inicio");
        // Gestión siempre trabaja en su unidad; Administración debe indicarla
        Long unidadId = u.rol() == Rol.GESTION ? u.unidadId() : s.unidadId();
        if (unidadId == null)
            throw new SolicitudInvalidaException("Debe indicar la unidad responsable");
        c.setUnidad(unidadRepo.findById(unidadId)
            .orElseThrow(() -> new SolicitudInvalidaException("La unidad no existe")));
        c.setTitulo(s.titulo().trim());
        c.setTipo(s.tipo());
        c.setSubtipo(s.subtipo());
        c.setOrganizacion(s.organizacion());
        c.setObjeto(s.objeto());
        c.setResolucion(s.resolucion());
        c.setExpediente(s.expediente());
        c.setFechaInicio(s.fechaInicio());
        c.setFechaVencimiento(s.fechaVencimiento());
        c.setPadre(resolverPadre(c, s));
    }

    private Convenio resolverPadre(Convenio c, ConvenioSolicitud s) {
        if (s.padreId() == null) return null;
        if (s.tipo() == TipoConvenio.MARCO)
            throw new SolicitudInvalidaException("Un marco no puede tener convenio padre");
        Convenio padre = obtenerVisible(s.padreId());
        if (s.tipo() == TipoConvenio.ESPECIFICO
                && (padre.getTipo() != TipoConvenio.MARCO || padre.getSubtipo() != s.subtipo()))
            throw new SolicitudInvalidaException(
                "El padre de un específico debe ser un marco del mismo subtipo");
        // Recorre los ancestros para evitar ciclos (el árbol recursivo nunca terminaría)
        for (Convenio a = padre; a != null; a = a.getPadre())
            if (a.getId().equals(c.getId()))
                throw new SolicitudInvalidaException("El convenio padre genera un ciclo");
        return padre;
    }

    private void reemplazarImplicados(Convenio c, List<Long> ids) {
        implicadoRepo.deleteByConvenioId(c.getId());
        // Hibernate ejecuta los INSERT antes que los DELETE: sin este flush, volver a insertar
        // el mismo (convenio, usuario) violaría la restricción UNIQUE uq_implicado
        implicadoRepo.flush();
        if (ids == null) return;
        for (Long idUsuario : new LinkedHashSet<>(ids)) { // el Set descarta repetidos
            Usuario usuario = usuarioRepo.findById(idUsuario).orElseThrow(
                () -> new SolicitudInvalidaException("Usuario inexistente: " + idUsuario));
            if (!usuario.isActivo() || !UsuarioServicio.esDeConsulta(usuario.getRol()))
                throw new SolicitudInvalidaException(
                    "Solo pueden firmar usuarios activos de consulta: " + usuario.getMail());
            ConvenioImplicado implicado = new ConvenioImplicado();
            implicado.setConvenio(c);
            implicado.setUsuario(usuario);
            implicadoRepo.save(implicado);
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
        long n = convenioRepo.countByCodigoStartingWith(inicio) + 1;
        // Si se borró un borrador, el conteo puede repetir un código existente
        while (convenioRepo.existsByCodigo(inicio + String.format("%03d", n))) n++;
        return inicio + String.format("%03d", n);
    }
}