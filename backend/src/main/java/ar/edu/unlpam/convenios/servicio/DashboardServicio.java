package ar.edu.unlpam.convenios.servicio;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.dto.ResumenDashboard;
import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.Historial;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.repositorio.HistorialRepositorio;

import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor 
public class DashboardServicio {

    private final ConvenioServicio convenioServicio;
    private final HistorialRepositorio historialRepo;

    public ResumenDashboard resumen() {
        List<Convenio> lista = convenioServicio.visibles();
        LocalDateTime haceUnAnio = LocalDateTime.now().minusYears(1);

        long firmadosUltimoAnio = lista.stream()
            .filter(c -> c.getFechaFirma() != null && c.getFechaFirma().isAfter(haceUnAnio)).count();
        // "Por vencer" es un subconjunto de "vigentes"
        long vigentes = lista.stream()
            .filter(c -> ConvenioServicio.esVigente(convenioServicio.calcularVigencia(c))).count();
        long porVencer = lista.stream()
            .filter(c -> "POR_VENCER".equals(convenioServicio.calcularVigencia(c))).count();
        long vencidos = lista.stream()
            .filter(c -> "EXPIRADO".equals(convenioServicio.calcularVigencia(c))).count();
        long enTramite = lista.stream()
            .filter(c -> c.getEstado() == EstadoConvenio.BORRADOR
                      || c.getEstado() == EstadoConvenio.ACEPTADO).count();
        Map<String, Long> porEstado = lista.stream()
            .collect(Collectors.groupingBy(c -> c.getEstado().name(), Collectors.counting()));

        return new ResumenDashboard(firmadosUltimoAnio, vigentes, enTramite, porVencer, vencidos, porEstado);
    }

    // Convenios con movimientos recientes, del más nuevo al más viejo, sin repetir
    public List<ConvenioRespuesta> movimientos(int limite) {
        Map<Long, Convenio> visibles = convenioServicio.visibles().stream()
            .collect(Collectors.toMap(Convenio::getId, c -> c));
        Set<Long> ids = new LinkedHashSet<>(); // conserva el orden de inserción
        for (Historial h : historialRepo.findAll(Sort.by(Sort.Direction.DESC, "fechaHora"))) {
            Long idConvenio = h.getConvenio().getId();
            if (visibles.containsKey(idConvenio)) ids.add(idConvenio);
            if (ids.size() >= limite) break;
        }
        return ids.stream().map(id -> convenioServicio.aRespuesta(visibles.get(id))).toList();
    }
}