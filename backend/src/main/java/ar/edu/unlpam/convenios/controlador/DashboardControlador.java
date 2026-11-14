package ar.edu.unlpam.convenios.controlador;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ar.edu.unlpam.convenios.dto.ConvenioRespuesta;
import ar.edu.unlpam.convenios.dto.ResumenDashboard;
import ar.edu.unlpam.convenios.servicio.DashboardServicio;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@Tag (name = "Dashboard")
// Sin @PreAuthorize: lo usan todos los roles (el servicio ya filtra por visibles())
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardControlador {

    private final DashboardServicio servicio;

    @Operation (
        summary = "Resumen del panel de inicio",
        description = "Devuelve los contadores de la pantalla de inicio: firmados en el último año, vigentes, en trámite (Borrador y Aceptado), por vencer, vencidos y cantidad por estado. Se calcula solo sobre los convenios que el usuario puede ver"
    )
    @GetMapping("/resumen")
    public ResumenDashboard resumen() {
        return servicio.resumen();
    }

    @Operation (
        summary = "Últimos movimientos",
        description = "Devuelve los convenios con actividad más reciente (sin repetir), del más nuevo al más viejo. El parámetro limite fija la cantidad máxima (10 por defecto)"
    )
    @GetMapping("/movimientos")
    public List<ConvenioRespuesta> movimientos(@RequestParam(defaultValue = "10") int limite) {
        return servicio.movimientos(Math.min(Math.max(limite, 1), 50));
    }
}