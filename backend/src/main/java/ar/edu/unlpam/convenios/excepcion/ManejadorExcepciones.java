package ar.edu.unlpam.convenios.excepcion;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduce las excepciones lanzadas en controladores y servicios
 * a respuestas HTTP con cuerpo {@link ErrorApi}.
 */
@RestControllerAdvice
public class ManejadorExcepciones {

    private static final Logger log = LoggerFactory.getLogger(ManejadorExcepciones.class);

    // ---------- Excepciones propias (404, 403, 409, 400) ----------

    @ExceptionHandler(ExcepcionApi.class)
    public ResponseEntity<ErrorApi> manejarExcepcionApi(ExcepcionApi ex, HttpServletRequest req) {
        return responder(ex.getEstado(), ex.getMessage(), req);
    }

    // ---------- Validación (@Valid en los DTO) ----------

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorApi> manejarValidacion(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> detalles = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) {
            detalles.merge(fe.getField(), String.valueOf(fe.getDefaultMessage()),
                    (a, b) -> a + "; " + b);
        }
        HttpStatus estado = HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(estado)
                .body(ErrorApi.de(estado, "Hay datos inválidos en la solicitud", req.getRequestURI(), detalles));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorApi> manejarJsonInvalido(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST, "El cuerpo de la solicitud está mal formado o tiene valores inválidos", req);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorApi> manejarTipoInvalido(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST,
                "El parámetro '" + ex.getName() + "' tiene un valor inválido: " + ex.getValue(), req);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorApi> manejarParametroFaltante(MissingServletRequestParameterException ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST, "Falta el parámetro '" + ex.getParameterName() + "'", req);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorApi> manejarArchivoFaltante(MissingServletRequestPartException ex, HttpServletRequest req) {
        return responder(HttpStatus.BAD_REQUEST, "Falta la parte '" + ex.getRequestPartName() + "' en la solicitud", req);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorApi> manejarArchivoGrande(MaxUploadSizeExceededException ex, HttpServletRequest req) {
        return responder(HttpStatus.CONTENT_TOO_LARGE, "El archivo supera el tamaño máximo permitido", req);
    }

    // ---------- Base de datos ----------

    /** Otro usuario modificó el convenio mientras se editaba (columna revision / @Version). */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorApi> manejarConcurrencia(ObjectOptimisticLockingFailureException ex, HttpServletRequest req) {
        return responder(HttpStatus.CONFLICT,
                "El registro fue modificado por otro usuario. Recargue los datos e intente de nuevo", req);
    }

    /** Violación de UNIQUE, FK o CHECK de la base. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorApi> manejarIntegridad(DataIntegrityViolationException ex, HttpServletRequest req) {
        log.warn("Violación de integridad en {}: {}", req.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return responder(HttpStatus.CONFLICT,
                "La operación entra en conflicto con datos existentes (valor duplicado o registro referenciado)", req);
    }

    // ---------- Seguridad ----------

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorApi> manejarNoAutenticado(AuthenticationException ex, HttpServletRequest req) {
        return responder(HttpStatus.UNAUTHORIZED, "Credenciales inválidas o sesión vencida", req);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorApi> manejarAccesoDenegado(AccessDeniedException ex, HttpServletRequest req) {
        return responder(HttpStatus.FORBIDDEN, "No tiene permiso para realizar esta acción", req);
    }

    // ---------- Rutas y métodos ----------

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorApi> manejarRutaInexistente(NoResourceFoundException ex, HttpServletRequest req) {
        return responder(HttpStatus.NOT_FOUND, "La ruta solicitada no existe", req);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorApi> manejarMetodoNoSoportado(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return responder(HttpStatus.METHOD_NOT_ALLOWED,
                "El método " + ex.getMethod() + " no está permitido en esta ruta", req);
    }

    // ---------- Cualquier otro error ----------

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorApi> manejarInesperado(Exception ex, HttpServletRequest req) {
        log.error("Error inesperado en {} {}", req.getMethod(), req.getRequestURI(), ex);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado en el servidor", req);
    }

    private ResponseEntity<ErrorApi> responder(HttpStatus estado, String mensaje, HttpServletRequest req) {
        return ResponseEntity.status(estado).body(ErrorApi.de(estado, mensaje, req.getRequestURI()));
    }
}
