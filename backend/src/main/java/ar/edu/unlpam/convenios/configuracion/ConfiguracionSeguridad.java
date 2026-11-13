package ar.edu.unlpam.convenios.configuracion;

import ar.edu.unlpam.convenios.excepcion.ErrorApi;
import ar.edu.unlpam.convenios.seguridad.FiltroJwt;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;

/**
 * Seguridad de la API: sin sesiones, autenticación por token JWT.
 *
 * - Públicas: login, Swagger y preflight de CORS.
 * - Todo lo demás requiere token válido (si no, 401).
 * - Los permisos por rol se controlan con @PreAuthorize en los controladores
 *   o con UsuarioAutenticado en los servicios (si no alcanza, 403).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class ConfiguracionSeguridad {

    /** Rutas que no necesitan token. */
    private static final String[] RUTAS_PUBLICAS = {
            "/auth/**",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/error"
    };

    private final FiltroJwt filtroJwt;
    private final JsonMapper jsonMapper;

    public ConfiguracionSeguridad(FiltroJwt filtroJwt, JsonMapper jsonMapper) {
        this.filtroJwt = filtroJwt;
        this.jsonMapper = jsonMapper;
    }

    @Bean
    public SecurityFilterChain cadenaDeSeguridad(HttpSecurity http) throws Exception {
        http
                // API REST con token: no hay cookies de sesión, CSRF no aplica
                .csrf(AbstractHttpConfigurer::disable)
                // Usa la configuración de CORS (ConfiguracionCors)
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(RUTAS_PUBLICAS).permitAll()
                        .anyRequest().authenticated())

                // Respuestas 401 y 403 con el mismo formato JSON que el resto de los errores
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) ->
                                escribirError(req, res, HttpStatus.UNAUTHORIZED,
                                        "Debe iniciar sesión: falta el token o es inválido"))
                        .accessDeniedHandler((req, res, ex) ->
                                escribirError(req, res, HttpStatus.FORBIDDEN,
                                        "No tiene permiso para realizar esta acción")))

                .addFilterBefore(filtroJwt, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** Para guardar y verificar las contraseñas (columna password_hash). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * FiltroJwt es un @Component, y Spring Boot registra automáticamente todos los
     * filtros como filtros del servidor. Esto lo evita: debe correr solo dentro
     * de la cadena de seguridad (addFilterBefore de arriba).
     */
    @Bean
    public FilterRegistrationBean<FiltroJwt> desactivarRegistroAutomaticoFiltroJwt(FiltroJwt filtro) {
        FilterRegistrationBean<FiltroJwt> registro = new FilterRegistrationBean<>(filtro);
        registro.setEnabled(false);
        return registro;
    }

    private void escribirError(HttpServletRequest req, HttpServletResponse res,
                               HttpStatus estado, String mensaje) throws IOException {
        res.setStatus(estado.value());
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        jsonMapper.writeValue(res.getOutputStream(), ErrorApi.de(estado, mensaje, req.getRequestURI()));
    }
}
