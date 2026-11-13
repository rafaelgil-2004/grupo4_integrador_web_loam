package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.Rol;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UsuarioSolicitud(@NotBlank String nombre, @NotBlank String apellido,
        @NotBlank @Email String mail, String password, @NotNull Rol rol, Long unidadId) {}
