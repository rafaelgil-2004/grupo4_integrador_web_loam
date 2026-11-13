package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Cuerpo JSON que devuelve la API ante cualquier error.
 *
 * @param fechaHora momento del error
 * @param estado    código HTTP (404, 409, ...)
 * @param error     nombre del código HTTP ("Not Found", "Conflict", ...)
 * @param mensaje   descripción legible del problema
 * @param ruta      URL de la petición que falló
 * @param detalles  errores por campo (solo en validaciones; vacío en el resto)
 */
public record ErrorApi(
        LocalDateTime fechaHora,
        int estado,
        String error,
        String mensaje,
        String ruta,
        Map<String, String> detalles
) {

    public static ErrorApi de(HttpStatus estado, String mensaje, String ruta) {
        return de(estado, mensaje, ruta, Map.of());
    }

    public static ErrorApi de(HttpStatus estado, String mensaje, String ruta, Map<String, String> detalles) {
        return new ErrorApi(LocalDateTime.now(), estado.value(), estado.getReasonPhrase(),
                mensaje, ruta, detalles);
    }
}
