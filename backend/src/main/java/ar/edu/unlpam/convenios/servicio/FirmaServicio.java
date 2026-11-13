package ar.edu.unlpam.convenios.servicio;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.ConvenioImplicado;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.excepcion.ConflictoException;
import ar.edu.unlpam.convenios.excepcion.SinPermisoException;
import ar.edu.unlpam.convenios.repositorio.ConvenioImplicadoRepositorio;
import ar.edu.unlpam.convenios.repositorio.ConvenioRepositorio;
import ar.edu.unlpam.convenios.seguridad.UsuarioAutenticado;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@Transactional
@RequiredArgsConstructor 
public class FirmaServicio {

    private ConvenioImplicadoRepositorio implicadoRepo;
    private ConvenioRepositorio convenioRepo;
    private ConvenioServicio convenioServicio;
    private AlmacenamientoServicio almacenamiento;
    private HistorialServicio historialServicio;

    public ConvenioImplicado firmar(Long convenioId, Double latitud, Double longitud,
                                    MultipartFile imagenFirma) {
        UsuarioAutenticado u = UsuarioAutenticado.actual();
        Convenio c = convenioServicio.obtenerVisible(convenioId);
        ConvenioImplicado implicado = implicadoRepo.findByConvenioIdAndUsuarioId(convenioId, u.id())
            .orElseThrow(() -> new SinPermisoException("No es firmante de este convenio"));
        if (c.getEstado() != EstadoConvenio.ACEPTADO)
            throw new ConflictoException("TRANSICION_INVALIDA", "El convenio no está disponible para firmar");
        if (implicado.getFirmado())
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
            .allMatch(ConvenioImplicado::getFirmado);
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