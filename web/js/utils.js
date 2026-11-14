// Las fechas sin hora ("2026-11-18") JavaScript las interpreta como UTC y, en Argentina
// (UTC-3), mostrarían el día anterior. Se arman a mano como fecha local.
function aFecha(valor) {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [anio, mes, dia] = valor.split("-").map(Number);
        return new Date(anio, mes - 1, dia);
    }
    return new Date(valor);
}

export function formatearFecha(valor) {
    return valor ? aFecha(valor).toLocaleDateString("es-AR") : "—";
}

export function formatearFechaHora(valor) {
    return valor ? aFecha(valor).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

export const parametroUrl = (nombre) => new URLSearchParams(location.search).get(nombre);

// los datos de la API no se interpretan como HTML
export function crearElemento(etiqueta, clases = "", texto = "") {
    const elemento = document.createElement(etiqueta);
    if (clases) elemento.className = clases;
    if (texto) elemento.textContent = texto;
    return elemento;
}