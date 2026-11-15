package ar.edu.unlpam.convenios.dto;

import java.time.LocalDateTime;

import ar.edu.unlpam.convenios.entidad.Documento;

public record DocumentoRespuesta(Long id, Long convenioId, String nombre, String sha256,
    String subidoPorNombre, LocalDateTime fechaCarga) {
    
    public static DocumentoRespuesta desde(Documento d) {
        return new DocumentoRespuesta(d.getId(), d.getConvenio().getId(), d.getNombre(), d.getSha256(),
            d.getSubidoPor().getNombre() + " " + d.getSubidoPor().getApellido(), d.getFechaCarga());
    }
}