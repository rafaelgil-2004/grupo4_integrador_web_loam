package ar.edu.unlpam.convenios.servicio;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import ar.edu.unlpam.convenios.dto.LoginRespuesta;
import ar.edu.unlpam.convenios.dto.LoginSolicitud;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.excepcion.NoAutenticadoException;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;
import ar.edu.unlpam.convenios.seguridad.JwtServicio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor 
public class AutenticacionServicio {

    private UsuarioRepositorio usuarioRepo;
    private PasswordEncoder codificador;
    private JwtServicio jwtServicio;

    public LoginRespuesta login(LoginSolicitud s) {
        // Mismo mensaje para mail inexistente, clave mala o usuario inactivo
        Usuario usuario = usuarioRepo.findByMail(s.mail().trim().toLowerCase())
            .filter(u -> u.getActivo())
            .filter(u -> codificador.matches(s.password(), u.getPasswordHash()))
            .orElseThrow(() -> new NoAutenticadoException("Credenciales inválidas"));
        return new LoginRespuesta(jwtServicio.generarToken(usuario), usuario);
    }

    // GET /auth/datosUsuario
    public Usuario datosUsuario() {
        return usuarioRepo.findById(UsuarioAutenticado.actual().id())
            .filter(u -> u.getActivo())
            .orElseThrow(() -> new NoAutenticadoException("Usuario inactivo o inexistente"));
    }
}