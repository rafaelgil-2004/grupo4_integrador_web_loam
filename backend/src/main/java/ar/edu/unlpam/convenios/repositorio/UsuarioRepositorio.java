package ar.edu.unlpam.convenios.repositorio;

import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepositorio extends JpaRepository<Usuario, Long> {

    // Login: busca por mail
    Optional<Usuario> findByMail(String mail);

    // Validar mail único al dar de alta
    boolean existsByMail(String mail);

    List<Usuario> findByRol(Rol rol);

    // @Query: búsqueda por texto en tres campos, sin distinguir mayúsculas.
    // Con q vacío ("") el LIKE '%%' devuelve todos.
    @Query("SELECT u FROM Usuario u WHERE "
         + "LOWER(u.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR "
         + "LOWER(u.apellido) LIKE LOWER(CONCAT('%', :q, '%')) OR "
         + "LOWER(u.mail) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Usuario> buscarPorTexto(@Param("q") String q);
}
 