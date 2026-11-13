package ar.edu.unlpam.convenios.entidad;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Usuario que debe firmar un convenio, junto con los datos de su firma.
 * Latitud, longitud y firmaRuta solo se completan si firmó desde la app.
 */
@Entity
@Table(name = "convenio_implicado",
        uniqueConstraints = @UniqueConstraint(name = "uq_implicado",
                columnNames = {"convenio_id", "usuario_id"}))
@Getter
@Setter
@NoArgsConstructor
public class ConvenioImplicado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "convenio_id", nullable = false)
    private Convenio convenio;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "firmado", nullable = false)
    private Boolean firmado = false;

    @Column(name = "fecha_firma")
    private LocalDateTime fechaFirma;

    @Column(name = "latitud")
    private Double latitud;

    @Column(name = "longitud")
    private Double longitud;

    @Column(name = "firma_ruta", length = 255)
    private String firmaRuta;
}
