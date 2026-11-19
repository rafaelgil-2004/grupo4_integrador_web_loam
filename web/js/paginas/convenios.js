import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerArbol, obtenerConvenio, obtenerResumen, listarUnidades,
         listarDocumentos, descargarDocumento } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, esConsulta, dibujarPaginacion, NOMBRES_TIPO, NOMBRES_SUBTIPO } from "../ui.js";
import { formatearFecha, crearElemento } from "../utils.js";


// Marcos por página: los específicos y adendas cuelgan de su marco y no cuentan para el límite
const POR_PAGINA = 10;

//lista de filtros que se envia a la api
const CAMPOS = ["q", "tipo", "subtipo", "estado", "unidadId", "anioFirma", "vigencia"];

//texto de las etiqutas y color de las mismas
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

let ultimaBusqueda = 0;//contador para evitar problemas con multiples busquedas
let nodosActuales = [];//arbol de documentos que se muestra en pantalla
let abiertos = new Set();//id de los ocnvenios desplegados
let detalles = new Map();//informacion completa del combenio
let planos = [];                 // todos los convenios en orden de árbol: { nodo, padre }
let vista = { raices: [], hijosDe: new Map() }; // lo que se dibuja en la página actual
let pagina = 0;                  // página mostrada (empieza en 0)

const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);

/*filtros y url*/
//armar la lista de filtros a usar en la consulta, en formato objeto
function filtrosDelFormulario() {
    const filtros = {};
    for (const campo of CAMPOS) {
        const elemento = formulario.elements[campo]; // para Gestión no existe "unidadId"
        if (elemento && elemento.value.trim() !== "") filtros[campo] = elemento.value.trim();
    }
    if (formulario.elements.incluirArchivados.checked) filtros.incluirArchivados = true;
    return filtros;
}

// para escribir en la URL
function sincronizarUrl(filtros) {
    const texto = new URLSearchParams(filtros).toString();
    history.replaceState(null, "", texto ? `?${texto}` : location.pathname);
}

//de la URL al formulario
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
    if (hayFiltros) { // si llega con filtros, el panel se muestra abierto
        document.getElementById("panelFiltros").classList.add("show");
        document.querySelector('[data-bs-target="#panelFiltros"]').setAttribute("aria-expanded", "true");
    }
}

// Búsqueda

//descarta los DOCUMENTO
function soloConvenios(nodos) {
    return nodos
        .filter((n) => n.tipo !== "DOCUMENTO")
        .map((n) => ({ ...n, hijos: soloConvenios(n.hijos ?? []) }));
}

// Marco, sus específicos, siguiente marco... Cada convenio recuerda de quién cuelga.
function aplanarConPadre(nodos, padre = null) {
    return nodos.flatMap((n) => [{ nodo: n, padre }, ...aplanarConPadre(n.hijos, n)]);
}

const totalPaginas = () => Math.ceil(nodosActuales.length / POR_PAGINA);

// Arma lo que se ve en la página actual: los convenios cuyo marco está en la misma página se
// muestran dentro de él; si su marco quedó en otra página, aparecen sueltos con una nota
function armarVista() {
    const raices = nodosActuales
        .slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA)
        .map((nodo) => ({ nodo, huerfanoDe: null }));

    // Recorrido recursivo: registra los hijos de cada nodo de la página para que
    // crearNodo y alternar() los encuentren (también los nietos, p. ej. una adenda)
    const hijosDe = new Map();
    const registrar = (nodo) => {
        if (nodo.hijos?.length) hijosDe.set(nodo.id, nodo.hijos);
        nodo.hijos?.forEach(registrar);
    };
    raices.forEach((r) => registrar(r.nodo));

    vista = { raices, hijosDe };
}

// Pide el detalle (firmas, fechas, partes) solo de los convenios que todavía no se tienen:
// los de la página al mostrarla y los hijos de un marco cuando se lo despliega
async function cargarDetalles(nodos) {
    const faltan = nodos.filter((n) => !detalles.has(n.id));
    const pedidos = await Promise.allSettled(faltan.map((n) => obtenerConvenio(n.id)));
    pedidos.forEach((p, i) => {
        if (p.status === "fulfilled") detalles.set(faltan[i].id, p.value);
    });
}

//
async function buscar() {
    const numero = ++ultimaBusqueda;
    limpiarAlerta(alertas);
    //toma los filtros
    const filtros = filtrosDelFormulario();
    sincronizarUrl(filtros);
    marcarCargando(true);
    //pide el arbol y carga los detalles
    try {
        const nodos = soloConvenios(await obtenerArbol(filtros));
        if (numero !== ultimaBusqueda) return;
        nodosActuales = nodos;
        planos = aplanarConPadre(nodos);
        detalles = new Map();
        abiertos = new Set(); // al buscar, todo queda cerrado
        pagina = 0;
        armarVista();
        await cargarDetalles(vista.raices.map((r) => r.nodo));
        if (numero !== ultimaBusqueda) return;
        pintarArbol();
    } catch (error) {
        if (numero === ultimaBusqueda) mostrarAlerta(alertas, error.message);
    } finally {
        if (numero === ultimaBusqueda) marcarCargando(false);
    }
}

