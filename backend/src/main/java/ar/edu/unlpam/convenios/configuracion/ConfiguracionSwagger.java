package ar.edu.unlpam.convenios.configuracion;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Documentación de la API (Swagger UI) con soporte para enviar el token JWT.
 * El botón "Authorize" de la UI agrega el header Authorization: Bearer <token>.
 */
@Configuration
public class ConfiguracionSwagger {

    private static final String ESQUEMA_JWT = "bearerAuth";

    @Bean
    public OpenAPI apiConvenios() {
        return new OpenAPI()
                .info(new Info()
                        .title("API Gestión de Convenios UNLPam")
                        .version("1.0")
                        .description("Backend del sistema de convenios: usuarios, convenios, "
                                + "documentos, firmas y observaciones."))
                .addSecurityItem(new SecurityRequirement().addList(ESQUEMA_JWT))
                .components(new Components().addSecuritySchemes(ESQUEMA_JWT,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}