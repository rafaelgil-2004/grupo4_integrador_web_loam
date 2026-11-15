package ar.edu.unlpam.convenios.controlador;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import ar.edu.unlpam.convenios.dto.DocumentoRespuesta;
import ar.edu.unlpam.convenios.entidad.Documento;
import ar.edu.unlpam.convenios.servicio.DocumentoServicio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag (name = "Documentos")
@RestController
@RequiredArgsConstructor
public class DocumentoControlador {

    private final DocumentoServicio servicio;

    @Operation (
        summary = "Subir un PDF a un convenio",
        description = "Recibe un PDF (multipart, hasta 20 MB) y lo adjunta al convenio. Valida que sea un PDF real (no solo la extensión). La API escribe una marca en los metadatos del archivo (usuario, convenio, fecha y hora), calcula su SHA-256 y lo guarda fuera de la carpeta pública. Lo puede subir cualquier usuario que vea el convenio. No se admite en convenios Rescindidos o Archivados"
    )
    @PostMapping(value = "/convenios/{convenioId}/documentos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentoRespuesta subir(@PathVariable Long convenioId,
                           @RequestPart("archivo") MultipartFile archivo) {
        return servicio.subir(convenioId, archivo);
    }

    @Operation (
        summary = "Listar documentos de un convenio",
        description = "Devuelve los PDF adjuntos con su nombre, quién y cuándo los subió y su SHA-256 (la marca de verificación)"
    )
    @GetMapping("/convenios/{convenioId}/documentos")
    public List<DocumentoRespuesta> listar(@PathVariable Long convenioId) {
        return servicio.listar(convenioId);
    }

    @Operation (
        summary = "Descargar un documento",
        description = "Entrega el PDF como archivo. Requiere token y permiso para ver el convenio al que pertenece, por lo que el archivo no es accesible por una URL directa"
    )
    // "inline" para que el <iframe> de la web y el visor de la app lo muestren sin forzar descarga
    @GetMapping("/documentos/{id}/descargar")
    public ResponseEntity<Resource> descargar(@PathVariable Long id) {
        Documento d = servicio.obtenerVisible(id); // valida que el usuario pueda ver el convenio
        Resource archivo = servicio.archivo(d);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.inline().filename(d.getNombre(), StandardCharsets.UTF_8).build().toString())
            .body(archivo);
    }

    @Operation (
        summary = "Eliminar un documento",
        description = "Solo Administración y Gestión de la unidad. En un Borrador se elimina sin más; en un Aceptado hace falta el motivo, se anulan las firmas y el convenio debe conservar al menos un PDF. No se puede en convenios Firmados, Rescindidos o Archivados. Borra también el archivo del servidor"
    )
    @DeleteMapping("/documentos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMINISTRACION','GESTION')")
    public void eliminar(@PathVariable Long id, @RequestParam(required = false) String motivo) {
        servicio.eliminar(id, motivo);
    }
}