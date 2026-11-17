//arreglo de las fechas: se muestra un dia menos
function aFecha(valor) {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [anio, mes, dia] = valor.split("-").map(Number);
        return new Date(anio, mes - 1, dia);
    }
    return new Date(valor);
}

//coversion de fecha a hora argentina
export function formatearFecha(valor) {
    return valor ? aFecha(valor).toLocaleDateString("es-AR") : "—";
}

export function formatearFechaHora(valor) {
    return valor ? aFecha(valor).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

//leer los parametros de la URL
export const parametroUrl = (nombre) => new URLSearchParams(location.search).get(nombre);

//crea los elementos de la pagina
export function crearElemento(etiqueta, clases = "", texto = "") {
    const elemento = document.createElement(etiqueta);
    if (clases) elemento.className = clases;
    if (texto) elemento.textContent = texto;
    return elemento;
}