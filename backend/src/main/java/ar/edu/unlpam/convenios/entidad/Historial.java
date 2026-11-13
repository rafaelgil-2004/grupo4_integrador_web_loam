package ar.edu.unlpam.convenios.entidad;

import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Registro de cada acción sobre un convenio.
 * En una rescisión, el motivo guarda el fundamento.
 */
@Entity
@Table(name = "historial",
        indexes = @Index(name = "idx_historial_fecha", columnList = "fecha_hora"))
@Getter
@Setter
@NoArgsConstructor
public class Historial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convenio_id", nullable = false)
    private Convenio convenio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "accion", nullable = false, length = 25)
    private String accion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", length = 15)
    private EstadoConvenio estadoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", length = 15)
    private EstadoConvenio estadoNuevo;

    @Column(name = "motivo", length = 255)
    private String motivo;

    @Column(name = "fecha_hora", nullable = false, updatable = false)
    private LocalDateTime fechaHora;

    @PrePersist
    void alCrear() {
        if (fechaHora == null) {
            fechaHora = LocalDateTime.now();
        }
    }
}
