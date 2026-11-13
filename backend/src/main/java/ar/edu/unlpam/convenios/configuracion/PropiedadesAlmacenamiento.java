package ar.edu.unlpam.convenios.configuracion;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.nio.file.Path;

/**
 * Propiedades de almacenamiento de archivos (PDFs de convenios).
 *
 * En application.properties:
 *     almacenamiento.ruta=./almacenamiento
 *
 * Se registra con @ConfigurationPropertiesScan en ConveniosApplication.
 */
@ConfigurationProperties(prefix = "almacenamiento")
public record PropiedadesAlmacenamiento(String ruta) {

    private static final String RUTA_POR_DEFECTO = "./almacenamiento";

    /** Si no se configura la clave (o está vacía), usa la carpeta por defecto. */
    public PropiedadesAlmacenamiento {
        if (ruta == null || ruta.isBlank()) {
            ruta = RUTA_POR_DEFECTO;
        }
    }

    /**
     * Carpeta base absoluta y normalizada. AlmacenamientoServicio la usa para
     * guardar y para verificar que un path resuelto no se escape de la carpeta (../).
     */
    public Path rutaBase() {
        return Path.of(ruta).toAbsolutePath().normalize();
    }
}