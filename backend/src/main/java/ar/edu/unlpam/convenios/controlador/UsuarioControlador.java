package ar.edu.unlpam.convenios.controlador;

import ar.edu.unlpam.convenios.dto.UsuarioRespuesta;
import ar.edu.unlpam.convenios.dto.UsuarioSolicitud;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.servicio.UsuarioServicio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Usuarios")
@RestController
@RequestMapping("/usuarios")
@RequiredArgsConstructor
public class UsuarioControlador {

    private final UsuarioServicio servicio;

    @Operation(
      summary = "Listar usuarios",
      description = "Lista usuarios con filtro opcional de texto (q, busca en nombre, apellido y mail) y de rol. Administración ve todos. Gestión recibe solo los usuarios activos de consulta, que son los que pueden elegirse como firmantes. Consulta no tiene acceso")
    // Gestión también lo necesita, para elegir implicados
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACION','GESTION')")
    public List<UsuarioRespuesta> listar(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) Rol rol) {
        return servicio.listar(q, rol);
    }

    @Operation(
      summary = "Crear usuario",
      description = "Solo Administración. Da de alta un usuario con rol y contraseña inicial (se guarda encriptada y nunca se devuelve). El mail debe ser único y un usuario de Gestión requiere unidad. Responde 409 si el mail ya existe")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMINISTRACION')")
    public UsuarioRespuesta crear(@Valid @RequestBody UsuarioSolicitud solicitud) {
        return servicio.crear(solicitud);
    }

    @Operation(
      summary = "Editar usuario",
      description = "Solo Administración. Modifica nombre, apellido, mail, rol y unidad. Si la contraseña viene vacía, no se cambia. Responde 409 si el mail ya lo usa otra persona")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRACION')")
    public UsuarioRespuesta editar(@PathVariable Long id, @Valid @RequestBody UsuarioSolicitud solicitud) {
        return servicio.editar(id, solicitud);
    }

    @Operation (
        summary = "Activar o desactivar usuario",
        description = "Solo Administración. Baja lógica: un usuario desactivado no puede iniciar sesión pero conserva su historial, firmas y comentarios. Un administrador no puede desactivarse a sí mismo"
    )
    @PatchMapping("/{id}/activo")
    @PreAuthorize("hasRole('ADMINISTRACION')")
    public UsuarioRespuesta cambiarActivo(@PathVariable Long id,
                                          @RequestParam(required = false) Boolean activo) {
        return servicio.cambiarActivo(id, activo);
    }
}