@Service
public class DashboardServicio {

    @Autowired private ConvenioServicio convenioServicio;
    @Autowired private HistorialRepositorio historialRepo;

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