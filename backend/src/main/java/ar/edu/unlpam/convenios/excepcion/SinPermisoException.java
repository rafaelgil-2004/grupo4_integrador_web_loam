package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

/** El usuario está autenticado pero no puede realizar la acción (403). */
public class SinPermisoException extends ExcepcionApi {

    public SinPermisoException(String mensaje) {
        super(HttpStatus.FORBIDDEN, mensaje);
    }

    public SinPermisoException() {
        this("No tiene permiso para realizar esta acción");
    }
}
