// Página: convenio.html (ficha de un convenio)
import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerConvenio, obtenerHistorial, listarDocumentos, subirDocumento, descargarDocumento,
         listarObservaciones, crearObservacion, aceptarConvenio } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, activarBotonVolver, badgeEstado, badgeVigencia, esConsulta,
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

let convenio = null;   // el convenio que se está mostrando
let urlVisor = null;
let cantidadDocumentos = null; // null hasta que se cargan; el aviso de estado lo necesita para saber si falta el PDF

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
    const firmantes = c.listaImplicados ?? [];
    if (firmantes.length > 0) {
        insignias.append(crearElemento("span", "badge text-bg-light border",
            `Firmas ${firmantes.filter((f) => f.firmado).length}/${firmantes.length}`));
    }
}

// ---------- Estado: qué falta (datos o firmas) ----------

// Lo mismo que exige la API para aceptar (ConvenioServicio.validarParaAceptar)
function datosFaltantes(c) {
    const faltan = [];
    if (!c.organizacion?.trim()) faltan.push("organización (Partes)");
    if (!c.fechaInicio) faltan.push("fecha de inicio");
    if (c.tipo !== "MARCO" && !c.convenioPadreId) faltan.push("convenio marco");
    if (cantidadDocumentos === 0) faltan.push("PDF del convenio");
    if ((c.listaImplicados ?? []).length === 0) faltan.push("al menos un firmante");
    return faltan;
}

function pintarEstado(c) {
    const aviso = document.getElementById("avisoEstado");
    const firmantes = c.listaImplicados ?? [];
    const pendientes = firmantes.filter((f) => !f.firmado);
    let clase = "", titulo = "", detalle = "";

    if (c.estado === "BORRADOR") {
        const faltan = datosFaltantes(c);
        clase = "borrador"; titulo = "Borrador: faltan datos";
        detalle = faltan.length > 0
            ? `Para poder aceptarlo falta: ${faltan.join(", ")}.`
            : "Tiene todos los datos requeridos. Al aceptarlo se habilita la firma.";
    } else if (c.estado === "ACEPTADO") {
        clase = "aceptado"; titulo = "Aceptado: datos completos, faltan firmas";
        detalle = `Firmaron ${firmantes.length - pendientes.length} de ${firmantes.length}.` +
            (pendientes.length > 0 ? ` Pendientes: ${pendientes.map((f) => f.usuarioNombre).join(", ")}.` : "") +
            (esConsulta(obtenerUsuario()?.rol) ? "" : " Si se modifica el convenio, las firmas ya registradas se anulan.");
    } else if (c.estado === "FIRMADO") {
        clase = "firmado"; titulo = "Firmado: están todas las firmas";
        detalle = `${firmantes.length === 1 ? "Firmó el único firmante" : `Firmaron los ${firmantes.length} firmantes`}${c.fechaFirma ? ` (${formatearFechaHora(c.fechaFirma)})` : ""}.`;
    } else {
        clase = "cerrado"; titulo = c.estado === "RESCINDIDO" ? "Rescindido" : "Archivado";
        detalle = "El convenio está cerrado y ya no admite cambios.";
    }
    aviso.className = `aviso-estado ${clase}`;
    aviso.replaceChildren(crearElemento("strong", "", titulo), detalle);
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
    if (esConsulta(obtenerUsuario()?.rol)) return; // Consulta solo mira (y firma desde la app)
    if (c.estado !== "BORRADOR" && c.estado !== "ACEPTADO") return; // solo esos estados se editan
    const acciones = document.getElementById("acciones");
    const editar = crearElemento("a", "btn btn-borde", "Editar");
    editar.href = `convenio-form.html?id=${c.id}`;
    acciones.append(editar);

    // Aceptar: de Borrador a Aceptado. La API revisa que no falte nada y, si falta, lo dice.
    if (c.estado === "BORRADOR") {
        const aceptar = crearElemento("button", "btn btn-convenios", "Aceptar convenio");
        aceptar.type = "button";
        const modal = new bootstrap.Modal(document.getElementById("modalAceptar"));
        aceptar.addEventListener("click", () => modal.show());
        document.getElementById("confirmarAceptar").addEventListener("click", async (evento) => {
            const boton = evento.currentTarget;
            boton.disabled = true;
            try {
                await aceptarConvenio(c.id);
                location.reload();
            } catch (error) {
                modal.hide();
                mostrarAlerta(alertas, error.message);
                boton.disabled = false;
            }
        });
        acciones.append(aceptar);
    }
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
    const botonVer = crearElemento("button", "btn btn-borde btn-chico", "Ver");
    botonVer.type = "button";
    botonVer.setAttribute("aria-label", `Ver ${d.nombre}`);
    botonVer.addEventListener("click", () => verDocumento(d, botonVer));

    const botonBajar = crearElemento("button", "btn btn-borde btn-chico", "Descargar");
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
        cantidadDocumentos = documentos.length;
        if (convenio) pintarEstado(convenio); // el PDF es uno de los datos que pide la aceptación
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
    pintarEstado(convenio);
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