package ar.edu.unlpam.convenios.repositorio;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import ar.edu.unlpam.convenios.entidad.ConvenioImplicado;

public interface ConvenioImplicadoRepositorio extends JpaRepository<ConvenioImplicado, Long> {

    @EntityGraph(attributePaths = "usuario")
    List<ConvenioImplicado> findByConvenioId(Long convenioId);

    // Convenios donde participa un usuario (visibilidad de Consulta)
    List<ConvenioImplicado> findByUsuarioId(Long usuarioId);

    // ¿Este usuario es implicado de este convenio? (para firmar)
    Optional<ConvenioImplicado> findByConvenioIdAndUsuarioId(Long convenioId, Long usuarioId);

    // "Mis pendientes"
    List<ConvenioImplicado> findByUsuarioIdAndFirmadoFalse(Long usuarioId);

    // Al editar un convenio se reemplaza la lista de implicados.
    // Los métodos deleteBy necesitan @Transactional en el servicio que los llame.
    void deleteByConvenioId(Long convenioId);
}