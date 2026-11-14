package ar.edu.unlpam.convenios.controlador;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import ar.edu.unlpam.convenios.dto.ObservacionRespuesta;
import ar.edu.unlpam.convenios.dto.ObservacionSolicitud;
import ar.edu.unlpam.convenios.entidad.Observacion;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.servicio.ObservacionServicio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag (name = "Obseervaciones")
@RestController
@RequestMapping("/convenios/{convenioId}/observaciones")
@RequiredArgsConstructor
public class ObservacionControlador {

    private final ObservacionServicio servicio;

    @Operation (
        summary = "Listar los comentarios de un convenio",
        description = "Devuelve los comentarios del convenio, del más reciente al más antiguo. Solo los ven quienes tienen acceso al convenio (firmantes, Gestión de su unidad y Administración)"
    )
    @GetMapping
    public List<ObservacionRespuesta> listar(@PathVariable Long convenioId) {
        return servicio.listar(convenioId).stream().map(ObservacionControlador::aRespuesta).toList();
    }

    @Operation (
        summary = "Comentar un convenio",
        description = "Agrega un comentario del usuario logueado. Si el texto es detectado como ofensivo, no se guarda: queda registrado como “comentario ofensivo” con la marca ofensivo en verdadero"
    )
    // El filtro de comentarios ofensivos lo aplica el servicio
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ObservacionRespuesta crear(@PathVariable Long convenioId,
                                      @Valid @RequestBody ObservacionSolicitud solicitud) {
        return aRespuesta(servicio.crear(convenioId, solicitud));
    }

    private static ObservacionRespuesta aRespuesta(Observacion o) {
        Usuario u = o.getUsuario();
        return new ObservacionRespuesta(o.getId(), o.getConvenio().getId(), u.getId(),
            u.getNombre() + " " + u.getApellido(), o.getTexto(), o.getOfensivo(), o.getFechaHora());
    }
}