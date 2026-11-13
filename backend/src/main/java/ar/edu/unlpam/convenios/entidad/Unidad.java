package ar.edu.unlpam.convenios.entidad;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Facultad o dependencia de la UNLPam. */
@Entity
@Table(name = "unidad",
        uniqueConstraints = @UniqueConstraint(name = "uq_unidad_nombre", columnNames = "nombre"))
@Getter
@Setter
@NoArgsConstructor
public class Unidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;
}
