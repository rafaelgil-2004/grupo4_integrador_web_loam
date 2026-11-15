// Página: convenio.html (ficha de un convenio)
import { exigirSesion } from "../sesion.js";
import { obtenerConvenio, obtenerHistorial, listarDocumentos, subirDocumento, descargarDocumento,
         listarObservaciones, crearObservacion } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, activarBotonVolver, badgeEstado, badgeVigencia,
         NOMBRES_TIPO, NOMBRES_SUBTIPO } from "../ui.js";
import { parametroUrl, formatearFecha, formatearFechaHora, crearElemento } from "../utils.js";

const LIMITE_BYTES = 20 * 1024 * 1024;
const NOMBRES_ACCION = {
    CREAR: "Creación", EDITAR: "Edición", MODIFICAR: "Modificación", ACEPTAR: "Aceptación",
    FIRMAR: "Firma", FIRMADO: "Firmado completo", RESCINDIR: "Rescisión", ARCHIVAR: "Archivo",
    SUBIR_DOCUMENTO: "Documento subido", ELIMINAR_DOCUMENTO: "Documento eliminado",
};

const idConvenio = parametroUrl("id");
const alertas = document.getElementById("alertas");
const alertasDocumentos = document.getElementById("alertasDocumentos");
const alertasObservaciones = document.getElementById("alertasObservaciones");
const alertasHistorial = document.getElementById("alertasHistorial");

let convenio = null;   // lo van a usar los botones de acción (próximo paso)
let urlVisor = null;

const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);

// ---------- Cabecera y datos ----------

function pintarCabecera(c) {
    document.title = `${c.codigo} | Convenios UNLPam`;
    document.getElementById("codigo").textContent = c.codigo;
    document.getElementById("titulo").textContent = c.titulo;
    const insignias = document.getElementById("insignias");
    insignias.append(badgeEstado(c.estado));
    if (c.vigencia === "SIN_VENCIMIENTO") {
        insignias.append(crearElemento("span", "badge text-bg-light border", "Sin vencimiento registrado"));
    } else if (c.vigencia) {
        insignias.append(badgeVigencia(c.vigencia));
    }
}

// Agrega un par "título / valor" a la lista de definición y devuelve el <dd>.
// "contenido" puede ser texto o un nodo; el texto se agrega como texto, no como HTML.
function agregarFila(lista, titulo, contenido) {
    const dd = crearElemento("dd", "col-sm-9");
    dd.append(contenido);
    lista.append(crearElemento("dt", "col-sm-3 fw-semibold", titulo), dd);
    return dd;
}

function pintarDatos(c) {
    const lista = document.getElementById("listaDatos");
    agregarFila(lista, "Tipo", `${NOMBRES_TIPO[c.tipo] ?? c.tipo} · ${NOMBRES_SUBTIPO[c.subtipo] ?? c.subtipo}`);
    agregarFila(lista, "Unidad responsable", c.unidad?.nombre ?? "—");
    agregarFila(lista, "Organización", c.organizacion || "—");
    agregarFila(lista, "Objeto", c.objeto || "—");
    agregarFila(lista, "Resolución", c.resolucion || "—");
    agregarFila(lista, "Expediente", c.expediente || "—");
    agregarFila(lista, "Fecha de inicio", formatearFecha(c.fechaInicio));
    agregarFila(lista, "Vencimiento", c.fechaVencimiento ? formatearFecha(c.fechaVencimiento) : "sin vencimiento registrado");
    agregarFila(lista, "Fecha de firma", formatearFechaHora(c.fechaFirma));

    if (c.convenioPadreId) {
        // Solo se conoce el id del padre: se consulta para mostrar su código y título
        const dd = agregarFila(lista, "Convenio padre", "Cargando...");
        obtenerConvenio(c.convenioPadreId)
            .then((padre) => {
                const enlace = crearElemento("a", "", `${padre.codigo} · ${padre.titulo}`);
                enlace.href = `convenio.html?id=${padre.id}`;
                dd.replaceChildren(enlace);
            })
            .catch(() => { dd.textContent = `Convenio n.º ${c.convenioPadreId}`; });
    }

    agregarFila(lista, "Creado por", c.creadoPorNombre || "—");
    agregarFila(lista, "Creado el", formatearFechaHora(c.fechaCreacion));
    agregarFila(lista, "Última actualización", formatearFechaHora(c.fechaActualizacion));
}

function pintarFirmantes(firmantes) {
    mostrar(document.getElementById("sinFirmantes"), firmantes.length === 0);
    mostrar(document.getElementById("contenedorFirmantes"), firmantes.length > 0);
    document.getElementById("cuerpoFirmantes").replaceChildren(...firmantes.map((f) => {
        const celdaEstado = crearElemento("td");
        celdaEstado.append(crearElemento("span", `badge ${f.firmado ? "text-bg-success" : "text-bg-secondary"}`,
            f.firmado ? "Firmó" : "Pendiente"));
        const ubicacion = f.latitud != null && f.longitud != null
            ? `${f.latitud.toFixed(5)}, ${f.longitud.toFixed(5)}` : "—";
        const fila = crearElemento("tr");
        fila.append(crearElemento("td", "", f.usuarioNombre), celdaEstado,
                    crearElemento("td", "", formatearFechaHora(f.fechaFirma)),
                    crearElemento("td", "", ubicacion));
        return fila;
    }));
}

