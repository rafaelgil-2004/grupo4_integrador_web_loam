// Página: convenios.html (resumen + árbol de convenios)
import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerArbol, obtenerConvenio, obtenerResumen, listarUnidades,
         listarDocumentos, descargarDocumento } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, esConsulta, NOMBRES_TIPO, NOMBRES_SUBTIPO } from "../ui.js";
import { formatearFecha, crearElemento } from "../utils.js";

// Campos del formulario que viajan como filtros a la API
const CAMPOS = ["q", "tipo", "subtipo", "estado", "unidadId", "anioFirma", "vigencia"];
// Estado del convenio → texto de la etiqueta y su color
const ETIQUETA_ESTADO = {
    BORRADOR:   ["Borrador", ""],
    ACEPTADO:   ["Pendiente de firmas", "espera"],
    FIRMADO:    ["Firmado", "ok"],
    RESCINDIDO: ["Rescindido", "alerta"],
    ARCHIVADO:  ["Archivado", ""],
};

const formulario = document.getElementById("formularioFiltros");
const alertas = document.getElementById("alertas");
const resultados = document.getElementById("resultados");
const contenedorArbol = document.getElementById("arbol");

let ultimaBusqueda = 0;
let nodosActuales = [];
let abiertos = new Set();        // ids de los convenios desplegados
let detalles = new Map();        // id → convenio completo (firmas, fechas, partes)

const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);

// ---------- Filtros y URL ----------

function filtrosDelFormulario() {
    const filtros = {};
    for (const campo of CAMPOS) {
        const elemento = formulario.elements[campo]; // para Gestión no existe "unidadId"
        if (elemento && elemento.value.trim() !== "") filtros[campo] = elemento.value.trim();
    }
    if (formulario.elements.incluirArchivados.checked) filtros.incluirArchivados = true;
    return filtros;
}

// Deja la búsqueda en la dirección (sirve para los enlaces del resumen y para recargar)
function sincronizarUrl(filtros) {
    const texto = new URLSearchParams(filtros).toString();
    history.replaceState(null, "", texto ? `?${texto}` : location.pathname);
}

function aplicarUrlAlFormulario() {
    const parametros = new URLSearchParams(location.search);
    let hayFiltros = false;
    for (const campo of CAMPOS) {
        if (formulario.elements[campo] && parametros.has(campo)) {
            formulario.elements[campo].value = parametros.get(campo);
            hayFiltros = true;
        }
    }
    if (parametros.get("incluirArchivados") === "true") {
        formulario.elements.incluirArchivados.checked = true;
        hayFiltros = true;
    }
    if (hayFiltros) { // si llegó con filtros, el panel se muestra abierto
        document.getElementById("panelFiltros").classList.add("show");
        document.querySelector('[data-bs-target="#panelFiltros"]').setAttribute("aria-expanded", "true");
    }
}

// ---------- Búsqueda ----------

// El árbol puede traer los documentos como nodos (tipo DOCUMENTO): no son convenios, se descartan
function soloConvenios(nodos) {
    return nodos
        .filter((n) => n.tipo !== "DOCUMENTO")
        .map((n) => ({ ...n, hijos: soloConvenios(n.hijos ?? []) }));
}

function aplanar(nodos) {
    return nodos.flatMap((n) => [n, ...aplanar(n.hijos)]);
}

function contar(nodos) {
    return aplanar(nodos).length;
}

// Pide el detalle de cada convenio (firmas, fechas, partes) para armar las etiquetas
async function cargarDetalles(nodos) {
    detalles = new Map();
    const pedidos = await Promise.allSettled(aplanar(nodos).map((n) => obtenerConvenio(n.id)));
    pedidos.forEach((p, i) => {
        if (p.status === "fulfilled") detalles.set(aplanar(nodos)[i].id, p.value);
    });
}

async function buscar() {
    // Si el usuario busca dos veces seguidas, una respuesta lenta de la primera no debe pisar la segunda
    const numero = ++ultimaBusqueda;
    limpiarAlerta(alertas);
    const filtros = filtrosDelFormulario();
    sincronizarUrl(filtros);
    marcarCargando(true);
    try {
        const nodos = soloConvenios(await obtenerArbol(filtros));
        await cargarDetalles(nodos);
        if (numero !== ultimaBusqueda) return;
        nodosActuales = nodos;
        abiertos = new Set(nodos.map((n) => n.id)); // los marcos (raíces) se muestran abiertos
        pintarArbol();
    } catch (error) {
        if (numero === ultimaBusqueda) mostrarAlerta(alertas, error.message);
    } finally {
        if (numero === ultimaBusqueda) marcarCargando(false);
    }
}

function marcarCargando(cargando) {
    resultados.setAttribute("aria-busy", String(cargando));
    mostrar(document.getElementById("cargando"), cargando);
    if (cargando) mostrar(document.getElementById("sinResultados"), false);
}

// ---------- Árbol de tarjetas ----------

function etiqueta(texto, color = "") {
    return crearElemento("span", `etiqueta ${color}`.trim(), texto);
}

