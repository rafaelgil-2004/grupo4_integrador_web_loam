package ar.edu.unlpam.convenios.seguridad;

import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Objects;

/**
 * Datos del usuario que hizo la petición, sacados del token JWT.
 * Es el "principal" que queda en el SecurityContext.
 *
 * En un controlador se obtiene con {@code @AuthenticationPrincipal UsuarioAutenticado usuario};
 * en un servicio, con {@link #actual()}.
 *
 * @param unidadId null para Administración
 */
public record UsuarioAutenticado(Long id, String mail, Rol rol, Long unidadId) {

    /** Arma el usuario autenticado a partir de la entidad (se usa al hacer login). */
    public static UsuarioAutenticado desde(Usuario usuario) {
        Long unidadId = usuario.getUnidad() != null ? usuario.getUnidad().getId() : null;
        return new UsuarioAutenticado(usuario.getId(), usuario.getMail(), usuario.getRol(), unidadId);
    }

    /**
     * Devuelve el usuario de la petición actual.
     * Si no hay nadie autenticado lanza una excepción que se responde con 401.
     */
    public static UsuarioAutenticado actual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UsuarioAutenticado usuario) {
            return usuario;
        }
        throw new AuthenticationCredentialsNotFoundException("No hay un usuario autenticado");
    }

    /** Roles para Spring Security: permite usar hasRole("GESTION") o @PreAuthorize. */
    public List<GrantedAuthority> autoridades() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    public boolean tieneRol(Rol otro) {
        return rol == otro;
    }

    public boolean esAdministracion() {
        return rol == Rol.ADMINISTRACION;
    }

    /** True si el usuario pertenece a la unidad indicada. */
    public boolean perteneceAUnidad(Long otraUnidadId) {
        return unidadId != null && Objects.equals(unidadId, otraUnidadId);
    }
}
