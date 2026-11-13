package ar.edu.unlpam.convenios.servicio;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import ar.edu.unlpam.convenios.configuracion.PropiedadesAlmacenamiento;
import ar.edu.unlpam.convenios.excepcion.NoEncontradoException;
import ar.edu.unlpam.convenios.excepcion.SolicitudInvalidaException;

@Service
public class AlmacenamientoServicio {

    // Punto seguido de letras o números (ej: ".pdf"). Evita extensiones con "/" o "..".
    private static final Pattern EXTENSION_VALIDA = Pattern.compile("^\\.[A-Za-z0-9]{1,10}$");

    private final Path raiz;

    public AlmacenamientoServicio(PropiedadesAlmacenamiento propiedades) {
        this.raiz = propiedades.rutaBase();
    }

    // Devuelve la ruta relativa que se guarda en la base (ej: "documentos/3f2a....pdf")
    public String guardar(byte[] contenido, String subcarpeta, String extension) {
        if (extension == null || !EXTENSION_VALIDA.matcher(extension).matches()) {
            throw new SolicitudInvalidaException("Extensión de archivo inválida");
        }
        try {
            Path carpeta = resolverSeguro(subcarpeta);
            Files.createDirectories(carpeta);
            // Nombre generado: nunca se usa el nombre que manda el cliente
            String nombre = UUID.randomUUID() + extension;
            Files.write(carpeta.resolve(nombre), contenido);
            return subcarpeta + "/" + nombre;
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar el archivo", e);
        }
    }

    public Resource leer(String rutaRelativa) {
        Path archivo = resolverSeguro(rutaRelativa);
        if (!Files.isRegularFile(archivo)) throw new NoEncontradoException("Archivo no encontrado");
        return new FileSystemResource(archivo);
    }

    public void borrar(String rutaRelativa) {
        try {
            Files.deleteIfExists(resolverSeguro(rutaRelativa));
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo borrar el archivo", e);
        }
    }

    public static byte[] bytesDe(MultipartFile archivo) {
        try {
            return archivo.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el archivo recibido", e);
        }
    }

    // Defensa contra path traversal: la ruta resuelta debe quedar dentro de la carpeta base
    private Path resolverSeguro(String rutaRelativa) {
        Path ruta = raiz.resolve(rutaRelativa).normalize();
        if (!ruta.startsWith(raiz)) throw new NoEncontradoException("Archivo no encontrado");
        return ruta;
    }
}