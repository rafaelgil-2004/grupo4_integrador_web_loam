package ar.edu.unlpam.convenios.servicio;

import ar.edu.unlpam.convenios.dto.UsuarioRespuesta;
import ar.edu.unlpam.convenios.dto.UsuarioSolicitud;
import ar.edu.unlpam.convenios.entidad.Unidad;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.excepcion.ConflictoException;
import ar.edu.unlpam.convenios.excepcion.NoEncontradoException;
import ar.edu.unlpam.convenios.excepcion.SolicitudInvalidaException;
import ar.edu.unlpam.convenios.repositorio.UnidadRepositorio;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UsuarioServicio {

    private static final int MIN_PASSWORD = 8;

    private final UsuarioRepositorio usuarioRepo;
    private final UnidadRepositorio unidadRepo;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UsuarioRespuesta> listar(String q, Rol rol) {
        String texto = q == null ? "" : q.trim();
        return usuarioRepo.buscarPorTexto(texto).stream()
                .filter(u -> rol == null || u.getRol() == rol)
                .map(UsuarioRespuesta::desde)
                .toList();
    }

    @Transactional
    public UsuarioRespuesta crear(UsuarioSolicitud s) {
        String mail = s.mail().trim().toLowerCase();
        if (usuarioRepo.existsByMail(mail)) {
            throw new ConflictoException("Ya existe un usuario con el mail " + mail);
        }
        if (s.password() == null || s.password().isBlank()) {
            throw new SolicitudInvalidaException("La contraseña es obligatoria al crear un usuario");
        }
        validarPassword(s.password());

        Usuario u = new Usuario();
        aplicar(u, s, mail);
        u.setPasswordHash(passwordEncoder.encode(s.password()));
        return UsuarioRespuesta.desde(usuarioRepo.save(u));
    }

    @Transactional
    public UsuarioRespuesta editar(Long id, UsuarioSolicitud s) {
        Usuario u = buscar(id);
        String mail = s.mail().trim().toLowerCase();
        usuarioRepo.findByMail(mail)
                .filter(otro -> !otro.getId().equals(id))
                .ifPresent(otro -> {
                    throw new ConflictoException("Ya existe un usuario con el mail " + mail);
                });

        aplicar(u, s, mail);
        if (s.password() != null && !s.password().isBlank()) {
            validarPassword(s.password());
            u.setPasswordHash(passwordEncoder.encode(s.password()));
        }
        return UsuarioRespuesta.desde(usuarioRepo.save(u));
    }

       /** Invierte el estado activo/inactivo. Nadie puede desactivarse a sí mismo. */
    @Transactional
    public UsuarioRespuesta cambiarActivo(Long id) {
        Usuario u = buscar(id);
        if (u.getActivo() && UsuarioAutenticado.actual().id().equals(id)) {
            throw new SolicitudInvalidaException("No puede desactivar su propio usuario");
        }
        u.setActivo(!u.getActivo());
        return UsuarioRespuesta.desde(usuarioRepo.save(u));
    }

    private Usuario buscar(Long id) {
        return usuarioRepo.findById(id).orElseThrow(() -> new NoEncontradoException("Usuario", id));
    }

    private void aplicar(Usuario u, UsuarioSolicitud s, String mail) {
        u.setNombre(s.nombre().trim());
        u.setApellido(s.apellido().trim());
        u.setMail(mail);
        u.setRol(s.rol());
        u.setUnidad(resolverUnidad(s.rol(), s.unidadId()));
    }

    private Unidad resolverUnidad(Rol rol, Long unidadId) {
        if (rol == Rol.ADMINISTRACION) {
            return null;
        }
        if (unidadId == null) {
            if (rol == Rol.GESTION) {
                throw new SolicitudInvalidaException("El rol GESTION exige una unidad");
            }
            return null;
        }
        return unidadRepo.findById(unidadId)
                .orElseThrow(() -> new NoEncontradoException("Unidad", unidadId));
    }

    private void validarPassword(String password) {
        if (password.length() < MIN_PASSWORD) {
            throw new SolicitudInvalidaException(
                    "La contraseña debe tener al menos " + MIN_PASSWORD + " caracteres");
        }
    }
}