package ar.edu.unlpam.convenios.servicio;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.Documento;
import ar.edu.unlpam.convenios.entidad.Usuario;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.excepcion.ConflictoException;
import ar.edu.unlpam.convenios.excepcion.NoEncontradoException;
import ar.edu.unlpam.convenios.excepcion.SolicitudInvalidaException;
import ar.edu.unlpam.convenios.repositorio.DocumentoRepositorio;
import org.apache.pdfbox.Loader;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor 
public class DocumentoServicio {

    private static final int LIMITE_BYTES = 20 * 1024 * 1024;

    private DocumentoRepositorio documentoRepo;
    private ConvenioServicio convenioServicio;
    private UsuarioServicio usuarioServicio;
    private AlmacenamientoServicio almacenamiento;
    private HistorialServicio historialServicio;

    public Documento subir(Long convenioId, MultipartFile archivo) {
        Convenio c = convenioServicio.obtenerVisible(convenioId);
        if (c.getEstado() == EstadoConvenio.RESCINDIDO || c.getEstado() == EstadoConvenio.ARCHIVADO)
            throw new ConflictoException("TRANSICION_INVALIDA",
                "No se pueden adjuntar documentos a un convenio " + c.getEstado());
        if (archivo == null || archivo.isEmpty())
            throw new SolicitudInvalidaException("Debe adjuntar un archivo");

        String nombre = archivo.getOriginalFilename() == null ? "documento.pdf" : archivo.getOriginalFilename();
        if (nombre.length() > 150) nombre = nombre.substring(nombre.length() - 150);
        byte[] original = AlmacenamientoServicio.bytesDe(archivo);
        if (original.length > LIMITE_BYTES)
            throw new SolicitudInvalidaException("El PDF supera los 20 MB");
        // No alcanza con la extensión: un PDF real empieza con los bytes "%PDF"
        if (!nombre.toLowerCase().endsWith(".pdf") || original.length < 4
                || original[0] != '%' || original[1] != 'P' || original[2] != 'D' || original[3] != 'F')
            throw new SolicitudInvalidaException("Solo se admiten archivos PDF");

        Usuario usuario = usuarioServicio.actual();
        byte[] marcado = marcarPdf(original, c, usuario);

        Documento d = new Documento();
        d.setConvenio(c);
        d.setNombre(nombre);
        d.setSubidoPor(usuario);
        d.setSha256(sha256(marcado));
        d.setRutaArchivo(almacenamiento.guardar(marcado, "documentos", ".pdf"));
        d.setFechaCarga(LocalDateTime.now());
        Documento guardado = documentoRepo.save(d);
        historialServicio.registrar(c, "SUBIR_DOCUMENTO", c.getEstado(), c.getEstado(), nombre);
        return guardado;
    }

    public List<Documento> listar(Long convenioId) {
        convenioServicio.obtenerVisible(convenioId);
        return documentoRepo.findByConvenioId(convenioId);
    }

    // Valida que el usuario pueda ver el convenio del documento
    public Documento obtenerVisible(Long documentoId) {
        Documento d = documentoRepo.findById(documentoId)
            .orElseThrow(() -> new NoEncontradoException("Documento no encontrado"));
        convenioServicio.obtenerVisible(d.getConvenio().getId());
        return d;
    }

    public Resource archivo(Documento d) {
        return almacenamiento.leer(d.getRutaArchivo());
    }

    // Marca en los metadatos del PDF (la hace la API, como pide el enunciado)
    private byte[] marcarPdf(byte[] original, Convenio c, Usuario usuario) {
        try (PDDocument doc = Loader.loadPDF(original);
             ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PDDocumentInformation info = doc.getDocumentInformation();
            info.setCustomMetadataValue("SubidoPor",
                usuario.getNombre() + " " + usuario.getApellido() + " <" + usuario.getMail() + ">");
            info.setCustomMetadataValue("Convenio", c.getCodigo());
            info.setCustomMetadataValue("FechaHoraCarga", LocalDateTime.now().toString());
            info.setCustomMetadataValue("Origen", "Sistema de Convenios UNLPam");
            doc.save(salida);
            return salida.toByteArray();
        } catch (IOException e) { // PDF corrupto o protegido con contraseña
            throw new SolicitudInvalidaException("El archivo no es un PDF válido");
        }
    }

    private String sha256(byte[] datos) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(datos));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e); // SHA-256 siempre existe en la JVM
        }
    }
}