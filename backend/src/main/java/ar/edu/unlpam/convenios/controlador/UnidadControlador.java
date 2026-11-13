package ar.edu.unlpam.convenios.controlador;

import ar.edu.unlpam.convenios.entidad.Unidad;
import ar.edu.unlpam.convenios.repositorio.UnidadRepositorio;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/unidades")
@RequiredArgsConstructor
public class UnidadControlador {

    private final UnidadRepositorio repo;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRACION','GESTION')")
    public List<Unidad> listar() {
        return repo.findAll(Sort.by("nombre"));
    }
}