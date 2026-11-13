package ar.edu.unlpam.convenios.seguridad;

import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.Rol;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

/**
 * Genera y valida los tokens JWT (firmados con HMAC-SHA).
 *
 * Contenido del token:
 *   sub      = id del usuario
 *   mail     = mail del usuario
 *   rol      = ADMINISTRACION, GESTION, ...
 *   unidadId = id de la unidad (ausente para Administración)
 *
 * Configuración (application.properties o variables de entorno):
 *   jwt.secreto            obligatorio, al menos 32 caracteres (variable de entorno: JWT_SECRETO)
 *   jwt.expiracion-minutos opcional, por defecto 480 (8 horas)
 */
@Service
public class JwtServicio {

    private static final String CLAIM_MAIL = "mail";
    private static final String CLAIM_ROL = "rol";
    private static final String CLAIM_UNIDAD = "unidadId";

    private final SecretKey clave;
    private final Duration expiracion;

    public JwtServicio(@Value("${jwt.secreto}") String secreto,
                       @Value("${jwt.expiracion-minutos:480}") long expiracionMinutos) {
        byte[] bytes = secreto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("jwt.secreto debe tener al menos 32 caracteres (256 bits)");
        }
        this.clave = Keys.hmacShaKeyFor(bytes);
        this.expiracion = Duration.ofMinutes(expiracionMinutos);
    }

    public String generarToken(Usuario usuario) {
        return generarToken(UsuarioAutenticado.desde(usuario));
    }

    public String generarToken(UsuarioAutenticado usuario) {
        Instant ahora = Instant.now();
        var builder = Jwts.builder()
                .subject(String.valueOf(usuario.id()))
                .claim(CLAIM_MAIL, usuario.mail())
                .claim(CLAIM_ROL, usuario.rol().name())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(expiracion)));
        if (usuario.unidadId() != null) {
            builder.claim(CLAIM_UNIDAD, usuario.unidadId());
        }
        return builder.signWith(clave).compact();
    }

    /**
     * Valida firma y vencimiento del token.
     * Devuelve vacío si el token es inválido, está vencido o tiene datos incorrectos.
     */
    public Optional<UsuarioAutenticado> validar(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(clave)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            Long id = Long.valueOf(claims.getSubject());
            String mail = claims.get(CLAIM_MAIL, String.class);
            Rol rol = Rol.valueOf(claims.get(CLAIM_ROL, String.class));
            Number unidad = claims.get(CLAIM_UNIDAD, Number.class);
            Long unidadId = unidad != null ? unidad.longValue() : null;

            return Optional.of(new UsuarioAutenticado(id, mail, rol, unidadId));
        } catch (JwtException | IllegalArgumentException | NullPointerException e) {
            return Optional.empty();
        }
    }

    /** Duración del token en segundos (útil para devolverla en la respuesta del login). */
    public long getExpiracionSegundos() {
        return expiracion.toSeconds();
    }
}
