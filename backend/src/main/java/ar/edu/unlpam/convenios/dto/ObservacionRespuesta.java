package ar.edu.unlpam.convenios.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ObservacionRespuesta{

    private Long id;
    private Long convenioId;
    private Long usuarioId;
    private String usuarioNombre;
    private String texto;
    private Boolean ofensivo;
    private LocalDateTime fechaHora;
}
