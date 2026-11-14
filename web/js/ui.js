import { obtenerUsuario, cerrarSesion } from "./sesion.js";


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

// ---------- Navbar y pie (todas las páginas protegidas) ----------
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