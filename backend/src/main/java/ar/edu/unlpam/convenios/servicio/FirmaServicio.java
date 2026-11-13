@Service
@Transactional
public class FirmaServicio {

    @Autowired private ConvenioImplicadoRepositorio implicadoRepo;
    @Autowired private ConvenioRepositorio convenioRepo;
    @Autowired private ConvenioServicio convenioServicio;
    @Autowired private AlmacenamientoServicio almacenamiento;
    @Autowired private HistorialServicio historialServicio;

    public ConvenioImplicado firmar(Long convenioId, Double latitud, Double longitud,
                                    MultipartFile imagenFirma) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        Convenio c = convenioServicio.obtenerVisible(convenioId);
        ConvenioImplicado implicado = implicadoRepo.findByConvenioIdAndUsuarioId(convenioId, u.id())
            .orElseThrow(() -> new SinPermisoException("No es firmante de este convenio"));
        if (c.getEstado() != EstadoConvenio.ACEPTADO)
            throw new ConflictoException("TRANSICION_INVALIDA", "El convenio no está disponible para firmar");
        if (implicado.isFirmado())
            throw new ConflictoException("YA_FIRMADO", "Ya firmó este convenio");

        implicado.setFirmado(true);
        implicado.setFechaFirma(LocalDateTime.now());
        implicado.setLatitud(latitud);
        implicado.setLongitud(longitud);
        if (imagenFirma != null && !imagenFirma.isEmpty())
            implicado.setFirmaRuta(almacenamiento.guardar(
                AlmacenamientoServicio.bytesDe(imagenFirma), "firmas", ".png"));
        implicadoRepo.save(implicado);
        historialServicio.registrar(c, "FIRMAR", c.getEstado(), c.getEstado(), null);

        // Si firmaron todos, el convenio pasa solo a Firmado
        boolean firmaronTodos = implicadoRepo.findByConvenioId(convenioId).stream()
            .allMatch(ConvenioImplicado::isFirmado);
        if (firmaronTodos) {
            c.setEstado(EstadoConvenio.FIRMADO);
            c.setFechaFirma(LocalDateTime.now());
            convenioRepo.save(c);
            historialServicio.registrar(c, "FIRMADO", EstadoConvenio.ACEPTADO,
                EstadoConvenio.FIRMADO, "Firmaron todos los implicados");
        }
        return implicado;
    }

    public List<ConvenioImplicado> listar(Long convenioId) {
        convenioServicio.obtenerVisible(convenioId);
        return implicadoRepo.findByConvenioId(convenioId);
    }

    // "Mis pendientes": convenios Aceptados que el usuario todavía no firmó
    public List<ConvenioRespuesta> pendientes(int limite) {
        return implicadoRepo.findByUsuarioIdAndFirmadoFalse(UsuarioAutenticado.actual().id()).stream()
            .map(ConvenioImplicado::getConvenio)
            .filter(c -> c.getEstado() == EstadoConvenio.ACEPTADO)
            .sorted(Comparator.comparing(Convenio::getFechaActualizacion).reversed())
            .limit(limite)
            .map(convenioServicio::aRespuesta)
            .toList();
    }
}