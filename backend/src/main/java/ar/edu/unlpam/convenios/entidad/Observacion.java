package ar.edu.unlpam.convenios.entidad;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Comentario de un usuario sobre un convenio.
 * Si el texto es ofensivo, la API guarda "comentario ofensivo" y marca ofensivo = true.
 */
@Entity
@Table(name = "observacion")
@Getter
@Setter
@NoArgsConstructor
public class Observacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convenio_id", nullable = false)
    private Convenio convenio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "texto", nullable = false, length = 1000)
    private String texto;

    @Column(name = "ofensivo", nullable = false)
    private Boolean ofensivo = false;

    @Column(name = "fecha_hora", nullable = false, updatable = false)
    private LocalDateTime fechaHora;

    @PrePersist
    void alCrear() {
        if (fechaHora == null) {
            fechaHora = LocalDateTime.now();
        }
    }
}
