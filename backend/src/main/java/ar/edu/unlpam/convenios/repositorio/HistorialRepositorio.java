package ar.edu.unlpam.convenios.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ar.edu.unlpam.convenios.entidad.Historial;

public interface HistorialRepositorio extends JpaRepository<Historial, Long> {

    List<Historial> findByConvenioIdOrderByFechaHoraDesc(Long convenioId);

    // Para "últimos movimientos" del inicio
    List<Historial> findTop20ByOrderByFechaHoraDesc();
}