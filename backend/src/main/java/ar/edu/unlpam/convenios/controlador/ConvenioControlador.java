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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Lectura: todos los roles (el servicio filtra por visibilidad).
 * Escritura: Administración y Gestión (el servicio además valida la unidad).
 */
@RestController
@RequestMapping("/convenios")
@RequiredArgsConstructor
public class ConvenioControlador {

    private static final String PUEDE_ESCRIBIR = "hasAnyRole('ADMINISTRACION','GESTION')";

    private final ConvenioServicio servicio;

    // ---------- Lectura ----------

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

    @GetMapping("/{id}")
    public ConvenioRespuesta obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @GetMapping("/{id}/historial")
    public List<ConvenioHistorial> historial(@PathVariable Long id) {
        return servicio.historial(id).stream().map(ConvenioControlador::aHistorial).toList();
    }

    // ---------- Escritura ----------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta crear(@Valid @RequestBody ConvenioSolicitud solicitud) {
        return servicio.crear(solicitud);
    }

    @PutMapping("/{id}")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta editar(@PathVariable Long id, @Valid @RequestBody ConvenioSolicitud solicitud) {
        return servicio.editar(id, solicitud);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(PUEDE_ESCRIBIR)
    public void eliminar(@PathVariable Long id) {
        servicio.eliminar(id);
    }

    // ---------- Transiciones de estado ----------

    @PostMapping("/{id}/aceptar")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta aceptar(@PathVariable Long id) {
        return servicio.aceptar(id);
    }

    // El fundamento es obligatorio (MotivoSolicitud tiene @NotBlank)
    @PostMapping("/{id}/rescindir")
    @PreAuthorize(PUEDE_ESCRIBIR)
    public ConvenioRespuesta rescindir(@PathVariable Long id, @Valid @RequestBody MotivoSolicitud solicitud) {
        return servicio.rescindir(id, solicitud.getMotivo());
    }

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