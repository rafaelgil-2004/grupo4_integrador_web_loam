package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ConvenioSolicitud{

    @NotBlank
    @Size(max = 200)
    private String titulo;

    @NotNull
    private TipoConvenio tipo;

    @NotNull
    private Subtipo subtipo;

    @NotNull
    private Long unidadId;

    // En BORRADOR pueden faltar; el service los exige al aceptar
    @Size(max = 150)
    private String organizacion;

    @Size(max = 1000)
    private String objeto;

    @Size(max = 100)
    private String resolucion;

    @Size(max = 100)
    private String expediente;

    private LocalDate fechaInicio;
    private LocalDate fechaVencimiento;

    /** Marco (o convenio que se modifica). Null si el convenio es un marco. */
    private Long convenioPadreId;

    List<Long> implicadosIds;
    
    Integer revision;

    String motivo;

    @AssertTrue(message = "La fecha de vencimiento no puede ser anterior a la de inicio")
    private boolean isFechasValidas() {
        return fechaInicio == null || fechaVencimiento == null
                || !fechaVencimiento.isBefore(fechaInicio);
    }
}