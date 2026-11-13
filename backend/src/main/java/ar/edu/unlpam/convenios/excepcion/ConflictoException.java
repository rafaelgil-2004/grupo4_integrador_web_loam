package ar.edu.unlpam.convenios.excepcion;

import org.springframework.http.HttpStatus;

/**
 * La acción choca con el estado actual de los datos (409).
 * Ejemplos: mail duplicado, transición de estado no permitida, versión desactualizada.
 *
 * El código identifica el motivo para que la web y la app puedan reaccionar
 * (por ejemplo VERSION_DESACTUALIZADA: avisar y recargar).
 */
public class ConflictoException extends ExcepcionApi {

    private final String codigo;

    public ConflictoException(String mensaje) {
        this("CONFLICTO", mensaje);
    }

    public ConflictoException(String codigo, String mensaje) {
        super(HttpStatus.CONFLICT, mensaje);
        this.codigo = codigo;
    }

    public String getCodigo() {
        return codigo;
    }
}