function etiquetasDe(nodo, c) {
    const [textoEstado, colorEstado] = ETIQUETA_ESTADO[nodo.estado] ?? [nodo.estado, ""];
    const lista = [etiqueta(NOMBRES_TIPO[nodo.tipo] ?? nodo.tipo), etiqueta(textoEstado, colorEstado)];
    if (c?.vigencia === "POR_VENCER") lista.push(etiqueta("Por vencer", "espera"));
    if (c?.vigencia === "EXPIRADO") lista.push(etiqueta("Vencido", "alerta"));
    const implicados = c?.listaImplicados ?? [];
    if (implicados.length > 0) {
        lista.push(etiqueta(`Firmas ${implicados.filter((f) => f.firmado).length}/${implicados.length}`));
    }
    return lista;
}

function textoFechas(c) {
    const partes = [];
    if (c.fechaFirma) partes.push(`Firmado ${formatearFecha(c.fechaFirma)}`);
    if (c.fechaInicio) partes.push(`Inicio ${formatearFecha(c.fechaInicio)}`);
    partes.push(c.fechaVencimiento ? `Vence ${formatearFecha(c.fechaVencimiento)}` : "sin vencimiento registrado");
    return partes.join(" - ");
}

function textoPartes(c) {
    const unidad = c.unidad?.nombre ? `UNLPam, ${c.unidad.nombre}` : "UNLPam";
    return c.organizacion ? `${unidad} - ${c.organizacion}` : unidad;
}

function agregarDato(lista, titulo, valor) {
    const caja = crearElemento("div");
    caja.append(crearElemento("dt", "", titulo), crearElemento("dd", "", valor));
    lista.append(caja);
}

function crearFirmas(implicados) {
    const bloque = crearElemento("div", "tc-firmas");
    bloque.append(crearElemento("h3", "", "Firmas registradas"));
    const lista = crearElemento("ul");
    const firmaron = implicados.filter((f) => f.firmado);
    for (const f of firmaron) {
        const fila = crearElemento("li");
        fila.append(crearElemento("span", "marca-ok", "✓"),
            ` Firmó · ${f.usuarioNombre}${f.fechaFirma ? ` (${formatearFecha(f.fechaFirma)})` : ""}`);
        lista.append(fila);
    }
    if (firmaron.length === 0) lista.append(crearElemento("li", "", "Todavía no firmó nadie"));
    bloque.append(lista);
    const faltan = implicados.filter((f) => !f.firmado);
    if (faltan.length > 0) {
        bloque.append(crearElemento("p", "pendientes", `Pendientes: ${faltan.map((f) => f.usuarioNombre).join(", ")}`));
    }
    return bloque;
}

function crearCuerpo(nodo, c, id) {
    const cuerpo = crearElemento("div", "tc-cuerpo");
    cuerpo.id = id;
    if (!c) {
        cuerpo.append(crearElemento("p", "mb-0", "No se pudo cargar el detalle de este convenio."));
        return cuerpo;
    }
    const datos = crearElemento("dl", "tc-datos");
    agregarDato(datos, "Fechas", textoFechas(c));
    agregarDato(datos, "Partes", textoPartes(c));
    agregarDato(datos, "Subtipo", NOMBRES_SUBTIPO[c.subtipo] ?? c.subtipo);
    if (c.objeto) agregarDato(datos, "Objeto", c.objeto);
    const referencia = [c.resolucion && `Res. ${c.resolucion}`, c.expediente && `Exp. ${c.expediente}`]
        .filter(Boolean).join(" · ");
    if (referencia) agregarDato(datos, "Resolución y expediente", referencia);
    cuerpo.append(datos);

    if ((c.listaImplicados ?? []).length > 0) cuerpo.append(crearFirmas(c.listaImplicados));

    const acciones = crearElemento("div", "tc-acciones");
    const historial = crearElemento("a", "btn btn-convenios btn-chico", "Ver historial");
    historial.href = `convenio.html?id=${nodo.id}`;
    acciones.append(historial);
    // Solo Administración y Gestión editan, y únicamente en Borrador o Aceptado
    const puedeEditar = !esConsulta(obtenerUsuario().rol) && ["BORRADOR", "ACEPTADO"].includes(c.estado);
    if (puedeEditar) {
        const editar = crearElemento("a", "btn btn-borde btn-chico", "Editar");
        editar.href = `convenio-form.html?id=${nodo.id}`;
        acciones.append(editar);
    }
    cuerpo.append(acciones);
    return cuerpo;
}

