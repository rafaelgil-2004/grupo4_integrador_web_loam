package ar.edu.unlpam.convenios.controlador;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.dto.ResumenDashboard;
import ar.edu.unlpam.convenios.servicio.DashboardServicio;
import lombok.RequiredArgsConstructor;

// Sin @PreAuthorize: lo usan todos los roles (el servicio ya filtra por visibles())
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardControlador {

    private final DashboardServicio servicio;

    @GetMapping("/resumen")
    public ResumenDashboard resumen() {
        return servicio.resumen();
    }

    @GetMapping("/movimientos")
    public List<ConvenioRespuesta> movimientos(@RequestParam(defaultValue = "10") int limite) {
        return servicio.movimientos(Math.min(Math.max(limite, 1), 50));
    }
}