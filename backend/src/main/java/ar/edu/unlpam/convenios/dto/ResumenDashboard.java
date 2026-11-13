package ar.edu.unlpam.convenios.dto;

import java.util.Map;

public record ResumenDashboard(long firmadosUltimoAnio, long vigentes, long enTramite,
        long porVencer, long vencidos, Map<String, Long> porEstado) {}