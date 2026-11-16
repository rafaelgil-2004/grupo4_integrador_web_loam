package ar.edu.unlpam.convenios.servicio;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ar.edu.unlpam.convenios.dto.LoginRespuesta;
import ar.edu.unlpam.convenios.dto.LoginSolicitud;
import ar.edu.unlpam.convenios.dto.UsuarioRespuesta;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.excepcion.NoAutenticadoException;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;
import ar.edu.unlpam.convenios.seguridad.JwtServicio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor 
public class AutenticacionServicio {

    private final UsuarioRepositorio usuarioRepo;
    private final  PasswordEncoder codificador;
    private final JwtServicio jwtServicio;

    @Transactional (readOnly = true)
    public LoginRespuesta login(LoginSolicitud s) {
        // Mismo mensaje para mail inexistente, clave mala o usuario inactivo
        Usuario usuario = usuarioRepo.findByMail(s.mail().trim().toLowerCase())
            .filter(u -> u.getActivo())
            .filter(u -> codificador.matches(s.password(), u.getPasswordHash()))
            .orElseThrow(() -> new NoAutenticadoException("Credenciales inválidas"));
        return new LoginRespuesta(jwtServicio.generarToken(usuario), UsuarioRespuesta.desde(usuario));
    }

    // GET /auth/datosUsuario
    @Transactional(readOnly = true)
    public UsuarioRespuesta datosUsuario() {          // <- ahora devuelve el DTO
        Usuario u = usuarioRepo.findById(UsuarioAutenticado.actual().id())
            .filter(x -> x.getActivo())
            .orElseThrow(() -> new NoAutenticadoException("Usuario inactivo o inexistente"));
        return UsuarioRespuesta.desde(u);
    }
}