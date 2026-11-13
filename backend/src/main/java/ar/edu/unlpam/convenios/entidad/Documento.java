package ar.edu.unlpam.convenios.entidad;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** PDF anexado a un convenio. El sha256 lo calcula la API al subir el archivo. */
@Entity
@Table(name = "documento")
@Getter
@Setter
@NoArgsConstructor
public class Documento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convenio_id", nullable = false)
    private Convenio convenio;

    @Column(name = "nombre", nullable = false, length = 150)
    private String nombre;

    @Column(name = "ruta_archivo", nullable = false, length = 255)
    private String rutaArchivo;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subido_por_id", nullable = false)
    private Usuario subidoPor;

    @Column(name = "fecha_carga", nullable = false, updatable = false)
    private LocalDateTime fechaCarga;

    @PrePersist
    void alCrear() {
        if (fechaCarga == null) {
            fechaCarga = LocalDateTime.now();
        }
    }
}
