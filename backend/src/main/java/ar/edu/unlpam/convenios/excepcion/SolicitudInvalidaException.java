package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

/**
 * Los datos enviados no cumplen una regla de negocio (400).
 * Ejemplo: aceptar un convenio en BORRADOR al que le faltan campos obligatorios.
 */
public class SolicitudInvalidaException extends ExcepcionApi {

    public SolicitudInvalidaException(String mensaje) {
        super(HttpStatus.BAD_REQUEST, mensaje);
    }
}
