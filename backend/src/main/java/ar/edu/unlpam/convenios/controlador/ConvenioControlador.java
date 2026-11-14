package ar.edu.unlpam.convenios.controlador;

import java.util.List;

import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ar.edu.unlpam.convenios.dto.ArbolNodo;
import ar.edu.unlpam.convenios.dto.ConvenioHistorial;
import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.dto.ConvenioSolicitud;
import ar.edu.unlpam.convenios.dto.MotivoSolicitud;
import ar.edu.unlpam.convenios.entidad.Historial;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import ar.edu.unlpam.convenios.servicio.ConvenioServicio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Lectura: todos los roles (el servicio filtra por visibilidad).
 * Escritura: Administración y Gestión (el servicio además valida la unidad).
 */
@Tag(name = "Convenios") 
@RestController
@RequestMapping("/convenios")
@RequiredArgsConstructor
public class ConvenioControlador {

    private static final String PUEDE_ESCRIBIR = "hasAnyRole('ADMINISTRACION','GESTION')";

    private final ConvenioServicio servicio;

    // ---------- Lectura ----------

    @Operation (
        summary = "Listar y buscar convenios",
        description = "Devuelve una página de convenios con filtros opcionales: texto (q, en título y código), tipo, subtipo, estado, unidadId, anioFirma, vigencia (VIGENTE, POR_VENCER, EXPIRADO) e incluirArchivados. Ordena del más reciente al más antiguo. Cada usuario ve solo lo que le corresponde: Administración todo, Gestión su unidad y Consulta los convenios donde es firmante (nunca borradores). Respuesta paginada (content y page)"
    )
    @GetMapping
    public PagedModel<ConvenioRespuesta> listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TipoConvenio tipo,
            @RequestParam(required = false) Subtipo subtipo,
            @RequestParam(required = false) EstadoConvenio estado,
            @RequestParam(required = false) Long unidadId,
            @RequestParam(required = false) Integer anioFirma,
            @RequestParam(required = false) String vigencia,
            @RequestParam(defaultValue = "false") boolean incluirArchivados,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {
        return servicio.listar(q, tipo, subtipo, estado, unidadId, anioFirma, vigencia,
            incluirArchivados, pagina, tamanio);
    }

    @Operation (
        summary = "Obtener convenios como árbol",
        description = "Devuelve los convenios filtrados (mismos filtros que el listado) organizados jerárquicamente: marco → específicos y adendas → documentos. Si el padre de un convenio no está entre los resultados, el hijo aparece como raíz. Lo usa la vista de árbol de la web y el buscador de la app"
    )
    // Mismos filtros que el listado, sin paginación
    @GetMapping("/arbol")
    public List<ArbolNodo> arbol(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) TipoConvenio tipo,
            @RequestParam(required = false) Subtipo subtipo,
            @RequestParam(required = false) EstadoConvenio estado,
            @RequestParam(required = false) Long unidadId,
            @RequestParam(required = false) Integer anioFirma,
            @RequestParam(required = false) String vigencia,
            @RequestParam(defaultValue = "false") boolean incluirArchivados) {
        return servicio.arbol(q, tipo, subtipo, estado, unidadId, anioFirma, vigencia, incluirArchivados);
    }

    @Operation (
        summary = "Ver el detalle de un convenio",
        description = "Devuelve la ficha completa: datos, estado, vigencia calculada, convenio padre, firmantes con su estado de firma y revision. Responde 404 si no existe o si el usuario no tiene permiso para verlo"
    )
    @GetMapping("/{id}")
    public ConvenioRespuesta obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @Operation (
        summary = "Ver el historial de un convenio",
        description = "Lista todas las acciones realizadas sobre el convenio (creación, ediciones, cambios de estado, firmas y documentos subidos), con usuario, fecha, estados y motivo. Del más reciente al más antiguo"
    )
    @GetMapping("/{id}/historial")
    public List<ConvenioHistorial> historial(@PathVariable Long id) {
        return servicio.historial(id).stream().map(ConvenioControlador::aHistorial).toList();
    }

    // ---------- Escritura ----------

    @Operation (
        summary = "Crear un convenio",
        description = "Solo Administración y Gestión. Crea el convenio en estado Borrador y genera el código automáticamente (por ejemplo MCO-2026-001). Admite datos incompletos. Gestión siempre crea en su unidad. Un específico requiere un marco del mismo subtipo como padre y los firmantes deben ser usuarios de consulta activos"
    )
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta crear(@Valid @RequestBody ConvenioSolicitud solicitud) {
        return servicio.crear(solicitud);
    }

    @Operation (
        summary = "Editar un convenio",
        description = "Solo Administración y Gestión de su unidad. Permite editar convenios en Borrador o Aceptado. Debe enviarse la revision que se leyó: si otra persona modificó el convenio mientras tanto, responde 409 VERSION_DESACTUALIZADA. Editar un Aceptado exige un motivo y anula las firmas ya registradas"
    )
    @PutMapping("/{id}")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta editar(@PathVariable Long id, @Valid @RequestBody ConvenioSolicitud solicitud) {
        return servicio.editar(id, solicitud);
    }

    @Operation (
        summary = "Eliminar un convenio",
        description = "Solo Administración y Gestión de su unidad. Únicamente se pueden eliminar borradores sin convenios dependientes. Borra también sus firmantes, documentos (y archivos), comentarios e historial"
    )
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(PUEDE_ESCRIBIR)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    // ---------- Transiciones de estado ----------

    @Operation (
        summary = "Aceptar un convenio",
        description = "Pasa de Borrador a Aceptado, lo que habilita su firma. Valida que estén cargados organización y fecha de inicio, que tenga padre si no es un marco, que tenga al menos un PDF y un firmante. Responde 400 si falta algo y 409 si no está en Borrador"
    )
    @PostMapping("/{id}/aceptar")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta aceptar(@PathVariable Long id) {
        return servicio.aceptar(id);
    }

    @Operation (
        summary = "Rescindir un convenio",
        description = "Pasa de Firmado a Rescindido, es decir, terminó antes de tiempo. El cuerpo lleva el motivo, que queda registrado como fundamento en el historial. Responde 409 si no está Firmado"
    )
    // El fundamento es obligatorio (MotivoSolicitud tiene @NotBlank)
    @PostMapping("/{id}/rescindir")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta rescindir(@PathVariable Long id, @Valid @RequestBody MotivoSolicitud solicitud) {
        return servicio.rescindir(id, solicitud.getMotivo());
    }

    @Operation (
        summary = "Archivar un convenio",
        description = "Cierre administrativo: pasa de Firmado o Rescindido a Archivado. Los archivados no aparecen en el listado salvo que se pida incluirArchivados. El cuerpo lleva el motivo"
    )
    // El motivo es opcional: sin @Valid y con el cuerpo no requerido
    @PostMapping("/{id}/archivar")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta archivar(@PathVariable Long id,
                                      @RequestBody(required = false) MotivoSolicitud solicitud) {
        return servicio.archivar(id, solicitud == null ? null : solicitud.getMotivo());
    }

    // ---------- Mapeo ----------

    private static ConvenioHistorial aHistorial(Historial h) {
        Usuario u = h.getUsuario();
        return new ConvenioHistorial(h.getId(), h.getAccion(), h.getEstadoAnterior(), h.getEstadoNuevo(),
            h.getMotivo(), u.getId(), u.getNombre() + " " + u.getApellido(), h.getFechaHora());
    }
}