import { obtenerUsuario, cerrarSesion } from "./sesion.js";
import { crearElemento } from "./utils.js";

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

const ESTADOS = {
    BORRADOR:   { texto: "Borrador",   clase: "text-bg-secondary" },
    ACEPTADO:   { texto: "Aceptado",   clase: "text-bg-primary" },
    FIRMADO:    { texto: "Firmado",    clase: "text-bg-success" },
    RESCINDIDO: { texto: "Rescindido", clase: "text-bg-danger" },
    ARCHIVADO:  { texto: "Archivado",  clase: "text-bg-dark" },
};
export const ORDEN_ESTADOS = Object.keys(ESTADOS);
export const nombreEstado = (estado) => ESTADOS[estado]?.texto ?? estado;

export function badgeEstado(estado) {
    const badge = document.createElement("span");
    badge.className = `badge ${ESTADOS[estado]?.clase ?? "text-bg-light"}`;
    badge.textContent = nombreEstado(estado);
    return badge;
}

//inicio
// Navbar y pie
const ENLACES = [
    { clave: "inicio",    texto: "Inicio",         url: "inicio.html" },
    { clave: "convenios", texto: "Convenios",      url: "convenios.html" },
    { clave: "nuevo",     texto: "Nuevo convenio", url: "convenio-form.html" },
    { clave: "usuarios",  texto: "Usuarios",       url: "usuarios.html", soloAdmin: true },
];
const NOMBRES_ROL = { ADMINISTRACION: "Administración", GESTION: "Gestión" };

export function dibujarLayout(paginaActiva) {
    const usuario = obtenerUsuario();
    if (!usuario) { cerrarSesion(); return; }

    // Las claves de ENLACES son fijas, así que acá no hay datos externos dentro del HTML
    const enlaces = ENLACES
        .filter((e) => !e.soloAdmin || usuario.rol === "ADMINISTRACION")
        .map((e) => {
            const activo = e.clave === paginaActiva;
            return `<li class="nav-item"><a class="nav-link${activo ? " active" : ""}" href="${e.url}"${activo ? ' aria-current="page"' : ""}>${e.texto}</a></li>`;
        }).join("");

    document.getElementById("navbar").innerHTML = `
        <nav class="navbar navbar-expand-lg barra-principal" data-bs-theme="dark" aria-label="Navegación principal">
            <div class="container">
                <a class="navbar-brand" href="inicio.html">Convenios UNLPam</a>
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
                        data-bs-target="#menuPrincipal" aria-controls="menuPrincipal"
                        aria-expanded="false" aria-label="Mostrar u ocultar el menú">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <div class="collapse navbar-collapse" id="menuPrincipal">
                    <ul class="navbar-nav me-auto">${enlaces}</ul>
                    <div class="dropdown">
                        <button class="btn btn-usuario dropdown-toggle" type="button"
                                data-bs-toggle="dropdown" aria-expanded="false" id="nombreUsuario"></button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><span class="dropdown-item-text small" id="rolUsuario"></span></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item" type="button" id="botonCerrarSesion">Cerrar sesión</button></li>
                        </ul>
                    </div>
                </div>
            </div>
        </nav>`;

    // El nombre sí viene de la API: se inserta como texto
    document.getElementById("nombreUsuario").textContent = `${usuario.nombre} ${usuario.apellido}`;
    document.getElementById("rolUsuario").textContent =
        (NOMBRES_ROL[usuario.rol] ?? usuario.rol) + (usuario.unidadNombre ? ` · ${usuario.unidadNombre}` : "");
    document.getElementById("botonCerrarSesion").addEventListener("click", cerrarSesion);

    document.getElementById("pie").innerHTML = `
        <div class="container text-center small">
            Facultad de Ingeniería · Universidad Nacional de La Pampa · Trabajo Integrador 2026
        </div>`;
}

//convenios
export const NOMBRES_TIPO = { MARCO: "Marco", ESPECIFICO: "Específico", ADENDA: "Adenda" };
export const NOMBRES_SUBTIPO = {
    COLABORACION: "Colaboración", PASANTIA: "Pasantía",
    PRACTICA: "Práctica profesional", INTERCAMBIO: "Intercambio",
};

// La vigencia solo existe en convenios Firmados; "SIN_VENCIMIENTO" no necesita badge
const VIGENCIAS = {
    VIGENTE:    { texto: "Vigente",    clase: "text-bg-success" },
    POR_VENCER: { texto: "Por vencer", clase: "text-bg-warning" },
    EXPIRADO:   { texto: "Vencido",    clase: "text-bg-danger" },
};

export function badgeVigencia(vigencia) {
    const datos = VIGENCIAS[vigencia];
    return crearElemento("span", `badge ${datos?.clase ?? "text-bg-light"}`, datos?.texto ?? vigencia);
}

// "pagina" es el objeto page de la respuesta: { number (desde 0), totalPages, ... }
export function dibujarPaginacion(contenedor, { number, totalPages }, alCambiar) {
    contenedor.replaceChildren();
    if (totalPages <= 1) return;

    const crearItem = (texto, destino, { activo = false, deshabilitado = false, etiqueta } = {}) => {
        const li = crearElemento("li", `page-item${activo ? " active" : ""}${deshabilitado ? " disabled" : ""}`);
        if (activo) li.setAttribute("aria-current", "page");
        const boton = crearElemento("button", "page-link", texto);
        boton.type = "button";
        if (etiqueta) boton.setAttribute("aria-label", etiqueta);
        if (deshabilitado) boton.disabled = true;
        else boton.addEventListener("click", () => alCambiar(destino));
        li.append(boton);
        return li;
    };

    const lista = crearElemento("ul", "pagination justify-content-center mb-0");
    lista.append(crearItem("«", number - 1, { deshabilitado: number === 0, etiqueta: "Página anterior" }));
    // Ventana de hasta 5 números centrada en la página actual
    const desde = Math.max(0, Math.min(number - 2, totalPages - 5));
    const hasta = Math.min(totalPages, desde + 5);
    for (let i = desde; i < hasta; i++) {
        lista.append(crearItem(String(i + 1), i, { activo: i === number }));
    }
    lista.append(crearItem("»", number + 1, { deshabilitado: number >= totalPages - 1, etiqueta: "Página siguiente" }));
    contenedor.append(lista);
}

// Vuelve a la página anterior solo si viene de este mismo sitio (document.referrer);
// si el usuario llegó con un enlace directo, history.back() lo sacaría de la aplicación
export function activarBotonVolver(boton, urlRespaldo = "inicio.html") {
    boton.addEventListener("click", () => {
        const vieneDelSitio = document.referrer && new URL(document.referrer).origin === location.origin;
        if (vieneDelSitio) history.back();
        else location.href = urlRespaldo;
    });
}