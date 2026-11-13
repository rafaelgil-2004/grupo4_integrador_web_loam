package ar.edu.unlpam.convenios.servicio;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import ar.edu.unlpam.convenios.dto.UsuarioSolicitud;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.excepcion.ConflictoException;
import ar.edu.unlpam.convenios.excepcion.NoAutenticadoException;
import ar.edu.unlpam.convenios.excepcion.NoEncontradoException;
import ar.edu.unlpam.convenios.excepcion.SolicitudInvalidaException;
import ar.edu.unlpam.convenios.repositorio.UnidadRepositorio;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor 
public class UsuarioServicio {

    private UsuarioRepositorio usuarioRepo;
    private UnidadRepositorio unidadRepo;
    private PasswordEncoder codificador;

    public static boolean esDeConsulta(Rol rol) {
        return rol != Rol.ADMINISTRACION && rol != Rol.GESTION;
    }

    // Usuario completo (entidad) del token. Lo usan Documento y Observación
    public Usuario actual() {
        return usuarioRepo.findById(UsuarioAutenticado.actual().id())
            .orElseThrow(() -> new NoAutenticadoException("Usuario inexistente"));
    }

    public List<Usuario> listar(String q, Rol rol) {
        List<Usuario> lista = (q == null || q.isBlank())
            ? usuarioRepo.findAll() : usuarioRepo.buscarPorTexto(q.trim());
        // Gestión solo necesita elegir firmantes: usuarios activos de consulta
        if (UsuarioAutenticado.actual().rol() == Rol.GESTION) {
            lista = lista.stream().filter(u -> u.getActivo() && esDeConsulta(u.getRol())).toList();
        }
        return lista.stream().filter(u -> rol == null || u.getRol() == rol).toList();
    }

    public Usuario crear(UsuarioSolicitud s) {
        String mail = s.mail().trim().toLowerCase();
        if (usuarioRepo.existsByMail(mail))
            throw new ConflictoException("MAIL_DUPLICADO", "Ya existe un usuario con ese mail");
        if (s.password() == null || s.password().isBlank())
            throw new SolicitudInvalidaException("La contraseña es obligatoria");
        Usuario u = new Usuario();
        aplicar(u, s);
        u.setMail(mail);
        u.setPasswordHash(codificador.encode(s.password()));
        u.setActivo(true);
        return usuarioRepo.save(u);
    }

    public Usuario editar(Long id, UsuarioSolicitud s) {
        Usuario u = usuarioRepo.findById(id)
            .orElseThrow(() -> new NoEncontradoException("Usuario no encontrado"));
        String mail = s.mail().trim().toLowerCase();
        if (!mail.equals(u.getMail()) && usuarioRepo.existsByMail(mail))
            throw new ConflictoException("MAIL_DUPLICADO", "Ya existe un usuario con ese mail");
        aplicar(u, s);
        u.setMail(mail);
        // Contraseña vacía al editar = no cambiarla
        if (s.password() != null && !s.password().isBlank())
            u.setPasswordHash(codificador.encode(s.password()));
        return usuarioRepo.save(u);
    }

    public Usuario cambiarActivo(Long id, boolean activo) {
        if (!activo && id.equals(UsuarioAutenticado.actual().id()))
            throw new SolicitudInvalidaException("No puede desactivarse a sí mismo");
        Usuario u = usuarioRepo.findById(id)
            .orElseThrow(() -> new NoEncontradoException("Usuario no encontrado"));
        u.setActivo(activo);
        return usuarioRepo.save(u);
    }

    private void aplicar(Usuario u, UsuarioSolicitud s) {
        if (s.rol() == Rol.GESTION && s.unidadId() == null)
            throw new SolicitudInvalidaException("Un usuario de Gestión necesita unidad");
        u.setNombre(s.nombre().trim());
        u.setApellido(s.apellido().trim());
        u.setRol(s.rol());
        u.setUnidad(s.unidadId() == null ? null : unidadRepo.findById(s.unidadId())
            .orElseThrow(() -> new SolicitudInvalidaException("La unidad no existe")));
    }
}