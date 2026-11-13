package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.Usuario;

public record LoginRespuesta(String token, Usuario usuario) {
}