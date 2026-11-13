package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

/**
 * Base de las excepciones de negocio de la API.
 * Cada subclase define el código HTTP con el que se responde.
 */
public abstract class ExcepcionApi extends RuntimeException {

    private final HttpStatus estado;

    protected ExcepcionApi(HttpStatus estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    public HttpStatus getEstado() {
        return estado;
    }
}