async function descargarPdf(nodo, boton) {
    boton.disabled = true;
    try {
        const documentos = await listarDocumentos(nodo.id);
        if (documentos.length === 0) {
            mostrarAlerta(alertas, `El convenio ${nodo.codigo} todavía no tiene documento.`, "warning");
            alertas.scrollIntoView({ block: "nearest" });
            return;
        }
        const documento = documentos.reduce((a, b) => (b.id > a.id ? b : a)); // el más reciente
        const url = URL.createObjectURL(await descargarDocumento(documento.id));
        const enlace = crearElemento("a");
        enlace.href = url;
        enlace.download = documento.nombre || `${nodo.codigo}.pdf`; // con "download" se guarda en lugar de abrir
        document.body.append(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
        mostrarAlerta(alertas, error.message);
        alertas.scrollIntoView({ block: "nearest" });
    } finally {
        boton.disabled = false;
    }
}

function alternar(id) {
    if (abiertos.has(id)) abiertos.delete(id); else abiertos.add(id);
    pintarArbol();
    // Al redibujar se pierde el foco: se devuelve al mismo botón
    document.querySelector(`[data-convenio="${id}"]`)?.focus();
}

function crearTarjeta(nodo) {
    const c = detalles.get(nodo.id);
    const abierto = abiertos.has(nodo.id);
    const idCuerpo = `cuerpo-${nodo.id}`;
    const tarjeta = crearElemento("article", "tarjeta-convenio");

    const cabecera = crearElemento("div", "tc-cabecera");
    const titulo = crearElemento("button", "tc-titulo");
    titulo.type = "button";
    titulo.dataset.convenio = nodo.id;
    titulo.setAttribute("aria-expanded", String(abierto));
    if (abierto) titulo.setAttribute("aria-controls", idCuerpo);
    const flecha = crearElemento("span", "tc-flecha", "▾");
    flecha.setAttribute("aria-hidden", "true");
    const textos = crearElemento("span");
    textos.append(crearElemento("span", "tc-nombre", nodo.titulo), crearElemento("span", "tc-codigo", nodo.codigo));
    titulo.append(flecha, textos);
    titulo.addEventListener("click", () => alternar(nodo.id));

    const etiquetas = crearElemento("div", "tc-etiquetas");
    etiquetas.append(...etiquetasDe(nodo, c));

    const descargar = crearElemento("button", "btn btn-convenios btn-chico", "Descargar PDF");
    descargar.type = "button";
    descargar.setAttribute("aria-label", `Descargar PDF de ${nodo.codigo}`);
    descargar.addEventListener("click", () => descargarPdf(nodo, descargar));

    cabecera.append(titulo, etiquetas, descargar);
    tarjeta.append(cabecera);
    if (abierto) tarjeta.append(crearCuerpo(nodo, c, idCuerpo));
    return tarjeta;
}

// Recursiva: cada nodo dibuja a sus hijos (solo si está desplegado)
function crearNodo(nodo) {
    const envoltorio = crearElemento("div", "nodo-arbol");
    envoltorio.append(crearTarjeta(nodo));
    if (nodo.hijos.length > 0 && abiertos.has(nodo.id)) {
        const caja = crearElemento("div", "arbol-hijos");
        nodo.hijos.forEach((hijo) => caja.append(crearNodo(hijo)));
        envoltorio.append(caja);
    }
    return envoltorio;
}

function pintarArbol() {
    contenedorArbol.replaceChildren(...nodosActuales.map(crearNodo));
    const total = contar(nodosActuales);
    document.getElementById("resumenResultados").textContent =
        `${total} ${total === 1 ? "convenio encontrado" : "convenios encontrados"}`;
    document.getElementById("actualizado").textContent =
        `Actualizado: ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`;
    mostrar(document.getElementById("sinResultados"), total === 0);
}

// ---------- Resumen y arranque ----------

async function cargarResumen() {
    try {
        const r = await obtenerResumen();
        document.getElementById("num-firmados").textContent = r.firmadosUltimoAnio;
        document.getElementById("num-vigentes").textContent = r.vigentes;
        document.getElementById("num-tramite").textContent = r.enTramite;
        document.getElementById("num-porVencer").textContent = r.porVencer;
        document.getElementById("num-vencidos").textContent = r.vencidos;
    } catch { /* si falla, los números quedan en "—" y el árbol sigue funcionando */ }
}

async function cargarUnidades() {
    try {
        const selector = document.getElementById("unidadId");
        for (const unidad of await listarUnidades()) selector.append(new Option(unidad.nombre, unidad.id));
    } catch (error) {
        mostrarAlerta(alertas, `No se pudieron cargar las unidades: ${error.message}`);
    }
}

async function iniciar() {
    dibujarLayout("convenios");
    const usuario = obtenerUsuario();

    // Administración y Gestión crean convenios; Consulta no
    if (!esConsulta(usuario.rol)) document.getElementById("botonCrear").hidden = false;

    // Las unidades hay que cargarlas ANTES de aplicar la URL, o ?unidadId= no encontraría su opción
    if (usuario.rol === "ADMINISTRACION") await cargarUnidades();
    else document.getElementById("campoUnidad").remove();

    aplicarUrlAlFormulario();
    formulario.addEventListener("submit", (evento) => { evento.preventDefault(); buscar(); });
    document.getElementById("botonLimpiar").addEventListener("click", () => { formulario.reset(); buscar(); });

    cargarResumen();
    buscar();
}

if (exigirSesion()) iniciar();
