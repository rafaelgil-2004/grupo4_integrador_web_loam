package ar.edu.unlpam.convenios.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ar.edu.unlpam.convenios.entidad.Observacion;

public interface ObservacionRepositorio extends JpaRepository<Observacion, Long> {

    List<Observacion> findByConvenioIdOrderByFechaHoraDesc(Long convenioId);
}