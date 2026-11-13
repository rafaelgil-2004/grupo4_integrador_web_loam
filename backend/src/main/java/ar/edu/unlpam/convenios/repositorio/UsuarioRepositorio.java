package ar.edu.unlpam.convenios.repositorio;

import ar.edu.unlpam.convenios.entidad.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {
}
 