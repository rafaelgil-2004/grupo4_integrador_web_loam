package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Sirve para crear (POST) y para editar (PUT).
 * La contraseña no lleva @NotBlank porque al editar es opcional:
 * si llega vacía o nula, se conserva la actual. Se valida en el servicio.
 */
public record UsuarioSolicitud(
        @NotBlank @Size(max = 60) String nombre,
        @NotBlank @Size(max = 60) String apellido,
        @NotBlank @Email @Size(max = 120) String mail,
        String password,
        @NotNull Rol rol,
        Long unidadId
) {
}