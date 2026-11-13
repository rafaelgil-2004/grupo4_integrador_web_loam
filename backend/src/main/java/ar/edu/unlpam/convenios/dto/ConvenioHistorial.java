package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConvenioHistorial{

    private Long id;
    private String accion;
    private EstadoConvenio estadoAnterior;
    private EstadoConvenio estadoNuevo;
    private String motivo;
    private Long usuarioId;
    private String usuarioNombre;
    private LocalDateTime fechaHora;
}
