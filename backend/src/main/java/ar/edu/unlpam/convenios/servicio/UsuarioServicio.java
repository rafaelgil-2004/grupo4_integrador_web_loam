package ar.edu.unlpam.convenios.servicio;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ar.edu.unlpam.convenios.dto.UsuarioRespuesta;
import ar.edu.unlpam.convenios.dto.UsuarioSolicitud;
import ar.edu.unlpam.convenios.entidad.Unidad;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.excepcion.ConflictoException;
import ar.edu.unlpam.convenios.excepcion.NoAutenticadoException;
import ar.edu.unlpam.convenios.excepcion.NoEncontradoException;
import ar.edu.unlpam.convenios.excepcion.SolicitudInvalidaException;
import ar.edu.unlpam.convenios.repositorio.UnidadRepositorio;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor
public class UsuarioServicio {

    private static final int MIN_PASSWORD = 8;

    private final UsuarioRepositorio usuarioRepo;
    private final UnidadRepositorio unidadRepo;
    private final PasswordEncoder codificador;

    public static boolean esDeConsulta(Rol rol) {
        return rol != Rol.ADMINISTRACION && rol != Rol.GESTION;
    }

    // Usuario completo (entidad) del token. Lo usan Documento y Observación
    public Usuario actual() {
        return usuarioRepo.findById(UsuarioAutenticado.actual().id())
            .orElseThrow(() -> new NoAutenticadoException("Usuario inexistente"));
    }

    @Transactional(readOnly = true)
    public List<UsuarioRespuesta> listar(String q, Rol rol) {
        List<Usuario> lista = (q == null || q.isBlank())
            ? usuarioRepo.findAll() : usuarioRepo.buscarPorTexto(q.trim());
        // Gestión solo necesita elegir firmantes: usuarios activos de consulta
        if (UsuarioAutenticado.actual().rol() == Rol.GESTION) {
            lista = lista.stream().filter(u -> u.getActivo() && esDeConsulta(u.getRol())).toList();
        }
        return lista.stream()
            .filter(u -> rol == null || u.getRol() == rol)
            .map(UsuarioRespuesta::desde)
            .toList();
    }

    public UsuarioRespuesta crear(UsuarioSolicitud s) {
        String mail = s.mail().trim().toLowerCase();
        if (usuarioRepo.existsByMail(mail))
            throw new ConflictoException("MAIL_DUPLICADO", "Ya existe un usuario con ese mail");
        if (s.password() == null || s.password().isBlank())
            throw new SolicitudInvalidaException("La contraseña es obligatoria");
        validarPassword(s.password());
        Usuario u = new Usuario();
        aplicar(u, s);
        u.setMail(mail);
        u.setPasswordHash(codificador.encode(s.password()));
        u.setActivo(true);
        return UsuarioRespuesta.desde(usuarioRepo.save(u));
    }

    public UsuarioRespuesta editar(Long id, UsuarioSolicitud s) {
        Usuario u = buscar(id);
        String mail = s.mail().trim().toLowerCase();
        if (!mail.equals(u.getMail()) && usuarioRepo.existsByMail(mail))
            throw new ConflictoException("MAIL_DUPLICADO", "Ya existe un usuario con ese mail");
        aplicar(u, s);
        u.setMail(mail);
        // Contraseña vacía al editar = no cambiarla
        if (s.password() != null && !s.password().isBlank()) {
            validarPassword(s.password());
            u.setPasswordHash(codificador.encode(s.password()));
        }
        return UsuarioRespuesta.desde(usuarioRepo.save(u));
    }

    /** activo == null invierte el estado actual; true/false lo fija. */
    public UsuarioRespuesta cambiarActivo(Long id, Boolean activo) {
        Usuario u = buscar(id);
        boolean nuevo = activo != null ? activo : !u.getActivo();
        if (!nuevo && id.equals(UsuarioAutenticado.actual().id()))
            throw new SolicitudInvalidaException("No puede desactivarse a sí mismo");
        u.setActivo(nuevo);
        return UsuarioRespuesta.desde(usuarioRepo.save(u));
    }

    private Usuario buscar(Long id) {
        return usuarioRepo.findById(id)
            .orElseThrow(() -> new NoEncontradoException("Usuario no encontrado"));
    }

    private void aplicar(Usuario u, UsuarioSolicitud s) {
        if (s.rol() == Rol.GESTION && s.unidadId() == null)
            throw new SolicitudInvalidaException("Un usuario de Gestión necesita unidad");
        u.setNombre(s.nombre().trim());
        u.setApellido(s.apellido().trim());
        u.setRol(s.rol());
        // Administración nunca lleva unidad
        Unidad unidad = (s.rol() == Rol.ADMINISTRACION || s.unidadId() == null) ? null
            : unidadRepo.findById(s.unidadId())
                .orElseThrow(() -> new SolicitudInvalidaException("La unidad no existe"));
        u.setUnidad(unidad);
    }

    private void validarPassword(String password) {
        if (password.length() < MIN_PASSWORD)
            throw new SolicitudInvalidaException(
                "La contraseña debe tener al menos " + MIN_PASSWORD + " caracteres");
    }
}