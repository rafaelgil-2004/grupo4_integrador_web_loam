package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;


public class NoAutenticadoException extends ExcepcionApi {
    public NoAutenticadoException(String mensaje) {
        super(HttpStatus.UNAUTHORIZED, "NO_AUTENTICADO "+ mensaje);
    }
}