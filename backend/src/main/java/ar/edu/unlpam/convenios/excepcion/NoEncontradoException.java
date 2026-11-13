package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

/** El recurso pedido no existe (404). */
public class NoEncontradoException extends ExcepcionApi {

    public NoEncontradoException(String mensaje) {
        super(HttpStatus.NOT_FOUND, mensaje);
    }

    /** Ejemplo: new NoEncontradoException("Convenio", 5) → "Convenio con id 5 no encontrado". */
    public NoEncontradoException(String recurso, Object id) {
        this(recurso + " con id " + id + " no encontrado");
    }
}
