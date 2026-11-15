import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { listarConvenios, obtenerArbol, listarUnidades } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, badgeEstado, badgeVigencia,
         dibujarPaginacion, NOMBRES_TIPO, NOMBRES_SUBTIPO, activarBotonVolver } from "../ui.js";
import { formatearFecha, crearElemento } from "../utils.js";

const TAMANIO_PAGINA = 10;
// Nombres de los campos del formulario que viajan como filtros a la API
const CAMPOS = ["q", "tipo", "subtipo", "estado", "unidadId", "anioFirma", "vigencia"];

const formulario = document.getElementById("formularioFiltros");
const alertas = document.getElementById("alertas");
const resultados = document.getElementById("resultados");
const cuerpoTabla = document.getElementById("cuerpoTabla");

let vista = "tabla";
let ultimaBusqueda = 0;

const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);

// filtros formulario url

function filtrosDelFormulario() {
    const filtros = {};
    for (const campo of CAMPOS) {
        const elemento = formulario.elements[campo]; // para Gestión no existe "unidadId"
        if (elemento && elemento.value.trim() !== "") filtros[campo] = elemento.value.trim();
    }
    if (formulario.elements.incluirArchivados.checked) filtros.incluirArchivados = true;
    return filtros;
}

// Deja la búsqueda reflejada en la dirección: sirve para los enlaces del inicio, para recargar
// y para el botón "Atrás". replaceState no agrega una entrada al historial por cada búsqueda.
function sincronizarUrl(filtros, pagina) {
    const parametros = new URLSearchParams(filtros);
    if (vista === "arbol") parametros.set("vista", "arbol");
    if (pagina > 0) parametros.set("pagina", pagina);
    const texto = parametros.toString();
    history.replaceState(null, "", texto ? `?${texto}` : location.pathname);
}

function aplicarUrlAlFormulario() {
    const parametros = new URLSearchParams(location.search);
    for (const campo of CAMPOS) {
        if (formulario.elements[campo] && parametros.has(campo)) {
            formulario.elements[campo].value = parametros.get(campo);
        }
    }
    formulario.elements.incluirArchivados.checked = parametros.get("incluirArchivados") === "true";
    vista = parametros.get("vista") === "arbol" ? "arbol" : "tabla";
    return Number(parametros.get("pagina")) || 0;
}

//busqueda

async function buscar(pagina = 0) {
    // Si el usuario busca dos veces seguidas, una respuesta lenta de la primera búsqueda
    // podría llegar después de la segunda y pisarla. Cada búsqueda lleva un número y las
    // viejas se descartan al volver.
    const numero = ++ultimaBusqueda;
    limpiarAlerta(alertas);
    const filtros = filtrosDelFormulario();
    sincronizarUrl(filtros, pagina);
    marcarCargando(true);
    try {
        if (vista === "arbol") {
            const nodos = await obtenerArbol(filtros);
            if (numero === ultimaBusqueda) pintarArbol(nodos);
        } else {
            const respuesta = await listarConvenios({ ...filtros, pagina, tamanio: TAMANIO_PAGINA });
            if (numero !== ultimaBusqueda) return;
            // Página fuera de rango (por ejemplo una URL vieja): se vuelve a la primera
            if (respuesta.content.length === 0 && respuesta.page.number > 0 && respuesta.page.totalElements > 0) {
                buscar(0);
                return;
            }
            pintarTabla(respuesta);
        }
    } catch (error) {
        if (numero === ultimaBusqueda) mostrarAlerta(alertas, error.message);
    } finally {
        if (numero === ultimaBusqueda) marcarCargando(false);
    }
}

function marcarCargando(cargando) {
    resultados.setAttribute("aria-busy", String(cargando));
    mostrar(document.getElementById("cargando"), cargando);
    if (cargando) {
        mostrar(document.getElementById("sinResultados"), false);
    }
}

//vista de tabla

function crearFila(c) {
    const fila = crearElemento("tr");
    const celdaEstado = crearElemento("td");
    celdaEstado.append(badgeEstado(c.estado));

    const celdaVencimiento = crearElemento("td", "text-nowrap");
    celdaVencimiento.append(c.fechaVencimiento ? formatearFecha(c.fechaVencimiento) : "sin vencimiento registrado");
    if (c.vigencia && c.vigencia !== "SIN_VENCIMIENTO") celdaVencimiento.append(" ", badgeVigencia(c.vigencia));

    const enlace = crearElemento("a", "btn btn-sm btn-outline-secondary", "Ver");
    enlace.href = `convenio.html?id=${c.id}`;
    enlace.setAttribute("aria-label", `Ver convenio ${c.codigo}`);
    const celdaAccion = crearElemento("td", "text-end");
    celdaAccion.append(enlace);

    fila.append(
        crearElemento("td", "text-nowrap fw-semibold", c.codigo),
        crearElemento("td", "", c.titulo),
        crearElemento("td", "", `${NOMBRES_TIPO[c.tipo] ?? c.tipo} · ${NOMBRES_SUBTIPO[c.subtipo] ?? c.subtipo}`),
        crearElemento("td", "", c.unidad?.nombre ?? "—"),
        celdaEstado,
        celdaVencimiento,
        celdaAccion,
    );
    return fila;
}

