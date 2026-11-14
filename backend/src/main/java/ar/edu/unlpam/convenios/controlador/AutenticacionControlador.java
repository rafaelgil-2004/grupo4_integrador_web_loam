package ar.edu.unlpam.convenios.controlador;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ar.edu.unlpam.convenios.dto.LoginRespuesta;
import ar.edu.unlpam.convenios.dto.LoginSolicitud;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.servicio.AutenticacionServicio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Tag(name = "autenticacion")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AutenticacionControlador {

    private final AutenticacionServicio servicio;

    @Operation(
        summary = "Iniciar sesión",
        description = "Valida mail y contraseña y devuelve un token JWT junto con los datos del usuario. El token se envía en las demás peticiones como Authorization: Bearer <token> y dura 72 horas. Si el mail no existe, la contraseña es incorrecta o el usuario está inactivo, responde 401 con el mismo mensaje. Es la única ruta pública")
    // Ruta pública (permitAll en ConfiguracionSeguridad)
    @PostMapping("/login")
    public LoginRespuesta login(@Valid @RequestBody LoginSolicitud solicitud) {
        return servicio.login(solicitud);
    }

    @Operation(
      summary = "Datos del usuario logueado",
      description = "Devuelve los datos del usuario dueño del token (nombre, mail, rol y unidad). La app lo usa para restaurar la sesión. Responde 401 si el usuario fue desactivado")
    // Devuelve el usuario del token; la app lo usa para validar la sesión guardada
    @GetMapping("/datosUsuario")
    public Usuario datosUsuario() {
        return servicio.datosUsuario();
    }
}