function pintarAcciones(c) {
    if (c.estado !== "BORRADOR" && c.estado !== "ACEPTADO") return; // solo esos estados se editan
    const editar = crearElemento("a", "btn btn-principal", "Editar");
    editar.href = `convenio-form.html?id=${c.id}`;
    document.getElementById("acciones").append(editar);
}

// ---------- Documentos ----------

function mensajeDeDescarga(error) {
    return error.estado === 404 ? "El archivo no está disponible en el servidor." : error.message;
}

async function verDocumento(documento, boton) {
    limpiarAlerta(alertasDocumentos);
    boton.disabled = true;
    try {
        const blob = await descargarDocumento(documento.id);
        // El PDF se muestra desde una URL local (blob:) y no desde la URL de la API, porque un
        // <iframe> no puede enviar el token. Al cambiar de documento se libera el anterior.
        if (urlVisor) URL.revokeObjectURL(urlVisor);
        urlVisor = URL.createObjectURL(blob);
        document.getElementById("visorPdf").src = urlVisor;
        document.getElementById("nombreVisor").textContent = documento.nombre;
        const seccion = document.getElementById("seccionVisor");
        mostrar(seccion, true);
        seccion.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        mostrarAlerta(alertasDocumentos, mensajeDeDescarga(error));
    } finally {
        boton.disabled = false;
    }
}

async function guardarDocumento(documento, boton) {
    limpiarAlerta(alertasDocumentos);
    boton.disabled = true;
    try {
        const url = URL.createObjectURL(await descargarDocumento(documento.id));
        const enlace = crearElemento("a");
        enlace.href = url;
        enlace.download = documento.nombre; // con "download" el navegador guarda en lugar de abrir
        document.body.append(enlace);
        enlace.click();
        enlace.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000); // margen para que empiece la descarga
    } catch (error) {
        mostrarAlerta(alertasDocumentos, mensajeDeDescarga(error));
    } finally {
        boton.disabled = false;
    }
}

function crearItemDocumento(d) {
    const botonVer = crearElemento("button", "btn btn-sm btn-outline-secondary", "Ver");
    botonVer.type = "button";
    botonVer.setAttribute("aria-label", `Ver ${d.nombre}`);
    botonVer.addEventListener("click", () => verDocumento(d, botonVer));

    const botonBajar = crearElemento("button", "btn btn-sm btn-outline-secondary", "Descargar");
    botonBajar.type = "button";
    botonBajar.setAttribute("aria-label", `Descargar ${d.nombre}`);
    botonBajar.addEventListener("click", () => guardarDocumento(d, botonBajar));

    const acciones = crearElemento("div", "d-flex gap-2");
    acciones.append(botonVer, botonBajar);

    // La "marca de verificación": quién lo subió, cuándo y la huella SHA-256 del archivo
    const hash = crearElemento("code", "", `${d.sha256.slice(0, 16)}…`);
    hash.title = d.sha256;
    const marca = crearElemento("small", "d-block text-body-secondary");
    marca.append("SHA-256: ", hash);

    const info = crearElemento("div");
    info.append(crearElemento("div", "fw-semibold", d.nombre),
                crearElemento("small", "d-block text-body-secondary",
                    `Subido por ${d.subidoPorNombre} · ${formatearFechaHora(d.fechaCarga)}`),
                marca);

    const item = crearElemento("div", "list-group-item d-flex flex-wrap justify-content-between align-items-start gap-2");
    item.append(info, acciones);
    return item;
}

async function cargarDocumentos() {
    limpiarAlerta(alertasDocumentos);
    try {
        const documentos = await listarDocumentos(idConvenio);
        mostrar(document.getElementById("sinDocumentos"), documentos.length === 0);
        document.getElementById("listaDocumentos").replaceChildren(...documentos.map(crearItemDocumento));
    } catch (error) {
        mostrarAlerta(alertasDocumentos, error.message);
    }
}

function prepararSubida() {
    const formulario = document.getElementById("formularioSubida");
    const campo = document.getElementById("archivoPdf");
    const boton = document.getElementById("botonSubir");

    // La API no admite documentos en convenios cerrados
    if (convenio.estado === "RESCINDIDO" || convenio.estado === "ARCHIVADO") {
        campo.disabled = true;
        boton.disabled = true;
        document.getElementById("avisoSubida").textContent =
            "No se pueden adjuntar documentos a un convenio rescindido o archivado.";
        return;
    }

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limpiarAlerta(alertasDocumentos);
        const archivo = campo.files[0];
        // Estas validaciones solo ahorran un viaje: la API las vuelve a comprobar
        if (!archivo) { mostrarAlerta(alertasDocumentos, "Elija un archivo PDF.", "warning"); return; }
        if (!archivo.name.toLowerCase().endsWith(".pdf")) { mostrarAlerta(alertasDocumentos, "Solo se admiten archivos PDF.", "warning"); return; }
        if (archivo.size > LIMITE_BYTES) { mostrarAlerta(alertasDocumentos, "El archivo supera los 20 MB.", "warning"); return; }

        boton.disabled = true;
        try {
            await subirDocumento(idConvenio, archivo);
            formulario.reset();
            await cargarDocumentos();
            cargarHistorial(); // la subida queda registrada en el historial
            mostrarAlerta(alertasDocumentos, "Documento subido correctamente.", "success");
        } catch (error) {
            mostrarAlerta(alertasDocumentos, error.message);
        } finally {
            boton.disabled = false;
        }
    });
}

