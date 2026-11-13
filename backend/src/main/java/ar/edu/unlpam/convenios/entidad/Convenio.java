package ar.edu.unlpam.convenios.entidad;

import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.entidad.enums.Subtipo;
import ar.edu.unlpam.convenios.entidad.enums.TipoConvenio;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Convenio marco, específico o adenda.
 * Los específicos y las adendas apuntan a su convenio padre; los marcos lo tienen en null.
 * En BORRADOR pueden faltar varios campos; la API los exige al aceptar.
 */
@Entity
@Table(name = "convenio",
        uniqueConstraints = @UniqueConstraint(name = "uq_convenio_codigo", columnNames = "codigo"),
        indexes = @Index(name = "idx_convenio_estado", columnList = "estado"))
@Getter
@Setter
@NoArgsConstructor
public class Convenio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codigo", nullable = false, length = 20)
    private String codigo;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 15)
    private TipoConvenio tipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "subtipo", nullable = false, length = 20)
    private Subtipo subtipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 15)
    private EstadoConvenio estado = EstadoConvenio.BORRADOR;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "unidad_id", nullable = false)
    private Unidad unidad;

    @Column(name = "organizacion", length = 150)
    private String organizacion;

    @Column(name = "objeto", length = 1000)
    private String objeto;

    @Column(name = "resolucion", length = 100)
    private String resolucion;

    @Column(name = "expediente", length = 100)
    private String expediente;

    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Column(name = "fecha_vencimiento")
    private LocalDate fechaVencimiento;

    @Column(name = "fecha_firma")
    private LocalDateTime fechaFirma;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convenio_padre_id")
    private Convenio convenioPadre;

    /** Control de concurrencia optimista. */
    @Version
    @Column(name = "revision", nullable = false)
    private Integer revision;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "creado_por_id", nullable = false, updatable = false)
    private Usuario creadoPor;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Column(name = "fecha_actualizacion", nullable = false)
    private LocalDateTime fechaActualizacion;

    @PrePersist
    void alCrear() {
        LocalDateTime ahora = LocalDateTime.now();
        fechaCreacion = ahora;
        fechaActualizacion = ahora;
    }

    @PreUpdate
    void alActualizar() {
        fechaActualizacion = LocalDateTime.now();
    }
}
