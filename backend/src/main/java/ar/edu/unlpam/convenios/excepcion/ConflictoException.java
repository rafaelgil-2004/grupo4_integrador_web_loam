package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

/**
 * La acción choca con el estado actual de los datos (409).
 * Ejemplos: código de convenio duplicado, transición de estado no permitida.
 */
public class ConflictoException extends ExcepcionApi {

    public ConflictoException(String mensaje) {
        super(HttpStatus.CONFLICT, mensaje);
    }
}