async function irAPagina(destino) {
    const numero = ++ultimaBusqueda;
    pagina = destino;
    armarVista();
    marcarCargando(true);
    try {
        await cargarDetalles(vista.raices.map((r) => r.nodo));
        if (numero !== ultimaBusqueda) return;
        pintarArbol();
        resultados.scrollIntoView({ block: "start" });
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

/*dibujo del arbol*/

//creacion de etiquetas
//elemento
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

//formato de las tarjetas desplegadas
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

//quien firmo y quien no
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

//detalle desplegado
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
    const historial = crearElemento("a", "btn btn-convenios btn-chico", "Ver datos del convenio");
    historial.href = `convenio.html?id=${nodo.id}`;
    acciones.append(historial);
    // Solo Administración y Gestión editan y solo si es Borrador o Aceptado
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
        //no hay documentos
        if (documentos.length === 0) {
            mostrarAlerta(alertas, `El convenio ${nodo.codigo} todavía no tiene documento.`, "warning");
            alertas.scrollIntoView({ block: "nearest" });
            return;
        }
        const documento = documentos.reduce((a, b) => (b.id > a.id ? b : a)); // el documento mas reciente
        const url = URL.createObjectURL(await descargarDocumento(documento.id));
        const enlace = crearElemento("a");
        enlace.href = url;
        enlace.download = documento.nombre || `${nodo.codigo}.pdf`;
        //simulacion de click para la descarga
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

//plegar y desplegar los convenios
async function alternar(id) {
    if (abiertos.has(id)) {
        abiertos.delete(id);
    } else {
        abiertos.add(id);
        await cargarDetalles(vista.hijosDe.get(id) ?? []); // los hijos se muestran recién ahora
    }
    pintarArbol();
    // Al redibujar se pierde el foco: se devuelve al mismo botón
    document.querySelector(`[data-convenio="${id}"]`)?.focus();
}

function crearTarjeta(nodo, huerfanoDe = null) {
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
    const codigo = huerfanoDe ? `${nodo.codigo} · Pertenece a ${huerfanoDe.codigo}` : nodo.codigo;
    textos.append(crearElemento("span", "tc-nombre", nodo.titulo), crearElemento("span", "tc-codigo", codigo));
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

// cada nodo dibuja sus hijos, si esta abierto
function crearNodo(nodo, huerfanoDe = null) {
    const envoltorio = crearElemento("div", "nodo-arbol");
    envoltorio.append(crearTarjeta(nodo, huerfanoDe));
    const hijos = vista.hijosDe.get(nodo.id) ?? [];
    const enOtraPagina = nodo.hijos.length - hijos.length;
    if (abiertos.has(nodo.id) && (hijos.length > 0 || enOtraPagina > 0)) {
        const caja = crearElemento("div", "arbol-hijos");
        hijos.forEach((hijo) => caja.append(crearNodo(hijo)));
        if (enOtraPagina > 0) {
            caja.append(crearElemento("p", "nota-hijos", enOtraPagina === 1
                ? "Otro convenio de este marco se muestra en otra página."
                : `Otros ${enOtraPagina} convenios de este marco se muestran en otra página.`));
        }
        envoltorio.append(caja);
    }
    return envoltorio;
}

function pintarArbol() {
    contenedorArbol.replaceChildren(...vista.raices.map((r) => crearNodo(r.nodo, r.huerfanoDe)));

    const total = planos.length;               // convenios en total, con sus específicos
    const totalRaices = nodosActuales.length;  // marcos: lo que se pagina
    const rango = totalPaginas() > 1
        ? ` · mostrando marcos ${pagina * POR_PAGINA + 1}-${Math.min(totalRaices, (pagina + 1) * POR_PAGINA)} de ${totalRaices}` : "";

    // Lo principal es la cantidad de marcos (lo que se ve y se pagina);
    // el total con los específicos queda como dato secundario
    const textoMarcos = `${totalRaices} ${totalRaices === 1 ? "marco encontrado" : "marcos encontrados"}`;
    document.getElementById("resumenResultados").textContent = textoMarcos + rango;

    document.getElementById("actualizado").textContent =
        `Actualizado: ${new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`;
    mostrar(document.getElementById("sinResultados"), total === 0);
    dibujarPaginacion(document.getElementById("paginacion"), { pagina, totalPaginas: totalPaginas() }, irAPagina);
}

/*Resumen y arranque */
//contadores
async function cargarResumen() {
    try {
        const r = await obtenerResumen();
        document.getElementById("num-firmados").textContent = r.firmadosUltimoAnio;
        document.getElementById("num-vigentes").textContent = r.vigentes;
        document.getElementById("num-tramite").textContent = r.enTramite;
        document.getElementById("num-porVencer").textContent = r.porVencer;
        document.getElementById("num-vencidos").textContent = r.vencidos;
    } catch { }//si falla los contadores quedan en "-"
}
//las unidades para el filtro
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

    if (!esConsulta(usuario.rol)) document.getElementById("botonCrear").hidden = false;

    // Las unidades hay que cargarlas ANTES de aplicar la URL
    if (usuario.rol === "ADMINISTRACION") await cargarUnidades();
    else document.getElementById("campoUnidad").remove();

    aplicarUrlAlFormulario();
    formulario.addEventListener("submit", (evento) => { evento.preventDefault(); buscar(); });
    document.getElementById("botonLimpiar").addEventListener("click", () => { formulario.reset(); buscar(); });

    cargarResumen();
    buscar();
}

if (exigirSesion()) iniciar();
