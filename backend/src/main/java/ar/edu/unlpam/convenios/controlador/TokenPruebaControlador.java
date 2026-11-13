package ar.edu.unlpam.convenios.controlador;

import ar.edu.unlpam.convenios.entidad.enums.Rol;
import ar.edu.unlpam.convenios.seguridad.JwtServicio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** TEMPORAL: solo para probar en Swagger. Borrar cuando exista el login real. */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class TokenPruebaControlador {

    private final JwtServicio jwtServicio;

    @GetMapping("/token-prueba")
    public Map<String, String> token(@RequestParam(defaultValue = "ADMINISTRACION") Rol rol,
                                     @RequestParam(required = false) Long unidadId) {
        var usuario = new UsuarioAutenticado(0L, "prueba@unlpam.edu.ar", rol, unidadId);
        return Map.of("token", jwtServicio.generarToken(usuario));
    }
}