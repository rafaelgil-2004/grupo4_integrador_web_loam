package ar.edu.unlpam.convenios.repositorio;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ar.edu.unlpam.convenios.entidad.Convenio;

public interface ConvenioRepositorio extends JpaRepository<Convenio, Long> {

    // Convenios visibles para un usuario de Gestión
    List<Convenio> findByUnidadId(Long unidadId);

    // Generar el código: cuántos hay con prefijo "MCO-2026-" para sacar el número siguiente
    long countByCodigoStartingWith(String prefijo);

    // Impedir eliminar o archivar un convenio que tiene hijos
    boolean existsByConvenioPadreId(Long padreId);

    boolean existsByCodigo(String codigo);
}