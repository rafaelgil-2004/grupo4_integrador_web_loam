package ar.edu.unlpam.convenios.servicio;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import ar.edu.unlpam.convenios.dto.ObservacionSolicitud;
import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.Observacion;
import ar.edu.unlpam.convenios.repositorio.ObservacionRepositorio;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor 
public class ObservacionServicio {

    // Mínima a propósito: se puede ampliar. Sin tildes, porque el texto se normaliza antes
    private static final Pattern OFENSIVAS = Pattern.compile(
        "\\b(idiota|estupido|imbecil|inutil|basura|mierda|pelotudo|tarado|maldito)\\b");

    private ObservacionRepositorio observacionRepo;
    private ConvenioServicio convenioServicio;
    private UsuarioServicio usuarioServicio;

    public List<Observacion> listar(Long convenioId) {
        convenioServicio.obtenerVisible(convenioId);
        return observacionRepo.findByConvenioIdOrderByFechaHoraDesc(convenioId);
    }

    public Observacion crear(Long convenioId, ObservacionSolicitud s) {
        Convenio c = convenioServicio.obtenerVisible(convenioId);
        boolean ofensivo = esOfensivo(s.getTexto());
        Observacion o = new Observacion();
        o.setConvenio(c);
        o.setUsuario(usuarioServicio.actual());
        // Si es ofensivo, el texto original no se guarda: queda solo la leyenda
        o.setTexto(ofensivo ? "comentario ofensivo" : s.getTexto().trim());
        o.setOfensivo(ofensivo);
        o.setFechaHora(LocalDateTime.now());
        return observacionRepo.save(o);
    }

    // Minúsculas + sin tildes (NFD separa la letra de su tilde y se elimina la tilde)
    private boolean esOfensivo(String texto) {
        String limpio = Normalizer.normalize(texto.toLowerCase(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "");
        return OFENSIVAS.matcher(limpio).find();
    }
}