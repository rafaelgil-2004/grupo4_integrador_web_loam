package ar.edu.unlpam.convenios.controlador;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.dto.FirmaRespuesta;
import ar.edu.unlpam.convenios.entidad.ConvenioImplicado;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.servicio.FirmaServicio;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class FirmaControlador {

    private final FirmaServicio servicio;

    // La app manda multipart: latitud, longitud e "imagen" (PNG de la firma a mano)
    @PostMapping(value = "/convenios/{convenioId}/firmas", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FirmaRespuesta firmar(@PathVariable Long convenioId,
                                 @RequestParam Double latitud,
                                 @RequestParam Double longitud,
                                 @RequestPart(value = "imagen", required = false) MultipartFile imagen) {
        return aRespuesta(servicio.firmar(convenioId, latitud, longitud, imagen));
    }

    @GetMapping("/convenios/{convenioId}/firmas")
    public List<FirmaRespuesta> listar(@PathVariable Long convenioId) {
        return servicio.listar(convenioId).stream().map(FirmaControlador::aRespuesta).toList();
    }

    @GetMapping("/firmas/pendientes")
    public List<ConvenioRespuesta> pendientes(@RequestParam(defaultValue = "10") int limite) {
        return servicio.pendientes(Math.min(Math.max(limite, 1), 50));
    }

    private static FirmaRespuesta aRespuesta(ConvenioImplicado i) {
        Usuario u = i.getUsuario();
        return new FirmaRespuesta(i.getId(), i.getConvenio().getId(), u.getId(),
            u.getNombre() + " " + u.getApellido(), Boolean.TRUE.equals(i.getFirmado()),
            i.getFechaFirma(), i.getLatitud(), i.getLongitud());
    }
}