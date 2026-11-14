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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag (name = "Firmas")
@RestController
@RequiredArgsConstructor
public class FirmaControlador {

    private final FirmaServicio servicio;

    @Operation (
        summary = "Firmar un convenio",
        description = "Registra la firma del usuario logueado, que debe ser uno de los firmantes del convenio. Recibe latitud, longitud y la imagen de la firma a mano (multipart). Solo se puede firmar un convenio Aceptado y una sola vez. Cuando firman todos los implicados, el convenio pasa automáticamente a Firmado"
    )
    // La app manda multipart: latitud, longitud e "imagen" (PNG de la firma a mano)
    @PostMapping(value = "/convenios/{convenioId}/firmas", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public FirmaRespuesta firmar(@PathVariable Long convenioId,
                                 @RequestParam Double latitud,
                                 @RequestParam Double longitud,
                                 @RequestPart(value = "imagen", required = false) MultipartFile imagen) {
        return aRespuesta(servicio.firmar(convenioId, latitud, longitud, imagen));
    }

    @Operation(
        summary = "Ver las firmas de un convenio",
        description = "Lista los firmantes con si firmaron y, de ser así, fecha, hora y coordenadas"
    )
    @GetMapping("/convenios/{convenioId}/firmas")
    public List<FirmaRespuesta> listar(@PathVariable Long convenioId) {
        return servicio.listar(convenioId).stream().map(FirmaControlador::aRespuesta).toList();
    }

    @Operation (
        summary = "Mis convenios pendientes de firma",
        description = "Devuelve los convenios Aceptados que el usuario logueado todavía no firmó, del más reciente al más antiguo. El parámetro limite fija la cantidad máxima (10 por defecto en la app). Alimenta “Mis pendientes” de la app"
    )
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