package ar.edu.unlpam.convenios.configuracion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS: permite que la web (otro origen, servida por XAMPP) llame a la API.
 *
 * Los orígenes salen de application.properties (separados por coma):
 *     cors.origenes-permitidos=http://localhost,http://127.0.0.1
 * Si no está la clave, usa esos dos valores.
 *
 * ConfiguracionSeguridad lo toma con .cors(Customizer.withDefaults()), que busca
 * un bean de tipo CorsConfigurationSource.
 */
@Configuration
public class ConfiguracionCors {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.origenes-permitidos:http://localhost,http://127.0.0.1}")
            List<String> origenesPermitidos) {

        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origenesPermitidos);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        // Para que el navegador pueda leer el nombre del archivo al descargar un PDF
        config.setExposedHeaders(List.of("Content-Disposition"));
        // El token viaja en el header Authorization, no en cookies
        config.setAllowCredentials(false);
        // El navegador puede cachear el preflight 1 hora
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", config);
        return fuente;
    }
}