package ar.edu.unlpam.convenios.controlador;

import ar.edu.unlpam.convenios.dto.UsuarioRespuesta;
import ar.edu.unlpam.convenios.dto.UsuarioSolicitud;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.servicio.UsuarioServicio;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/usuarios")
@RequiredArgsConstructor
public class UsuarioControlador {

    private final UsuarioServicio servicio;

    // Gestión también lo necesita, para elegir implicados
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACION','GESTION')")
    public List<UsuarioRespuesta> listar(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) Rol rol) {
        return servicio.listar(q, rol);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMINISTRACION')")
    public UsuarioRespuesta crear(@Valid @RequestBody UsuarioSolicitud solicitud) {
        return servicio.crear(solicitud);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRACION')")
    public UsuarioRespuesta editar(@PathVariable Long id, @Valid @RequestBody UsuarioSolicitud solicitud) {
        return servicio.editar(id, solicitud);
    }

    @PatchMapping("/{id}/activo")
    @PreAuthorize("hasRole('ADMINISTRACION')")
    public UsuarioRespuesta cambiarActivo(@PathVariable Long id) {
        return servicio.cambiarActivo(id);
    }
}