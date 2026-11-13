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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/convenios/{convenioId}/observaciones")
@RequiredArgsConstructor
public class ObservacionControlador {

    private final ObservacionServicio servicio;

    @GetMapping
    public List<ObservacionRespuesta> listar(@PathVariable Long convenioId) {
        return servicio.listar(convenioId).stream().map(ObservacionControlador::aRespuesta).toList();
    }

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