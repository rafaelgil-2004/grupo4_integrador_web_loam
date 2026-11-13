package ar.edu.unlpam.convenios.servicio;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;

@Service
public class AutenticacionServicio {

    @Autowired private UsuarioRepositorio usuarioRepo;
    @Autowired private PasswordEncoder codificador;
    @Autowired private JwtServicio jwtServicio;

    public LoginRespuesta login(LoginSolicitud s) {
        // Mismo mensaje para mail inexistente, clave mala o usuario inactivo
        Usuario usuario = usuarioRepo.findByMail(s.mail().trim().toLowerCase())
            .filter(Usuario::isActivo)
            .filter(u -> codificador.matches(s.password(), u.getPasswordHash()))
            .orElseThrow(() -> new NoAutenticadoException("Credenciales inválidas"));
        return new LoginRespuesta(jwtServicio.generar(usuario), usuario);
    }

    // GET /auth/datosUsuario
    public Usuario datosUsuario() {
        return usuarioRepo.findById(UsuarioAutenticado.actual().id())
            .filter(Usuario::isActivo)
            .orElseThrow(() -> new NoAutenticadoException("Usuario inactivo o inexistente"));
    }
}