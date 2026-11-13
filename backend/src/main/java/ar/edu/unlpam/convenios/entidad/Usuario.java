package ar.edu.unlpam.convenios.entidad;

import ar.edu.unlpam.convenios.entidad.enums.Rol;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Usuario del sistema. La unidad es null para Administración. */
@Entity
@Table(name = "usuario",
        uniqueConstraints = @UniqueConstraint(name = "uq_usuario_mail", columnNames = "mail"))
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nombre", nullable = false, length = 60)
    private String nombre;

    @Column(name = "apellido", nullable = false, length = 60)
    private String apellido;

    @Column(name = "mail", nullable = false, length = 120)
    private String mail;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 20)
    private Rol rol;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidad_id")
    private Unidad unidad;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}