// ---------- Observaciones ----------

async function cargarObservaciones() {
    limpiarAlerta(alertasObservaciones);
    try {
        const observaciones = await listarObservaciones(idConvenio);
        mostrar(document.getElementById("sinObservaciones"), observaciones.length === 0);
        document.getElementById("listaObservaciones").replaceChildren(...observaciones.map((o) => {
            const cabecera = crearElemento("div", "d-flex justify-content-between gap-2");
            cabecera.append(crearElemento("strong", "", o.usuarioNombre),
                            crearElemento("small", "text-body-secondary", formatearFechaHora(o.fechaHora)));
            const item = crearElemento("div", "list-group-item");
            item.append(cabecera, crearElemento("p", `mb-0${o.ofensivo ? " fst-italic text-body-secondary" : ""}`, o.texto));
            return item;
        }));
    } catch (error) {
        mostrarAlerta(alertasObservaciones, error.message);
    }
}

function prepararObservaciones() {
    const formulario = document.getElementById("formularioObservacion");
    const campo = document.getElementById("textoObservacion");
    const boton = document.getElementById("botonObservar");

    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        limpiarAlerta(alertasObservaciones);
        const texto = campo.value.trim();
        if (!texto) { mostrarAlerta(alertasObservaciones, "Escriba la observación.", "warning"); return; }

        boton.disabled = true;
        try {
            const nueva = await crearObservacion(idConvenio, texto);
            formulario.reset();
            await cargarObservaciones();
            cargarHistorial();
            if (nueva.ofensivo) {
                mostrarAlerta(alertasObservaciones,
                    "El comentario fue detectado como ofensivo y quedó registrado como «comentario ofensivo».", "warning");
            }
        } catch (error) {
            mostrarAlerta(alertasObservaciones, error.message);
        } finally {
            boton.disabled = false;
        }
    });
}

// ---------- Historial ----------

function crearCeldaEstados(h) {
    const celda = crearElemento("td", "text-nowrap");
    if (h.estadoAnterior && h.estadoNuevo && h.estadoAnterior !== h.estadoNuevo) {
        celda.append(badgeEstado(h.estadoAnterior), " → ", badgeEstado(h.estadoNuevo));
    } else if (h.estadoNuevo) {
        celda.append(badgeEstado(h.estadoNuevo));
    } else {
        celda.append("—");
    }
    return celda;
}

async function cargarHistorial() {
    limpiarAlerta(alertasHistorial);
    try {
        const historial = await obtenerHistorial(idConvenio);
        mostrar(document.getElementById("sinHistorial"), historial.length === 0);
        document.getElementById("cuerpoHistorial").replaceChildren(...historial.map((h) => {
            const fila = crearElemento("tr");
            fila.append(crearElemento("td", "text-nowrap", formatearFechaHora(h.fechaHora)),
                        crearElemento("td", "", h.usuarioNombre),
                        crearElemento("td", "", NOMBRES_ACCION[h.accion] ?? h.accion),
                        crearCeldaEstados(h),
                        crearElemento("td", "", h.motivo || "—"));
            return fila;
        }));
    } catch (error) {
        mostrarAlerta(alertasHistorial, error.message);
    }
}



async function iniciar() {
    dibujarLayout("convenios");
    activarBotonVolver(document.getElementById("botonVolver"), "convenios.html");

    if (!/^\d+$/.test(idConvenio ?? "")) {
        mostrar(document.getElementById("cargando"), false);
        mostrarAlerta(alertas, "No se indicó qué convenio mostrar. Vuelva al listado y elija uno.", "warning");
        return;
    }

    try {
        convenio = await obtenerConvenio(idConvenio);
    } catch (error) {
        mostrar(document.getElementById("cargando"), false);
        mostrarAlerta(alertas, error.message); // 404 si no existe o no tiene permiso
        return;
    }

    pintarCabecera(convenio);
    pintarDatos(convenio);
    pintarFirmantes(convenio.listaImplicados ?? []);
    pintarAcciones(convenio);
    prepararSubida();
    prepararObservaciones();
    mostrar(document.getElementById("cargando"), false);
    mostrar(document.getElementById("contenido"), true);

    // Las tres cargas son independientes: si una falla, las otras pestañas funcionan igual
    cargarDocumentos();
    cargarObservaciones();
    cargarHistorial();
}

if (exigirSesion()) iniciar();