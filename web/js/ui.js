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
export function badgeEstado(estado) {
    const badge = document.createElement("span");
    badge.className = `badge ${ESTADOS[estado]?.clase ?? "text-bg-light"}`;
    badge.textContent = ESTADOS[estado]?.texto ?? estado;
    return badge;
}

//inicio
const ENLACES = [
    { clave: "convenios", texto: "Convenios", url: "convenios.html" },
    { clave: "usuarios",  texto: "Usuarios",  url: "usuarios.html" },
];
export const NOMBRES_ROL = {
    ADMINISTRACION: "Administrador", GESTION: "Gestión",
    ESTUDIANTE: "Estudiante", PROFESOR: "Docente", DECANO: "Decano",
};

//para controlar si son roles de consulta
export const esConsulta = (rol) => rol !== "ADMINISTRACION" && rol !== "GESTION";

//encavezado y pie
const ICONO_USUARIO = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none"
    stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/></svg>`;

export function dibujarLayout(paginaActiva, { menu: conMenu = true } = {}) {
    const usuario = obtenerUsuario();
    if (!usuario) { cerrarSesion(); return; }
    document.body.classList.add("pagina-sitio");

    const menu = (!conMenu || usuario.rol !== "ADMINISTRACION") ? "" : `
        <nav class="menu-sitio" aria-label="Navegación principal">
            <ul>${ENLACES.map((e) => {
                const activo = e.clave === paginaActiva;
                return `<li><a href="${e.url}"${activo ? ' aria-current="page"' : ""}>${e.texto}</a></li>`;
            }).join("")}</ul>
        </nav>`;

    document.getElementById("navbar").innerHTML = `
        <div class="encabezado-sitio">
            <a class="marca" href="convenios.html">
                <img src="../recursos/images/logoUNLPam.png" alt="Logo de la UNLPam">
                <span class="marca-texto">
                    <span class="marca-sup">Convenios</span>
                    <span class="marca-inf">Universidad Nacional de La Pampa</span>
                </span>
            </a>
            <div class="dropdown">
                <button class="boton-usuario" type="button" data-bs-toggle="dropdown"
                        aria-expanded="false" aria-label="Menú de usuario">${ICONO_USUARIO}</button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><span class="dropdown-item-text fw-bold" id="nombreUsuario"></span></li>
                    <li><span class="dropdown-item-text small" id="rolUsuario"></span></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" type="button" id="botonCerrarSesion">Cerrar sesión</button></li>
                </ul>
            </div>
        </div>${menu}`;

    document.getElementById("nombreUsuario").textContent = `${usuario.nombre} ${usuario.apellido}`;
    document.getElementById("rolUsuario").textContent =
        (NOMBRES_ROL[usuario.rol] ?? usuario.rol) + (usuario.unidadNombre ? ` · ${usuario.unidadNombre}` : "");
    document.getElementById("botonCerrarSesion").addEventListener("click", cerrarSesion);

    const pie = document.getElementById("pie");
    pie.className = "pie-sitio";
    pie.innerHTML = `
        <div class="contenido">
            <span>© 2026 Universidad Nacional de La Pampa</span>
            <span><a href="#">Accesibilidad</a><a href="#">Privacidad</a></span>
        </div>`;
}

//convenios
export const NOMBRES_TIPO = { MARCO: "Marco", ESPECIFICO: "Específico", ADENDA: "Adenda" };
export const NOMBRES_SUBTIPO = {
    COLABORACION: "Colaboración", PASANTIA: "Pasantía",
    PRACTICA: "Práctica profesional", INTERCAMBIO: "Intercambio",
};

//"SIN_VENCIMIENTO" no necesita badge
const VIGENCIAS = {
    VIGENTE:    { texto: "Vigente",    clase: "text-bg-success" },
    POR_VENCER: { texto: "Por vencer", clase: "text-bg-warning" },
    EXPIRADO:   { texto: "Vencido",    clase: "text-bg-danger" },
};

export function badgeVigencia(vigencia) {
    const datos = VIGENCIAS[vigencia];
    return crearElemento("span", `badge ${datos?.clase ?? "text-bg-light"}`, datos?.texto ?? vigencia);
}

// Paginador de texto: "Inicio  Anterior  1 2 3 ... 10  Siguiente  Final".
// Los enlaces de ir hacia atrás o adelante solo aparecen si hay a dónde ir.
// "pagina" empieza en 0; "alCambiar" recibe la página elegida.
export function dibujarPaginacion(contenedor, { pagina, totalPaginas }, alCambiar) {
    contenedor.replaceChildren();
    if (totalPaginas <= 1) return;

    const enlace = (texto, destino, etiqueta) => {
        const boton = crearElemento("button", "pag-enlace", texto);
        boton.type = "button";
        boton.setAttribute("aria-label", etiqueta ?? `Página ${texto}`);
        boton.addEventListener("click", () => alCambiar(destino));
        return boton;
    };

    const fila = crearElemento("div", "paginacion");
    if (pagina > 0) fila.append(enlace("Inicio", 0, "Primera página"), enlace("Anterior", pagina - 1, "Página anterior"));

    // Ventana de hasta 10 números centrada en la página actual
    const desde = Math.max(0, Math.min(pagina - 4, totalPaginas - 10));
    const hasta = Math.min(totalPaginas, desde + 10);
    for (let i = desde; i < hasta; i++) {
        if (i === pagina) {
            const actual = crearElemento("span", "pag-actual", String(i + 1));
            actual.setAttribute("aria-current", "page");
            fila.append(actual);
        } else {
            fila.append(enlace(String(i + 1), i));
        }
    }

    if (pagina < totalPaginas - 1) fila.append(enlace("Siguiente", pagina + 1, "Página siguiente"), enlace("Final", totalPaginas - 1, "Última página"));
    contenedor.append(fila);
}

// Vuelve a la página anterior solo si viene de este mismo sitio (document.referrer);
// si el usuario llegó con un enlace directo, history.back() lo sacaría de la aplicación
export function volverAtras(urlRespaldo = "convenios.html") {
    const vieneDelSitio = document.referrer && new URL(document.referrer).origin === location.origin;
    if (vieneDelSitio) history.back();
    else location.href = urlRespaldo;
}

export function activarBotonVolver(boton, urlRespaldo = "convenios.html") {
    boton.addEventListener("click", () => volverAtras(urlRespaldo));
}