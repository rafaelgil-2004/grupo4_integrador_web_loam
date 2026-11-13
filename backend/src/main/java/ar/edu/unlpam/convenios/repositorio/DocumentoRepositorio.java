package ar.edu.unlpam.convenios.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ar.edu.unlpam.convenios.entidad.Documento;

public interface DocumentoRepositorio extends JpaRepository<Documento, Long> {

    List<Documento> findByConvenioId(Long convenioId);

    // Regla para aceptar: el convenio debe tener al menos un PDF
    boolean existsByConvenioId(Long convenioId);
}