function pintarTabla({ content, page }) {
    mostrar(document.getElementById("contenedorTabla"), true);
    mostrar(document.getElementById("contenedorArbol"), false);
    cuerpoTabla.replaceChildren(...content.map(crearFila));
    document.getElementById("resumenResultados").textContent =
        `(${page.totalElements} ${page.totalElements === 1 ? "convenio" : "convenios"})`;
    mostrar(document.getElementById("sinResultados"), content.length === 0);
    mostrar(document.getElementById("contenedorTabla"), content.length > 0);
    dibujarPaginacion(document.getElementById("paginacion"), page, (destino) => {
        buscar(destino);
        window.scrollTo({ top: 0 });
    });
}

// vista de arbol

// Recursiva: cada nodo dibuja a sus hijos con el mismo método
function crearNodo(nodo) {
    const li = crearElemento("li", "arbol-nodo");
    const contenido = crearElemento("span", "");
    const enlace = crearElemento("a", "fw-semibold", `${nodo.codigo} · ${nodo.titulo}`);
    enlace.href = `convenio.html?id=${nodo.id}`;
    contenido.append(enlace, " ", badgeEstado(nodo.estado), " ",
        crearElemento("small", "text-body-secondary",
            `${NOMBRES_TIPO[nodo.tipo] ?? nodo.tipo} · ${NOMBRES_SUBTIPO[nodo.subtipo] ?? nodo.subtipo}`));

    if (!nodo.hijos || nodo.hijos.length === 0) {
        li.append(contenido);
        return li;
    }
    // <details> permite expandir y contraer sin JavaScript
    const detalle = crearElemento("details");
    detalle.open = true;
    const resumen = crearElemento("summary");
    resumen.append(contenido);
    const lista = crearElemento("ul", "arbol-lista");
    nodo.hijos.forEach((hijo) => lista.append(crearNodo(hijo)));
    detalle.append(resumen, lista);
    li.append(detalle);
    return li;
}

function pintarArbol(nodos) {
    mostrar(document.getElementById("contenedorTabla"), false);
    mostrar(document.getElementById("contenedorArbol"), nodos.length > 0);
    document.getElementById("arbol").replaceChildren(...nodos.map(crearNodo));
    document.getElementById("resumenResultados").textContent = "";
    mostrar(document.getElementById("sinResultados"), nodos.length === 0);
}

// Inicio

function actualizarBotonesVista() {
    for (const [id, nombre] of [["vistaTabla", "tabla"], ["vistaArbol", "arbol"]]) {
        const boton = document.getElementById(id);
        boton.classList.toggle("active", vista === nombre);
        boton.setAttribute("aria-pressed", String(vista === nombre));
    }
}

async function cargarUnidades() {
    try {
        const unidades = await listarUnidades();
        const selector = document.getElementById("unidadId");
        for (const unidad of unidades) selector.append(new Option(unidad.nombre, unidad.id));
    } catch (error) {
        mostrarAlerta(alertas, `No se pudieron cargar las unidades: ${error.message}`);
    }
}

async function iniciar() {
    dibujarLayout("convenios");

    // Gestión solo ve su unidad: el filtro no tiene sentido. Las unidades hay que cargarlas
    // ANTES de aplicar la URL, o el valor de ?unidadId= no encontraría su opción.
    if (obtenerUsuario().rol === "ADMINISTRACION") await cargarUnidades();
    else document.getElementById("campoUnidad").remove();

    const paginaInicial = aplicarUrlAlFormulario();
    actualizarBotonesVista();

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        buscar(0);
    });
    document.getElementById("botonLimpiar").addEventListener("click", () => {
        formulario.reset();
        buscar(0);
    });
    for (const [id, nombre] of [["vistaTabla", "tabla"], ["vistaArbol", "arbol"]]) {
        document.getElementById(id).addEventListener("click", () => {
            vista = nombre;
            actualizarBotonesVista();
            buscar(0);
        });
    }

    buscar(paginaInicial);
}

if (exigirSesion()) iniciar();