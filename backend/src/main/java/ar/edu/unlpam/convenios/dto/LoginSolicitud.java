package ar.edu.unlpam.convenios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginSolicitud(
        @NotBlank @Email String mail,
        @NotBlank String password) {
}