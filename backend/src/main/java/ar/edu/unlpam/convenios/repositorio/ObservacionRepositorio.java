package ar.edu.unlpam.convenios.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import ar.edu.unlpam.convenios.entidad.Observacion;

public interface ObservacionRepositorio extends JpaRepository<Observacion, Long> {

    @EntityGraph(attributePaths = "usuario")
    List<Observacion> findByConvenioIdOrderByFechaHoraDesc(Long convenioId);
}