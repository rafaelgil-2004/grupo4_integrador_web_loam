package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ConvenioRespuesta{

    private Long id;
    private String codigo;
    private String titulo;
    private TipoConvenio tipo;
    private Subtipo subtipo;
    private EstadoConvenio estado;
    private Long unidadId;
    private String unidadNombre;
    private String organizacion;
    private String objeto;
    private String resolucion;
    private String expediente;
    private LocalDate fechaInicio;
    private LocalDate fechaVencimiento;
    private LocalDateTime fechaFirma;
    private Long convenioPadreId;
    private Integer revision;
    private Long creadoPorId;
    private String creadoPorNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
}