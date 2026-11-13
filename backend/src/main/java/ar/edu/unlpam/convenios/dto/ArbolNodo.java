package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ArbolNodo{

    private Long id;
    private String codigo;
    private String titulo;
    private TipoConvenio tipo;
    private Subtipo subtipo;
    private EstadoConvenio estado;
    private String unidadNombre;
    private LocalDate fechaVencimiento;

    /** Convenios específicos y adendas que cuelgan de este. */
    private List<ArbolNodo> hijos = new ArrayList<>();
}