package ar.edu.unlpam.convenios.servicio;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import ar.edu.unlpam.convenios.entidad.Convenio;
import ar.edu.unlpam.convenios.entidad.Historial;
import ar.edu.unlpam.convenios.entidad.enums.EstadoConvenio;
import ar.edu.unlpam.convenios.repositorio.HistorialRepositorio;
import ar.edu.unlpam.convenios.repositorio.UsuarioRepositorio;

@Service
public class HistorialServicio {

    @Autowired private HistorialRepositorio historialRepo;
    @Autowired private UsuarioRepositorio usuarioRepo;

    // El usuario se toma del token: los demás servicios no tienen que pasarlo
    public void registrar(Convenio convenio, String accion, EstadoConvenio anterior,
                          EstadoConvenio nuevo, String motivo) {
        Historial h = new Historial();
        h.setConvenio(convenio);
        // getReferenceById devuelve un proxy sin consultar la base; alcanza para la FK
        h.setUsuario(usuarioRepo.getReferenceById(UsuarioAutenticado.actual().id()));
        h.setAccion(accion);
        h.setEstadoAnterior(anterior);
        h.setEstadoNuevo(nuevo);
        h.setMotivo(motivo != null && motivo.length() > 255 ? motivo.substring(0, 255) : motivo);
        h.setFechaHora(LocalDateTime.now());
        historialRepo.save(h);
    }

    public List<Historial> listar(Long convenioId) {
        return historialRepo.findByConvenioIdOrderByFechaHoraDesc(convenioId);
    }
}