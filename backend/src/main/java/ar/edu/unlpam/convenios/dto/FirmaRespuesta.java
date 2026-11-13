package ar.edu.unlpam.convenios.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FirmaRespuesta {
    private Long id;
    private Long convenioId;
    private Long usuarioId;
    private String usuarioNombre;
    private boolean firmado;
    private LocalDateTime fechaFirma;
    private Double latitud;
    private Double longitud;
}
