
export function mostrarAlerta(contenedor, mensaje, tipo = "danger") {
    const alerta = document.createElement("div");
    alerta.className = `alert alert-${tipo}`;
    alerta.setAttribute("role", "alert");
    alerta.textContent = mensaje;
    contenedor.replaceChildren(alerta);
}

export function limpiarAlerta(contenedor) {
    contenedor.replaceChildren();
}