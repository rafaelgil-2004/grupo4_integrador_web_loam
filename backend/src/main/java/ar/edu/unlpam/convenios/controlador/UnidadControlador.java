package ar.edu.unlpam.convenios.controlador;

import ar.edu.unlpam.convenios.entidad.Unidad;
import ar.edu.unlpam.convenios.repositorio.UnidadRepositorio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Unidad")
@RestController
@RequestMapping("/unidades")
@RequiredArgsConstructor
public class UnidadControlador {

    private final UnidadRepositorio repo;


    @Operation (
        summary = "Listar unidades",
        description = "Devuelve las facultades y dependencias de la UNLPam. Se usa para elegir la unidad responsable de un convenio o de un usuario de Gestión"
    )
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACION','GESTION')")
    public List<Unidad> listar() {
        return repo.findAll(Sort.by("nombre"));
    }
}