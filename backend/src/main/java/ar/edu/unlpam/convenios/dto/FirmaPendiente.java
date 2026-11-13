package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FirmaPendiente{

    private Long convenioId;
    private String codigo;
    private String titulo;
    private String organizacion;
    private EstadoConvenio estado;
    private LocalDate fechaVencimiento;
}
