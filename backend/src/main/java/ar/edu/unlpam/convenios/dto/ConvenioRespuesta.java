package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.ConvenioImplicado;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
    private UnidadRespuesta unidad;   
    private String organizacion;
    private String objeto;
    private String resolucion;
    private String expediente;
    private LocalDate fechaInicio;
    private LocalDate fechaVencimiento;
    private LocalDateTime fechaFirma;
    private Long convenioPadreId;
    private String vigencia;
    private Integer revision;
    private Long creadoPorId;
    private String creadoPorNombre;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
    private List<FirmaRespuesta> listaImplicados; 

    // Hace de "mapeador": arma la respuesta a partir de la entidad
    public static ConvenioRespuesta desde(Convenio c, String vigencia, List<ConvenioImplicado> implicados) {
        Convenio padre = c.getConvenioPadre();
        UnidadRespuesta unidadResp = new UnidadRespuesta(c.getUnidad().getId(), c.getUnidad().getNombre());
        List<FirmaRespuesta> firmas = implicados.stream().map(i -> new FirmaRespuesta(
        i.getId(), c.getId(), i.getUsuario().getId(),
        i.getUsuario().getNombre() + " " + i.getUsuario().getApellido(),
        i.getFirmado(), i.getFechaFirma(), i.getLatitud(), i.getLongitud())).toList();

        return new ConvenioRespuesta(c.getId(),c.getCodigo(),c.getTitulo(),c.getTipo(),c.getSubtipo(),c.getEstado(),unidadResp,
                    c.getOrganizacion(),c.getObjeto(),c.getResolucion(),c.getExpediente(),c.getFechaInicio(),c.getFechaVencimiento(),
                    c.getFechaFirma(),
                    padre != null ? padre.getId() : null,vigencia,
                    c.getRevision(),c.getCreadoPor().getId(),c.getCreadoPor().getNombre(),
                    c.getFechaCreacion(),c.getFechaActualizacion(), firmas
                );
    }
}