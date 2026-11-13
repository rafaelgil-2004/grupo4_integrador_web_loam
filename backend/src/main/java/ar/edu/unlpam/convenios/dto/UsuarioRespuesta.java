package ar.edu.unlpam.convenios.dto;

import ar.edu.unlpam.convenios.entidad.Unidad;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioRespuesta {

    private Long id;
    private String nombre;
    private String apellido;
    private String mail;
    private Rol rol;
    private Long unidadId;
    private String unidadNombre;   // null para Administración
    private Boolean activo;

    public static UsuarioRespuesta desde(Usuario u) {
        Unidad un = u.getUnidad();
        return new UsuarioRespuesta(u.getId(), u.getNombre(), u.getApellido(), u.getMail(),
                u.getRol(), un == null ? null : un.getId(), un == null ? null : un.getNombre(),
                u.getActivo());
    }
}