@Service
public class AlmacenamientoServicio {

    private final Path raiz;

    public AlmacenamientoServicio(PropiedadesAlmacenamiento propiedades) {
        this.raiz = Paths.get(propiedades.ruta()).toAbsolutePath().normalize();
    }

    // Devuelve la ruta relativa que se guarda en la base (ej: "documentos/3f2a....pdf")
    public String guardar(byte[] contenido, String subcarpeta, String extension) {
        try {
            Path carpeta = raiz.resolve(subcarpeta);
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
        if (!Files.exists(archivo)) throw new NoEncontradoException("Archivo no encontrado");
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