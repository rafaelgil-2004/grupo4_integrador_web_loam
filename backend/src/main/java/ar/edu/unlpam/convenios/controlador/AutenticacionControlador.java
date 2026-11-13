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
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AutenticacionControlador {

    private final AutenticacionServicio servicio;

    // Ruta pública (permitAll en ConfiguracionSeguridad)
    @PostMapping("/login")
    public LoginRespuesta login(@Valid @RequestBody LoginSolicitud solicitud) {
        return servicio.login(solicitud);
    }

    // Devuelve el usuario del token; la app lo usa para validar la sesión guardada
    @GetMapping("/datosUsuario")
    public Usuario datosUsuario() {
        return servicio.datosUsuario();
    }
}