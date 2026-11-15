// Página: convenio-form.html (crear y editar un convenio)
import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerConvenio, crearConvenio, actualizarConvenio, aceptarConvenio, listarConvenios,
         listarUnidades, listarUsuarios, listarDocumentos, subirDocumento, eliminarDocumento } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, activarBotonVolver, nombreEstado } from "../ui.js";
import { parametroUrl, crearElemento } from "../utils.js";

const LIMITE_BYTES = 20 * 1024 * 1024;
const ROLES_FIRMANTES = ["ESTUDIANTE", "PROFESOR", "DECANO"];
const NOMBRES_ROL = { ESTUDIANTE: "Estudiante", PROFESOR: "Profesor", DECANO: "Decano" };
const SUBTITULO_NUEVO = "Puede guardarlo como borrador con datos incompletos. Para aceptarlo se necesitan todos los datos, el PDF y al menos un firmante.";
const SUBTITULO_ACEPTADO = "Cada cambio queda registrado en el historial con su motivo.";

const usuarioActual = obtenerUsuario();
const esGestion = usuarioActual?.rol === "GESTION";
const idParametro = parametroUrl("id");

const campo = (id) => document.getElementById(id);
const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);
const alertas = campo("alertas");
const formulario = campo("formulario");
const botonGuardar = campo("botonGuardar");
const botonGuardarAceptar = campo("botonGuardarAceptar");

// Estado del formulario. convenioId es null mientras el convenio no se guardó
let convenioId = null;
let revision = null;
let estadoConvenio = null;
let codigoConvenio = null;
let cantidadDocumentos = 0;
let firmantesDisponibles = [];
let pedidoPadres = 0; // descarta respuestas viejas si el usuario cambia tipo o subtipo rápido

// ---------- Errores por campo ----------

function marcarInvalido(id, mensaje) {
    const elemento = campo(id);
    if (!elemento) return false;
    elemento.classList.add("is-invalid");
    elemento.setAttribute("aria-invalid", "true");
    const detalle = campo(`${id}Error`);
    if (detalle) detalle.textContent = mensaje;
    return true;
}

function limpiarErrores() {
    formulario.querySelectorAll(".is-invalid").forEach((elemento) => {
        elemento.classList.remove("is-invalid");
        elemento.removeAttribute("aria-invalid");
    });
}

// El 400 de la API trae { campo: mensaje }. "fechasValidas" es la regla de las dos fechas.
function aplicarDetalles(detalles) {
    let marcados = 0;
    for (const [clave, mensaje] of Object.entries(detalles ?? {})) {
        const id = clave === "fechasValidas" ? "fechaVencimiento" : clave;
        if (marcarInvalido(id, mensaje)) marcados++;
    }
    return marcados;
}

// ---------- Unidad ----------

async function cargarUnidades() {
    const select = campo("unidadId");
    if (esGestion) {
        // Gestión siempre trabaja en su unidad: la API también lo fuerza
        select.replaceChildren(new Option(usuarioActual.unidadNombre ?? "Mi unidad", usuarioActual.unidadId));
        select.value = String(usuarioActual.unidadId);
        select.disabled = true;
        mostrar(campo("avisoUnidad"), true);
        return;
    }
    const unidades = await listarUnidades();
    select.replaceChildren(new Option("Seleccione...", ""),
        ...unidades.map((u) => new Option(u.nombre, u.id)));
}

// ---------- Convenio padre ----------

// Específico: marcos del mismo subtipo. Adenda: marcos o específicos del mismo subtipo.
async function cargarPadres(padreId = null) {
    const tipo = campo("tipo").value;
    const subtipo = campo("subtipo").value;
    const select = campo("convenioPadreId");
    const requierePadre = tipo === "ESPECIFICO" || tipo === "ADENDA";
    mostrar(campo("grupoPadre"), requierePadre);
    if (!requierePadre) { select.replaceChildren(); return; }

    campo("ayudaPadre").textContent = tipo === "ESPECIFICO"
        ? "Marco del mismo subtipo en el que se apoya."
        : "Convenio que la adenda modifica o amplía.";
    if (!subtipo) { select.replaceChildren(new Option("Elija primero el subtipo", "")); return; }

    const pedido = ++pedidoPadres;
    select.replaceChildren(new Option("Cargando...", ""));
    try {
        const filtros = { subtipo, tamanio: 100 }; // 100 es el máximo que admite la API
        if (tipo === "ESPECIFICO") filtros.tipo = "MARCO";
        const { content } = await listarConvenios(filtros);
        const candidatos = content.filter((c) => c.id !== convenioId && (tipo === "ESPECIFICO" || c.tipo !== "ADENDA"));

        // El padre actual puede no estar en el listado (por ejemplo, si está archivado)
        if (padreId && !candidatos.some((c) => c.id === padreId)) {
            try { candidatos.push(await obtenerConvenio(padreId)); } catch { /* se omite */ }
        }
        if (pedido !== pedidoPadres) return; // llegó una respuesta vieja

        select.replaceChildren(
            new Option(candidatos.length ? "Seleccione..." : "No hay convenios disponibles", ""),
            ...candidatos.map((c) => new Option(`${c.codigo} · ${c.titulo}`, c.id)));
        if (padreId) select.value = String(padreId);
    } catch (error) {
        if (pedido !== pedidoPadres) return;
        select.replaceChildren(new Option("No se pudo cargar la lista", ""));
        mostrarAlerta(alertas, error.message);
    }
}

// ---------- Firmantes ----------

function pintarFirmantes(usuarios) {
    const lista = campo("listaFirmantes");
    if (usuarios.length === 0) {
        lista.replaceChildren(crearElemento("p", "mb-0 text-body-secondary", "No hay usuarios activos que puedan firmar."));
        return;
    }
    lista.replaceChildren(...usuarios.map((u) => {
        const casilla = crearElemento("input", "form-check-input");
        casilla.type = "checkbox";
        casilla.id = `firmante-${u.id}`;
        casilla.value = u.id;
        casilla.addEventListener("change", actualizarResumenFirmantes);

        const etiqueta = crearElemento("label", "form-check-label", `${u.apellido}, ${u.nombre} · ${NOMBRES_ROL[u.rol] ?? u.rol}`);
        etiqueta.htmlFor = casilla.id;
        etiqueta.append(" ", crearElemento("small", "text-body-secondary", u.mail));

        const fila = crearElemento("div", "form-check");
        fila.dataset.busqueda = `${u.apellido} ${u.nombre} ${u.mail}`.toLowerCase();
        fila.append(casilla, etiqueta);
        return fila;
    }));
}

// Solo oculta filas: las casillas siguen en la página, así que no se pierde la selección
function filtrarFirmantes() {
    const texto = campo("filtroFirmantes").value.trim().toLowerCase();
    campo("listaFirmantes").querySelectorAll("[data-busqueda]").forEach((fila) => {
        mostrar(fila, fila.dataset.busqueda.includes(texto));
    });
}

const firmantesSeleccionados = () =>
    [...campo("listaFirmantes").querySelectorAll("input:checked")].map((casilla) => Number(casilla.value));

function actualizarResumenFirmantes() {
    const cantidad = firmantesSeleccionados().length;
    campo("resumenFirmantes").textContent = cantidad === 0
        ? "Ningún firmante seleccionado."
        : `${cantidad} ${cantidad === 1 ? "firmante seleccionado" : "firmantes seleccionados"}.`;
    if (cantidad > 0) campo("listaFirmantes").classList.remove("is-invalid");
}

async function cargarFirmantes() {
    const usuarios = await listarUsuarios();
    firmantesDisponibles = usuarios
        .filter((u) => u.activo && ROLES_FIRMANTES.includes(u.rol))
        .sort((a, b) => a.apellido.localeCompare(b.apellido, "es") || a.nombre.localeCompare(b.nombre, "es"));
    pintarFirmantes(firmantesDisponibles);
    actualizarResumenFirmantes();
}

// ---------- Documentos ya cargados (al editar) ----------

async function cargarDocumentosExistentes() {
    const contenedor = campo("documentosExistentes");
    try {
        const documentos = await listarDocumentos(convenioId);
        cantidadDocumentos = documentos.length;
        if (documentos.length === 0) { mostrar(contenedor, false); return; }
        const lista = crearElemento("ul", "list-group mb-1");
        documentos.forEach((d) => {
            const boton = crearElemento("button", "btn btn-sm btn-outline-danger", "Eliminar");
            boton.type = "button";
            boton.setAttribute("aria-label", `Eliminar ${d.nombre}`);
            boton.addEventListener("click", () => pedirEliminacion(d));
            const fila = crearElemento("li", "list-group-item d-flex justify-content-between align-items-center gap-2");
            fila.append(crearElemento("span", "text-break", d.nombre), boton);
            lista.append(fila);
        });
        contenedor.replaceChildren(
            crearElemento("p", "mb-1 fw-semibold", `Documentos ya cargados (${documentos.length})`),
            lista,
            crearElemento("p", "form-text mt-0 mb-0", "Si sube otro archivo, se agrega a los existentes."));
        mostrar(contenedor, true);
    } catch (error) {
        mostrarAlerta(alertas, error.message);
    }
}

// ---------- Eliminar un documento ----------

const modalEliminar = new bootstrap.Modal(campo("modalEliminarDocumento"));
let documentoAEliminar = null;

function pedirEliminacion(documento) {
    documentoAEliminar = documento;
    campo("textoModalEliminar").textContent = `¿Eliminar «${documento.nombre}»? Esta acción no se puede deshacer.`;
    // En un convenio aceptado, eliminar es una modificación: pide motivo y anula las firmas
    mostrar(campo("grupoMotivoEliminar"), estadoConvenio === "ACEPTADO");
    const motivo = campo("motivoEliminar");
    motivo.value = "";
    motivo.classList.remove("is-invalid");
    limpiarAlerta(campo("errorModalEliminar"));
    modalEliminar.show();
}

async function confirmarEliminacion() {
    const aceptado = estadoConvenio === "ACEPTADO";
    const motivo = campo("motivoEliminar").value.trim();
    if (aceptado && !motivo) {
        marcarInvalido("motivoEliminar", "Indique el motivo.");
        campo("motivoEliminar").focus();
        return;
    }
    const boton = campo("botonConfirmarEliminar");
    boton.disabled = true;
    try {
        await eliminarDocumento(documentoAEliminar.id, aceptado ? motivo : null);
        modalEliminar.hide();
        await cargarDocumentosExistentes();
        mostrarAlerta(alertas, aceptado
            ? "Documento eliminado. Se anularon las firmas del convenio."
            : "Documento eliminado.", "success");
    } catch (error) {
        mostrarAlerta(campo("errorModalEliminar"), error.message);
    } finally {
        boton.disabled = false;
    }
}

// ---------- Precarga y modo (nuevo / editar) ----------

// Devuelve false si el convenio no se puede editar (solo Borrador y Aceptado)
async function cargarConvenio(id) {
    const c = await obtenerConvenio(id);
    if (c.estado !== "BORRADOR" && c.estado !== "ACEPTADO") {
        mostrarAlerta(alertas, `No se puede editar un convenio en estado ${nombreEstado(c.estado)}.`, "warning");
        return false;
    }
    convenioId = c.id;
    revision = c.revision;
    estadoConvenio = c.estado;
    codigoConvenio = c.codigo;

    campo("tipo").value = c.tipo;
    campo("subtipo").value = c.subtipo;
    campo("titulo").value = c.titulo ?? "";
    if (!esGestion) campo("unidadId").value = String(c.unidad?.id ?? "");
    campo("organizacion").value = c.organizacion ?? "";
    campo("objeto").value = c.objeto ?? "";
    campo("resolucion").value = c.resolucion ?? "";
    campo("expediente").value = c.expediente ?? "";
    campo("fechaInicio").value = c.fechaInicio ?? "";
    campo("fechaVencimiento").value = c.fechaVencimiento ?? "";
    campo("motivo").value = "";
    campo("archivoPdf").value = "";

    await cargarPadres(c.convenioPadreId);

    const idsFirmantes = new Set((c.listaImplicados ?? []).map((f) => f.usuarioId));
    campo("listaFirmantes").querySelectorAll("input").forEach((casilla) => {
        casilla.checked = idsFirmantes.has(Number(casilla.value));
    });
    actualizarResumenFirmantes();
    const ausentes = [...idsFirmantes].filter((idUsuario) => !firmantesDisponibles.some((u) => u.id === idUsuario));
    if (ausentes.length > 0) {
        mostrarAlerta(alertas, `${ausentes.length === 1 ? "Un firmante asignado ya no está disponible" : `${ausentes.length} firmantes asignados ya no están disponibles`} (usuario inactivo) y se quitará al guardar.`, "warning");
    }

    await cargarDocumentosExistentes();
    return true;
}

function aplicarModo() {
    const editando = convenioId !== null;
    const aceptado = estadoConvenio === "ACEPTADO";
    const titulo = editando ? `Editar ${codigoConvenio}` : "Nuevo convenio";
    campo("tituloPagina").textContent = titulo;
    document.title = `${titulo} | Convenios UNLPam`;
    campo("subtituloPagina").textContent = aceptado ? SUBTITULO_ACEPTADO : SUBTITULO_NUEVO;
    // El código se genera con el tipo y el subtipo: no se pueden cambiar después de crear
    campo("tipo").disabled = editando;
    campo("subtipo").disabled = editando;
    mostrar(campo("avisoTipoFijo"), editando);
    mostrar(campo("grupoMotivo"), aceptado);
    mostrar(botonGuardarAceptar, !aceptado);
    botonGuardar.textContent = aceptado ? "Guardar cambios" : "Guardar borrador";
}

// ---------- Lectura y validación ----------

function leerDatos() {
    const texto = (id) => campo(id).value.trim() || null;
    const tipo = campo("tipo").value;
    const padre = campo("convenioPadreId").value;
    return {
        titulo: campo("titulo").value.trim(),
        tipo,
        subtipo: campo("subtipo").value,
        unidadId: esGestion ? usuarioActual.unidadId : (Number(campo("unidadId").value) || null),
        organizacion: texto("organizacion"),
        objeto: texto("objeto"),
        resolucion: texto("resolucion"),
        expediente: texto("expediente"),
        fechaInicio: campo("fechaInicio").value || null,
        fechaVencimiento: campo("fechaVencimiento").value || null,
        convenioPadreId: (tipo === "ESPECIFICO" || tipo === "ADENDA") && padre ? Number(padre) : null,
        implicadosIds: firmantesSeleccionados(),
    };
}

// Estas validaciones ahorran un viaje: la API las vuelve a comprobar.
// Devuelve los ids de los campos con error.
function validar(datos, archivo, aceptar) {
    const errores = [];
    const marcar = (id, mensaje) => { marcarInvalido(id, mensaje); errores.push(id); };

    if (!datos.titulo) marcar("titulo", "Ingrese el título.");
    if (!datos.tipo) marcar("tipo", "Seleccione el tipo.");
    if (!datos.subtipo) marcar("subtipo", "Seleccione el subtipo.");
    if (!datos.unidadId) marcar("unidadId", "Seleccione la unidad responsable.");
    if (datos.fechaInicio && datos.fechaVencimiento && datos.fechaVencimiento < datos.fechaInicio) {
        marcar("fechaVencimiento", "El vencimiento no puede ser anterior al inicio.");
    }
    if (archivo) {
        if (!archivo.name.toLowerCase().endsWith(".pdf")) marcar("archivoPdf", "Solo se admiten archivos PDF.");
        else if (archivo.size > LIMITE_BYTES) marcar("archivoPdf", "El archivo supera los 20 MB.");
    }
    if (estadoConvenio === "ACEPTADO" && !campo("motivo").value.trim()) {
        marcar("motivo", "Indique el motivo de la modificación.");
    }
    if (aceptar) {
        if (!datos.organizacion) marcar("organizacion", "Es obligatoria para aceptar el convenio.");
        if (!datos.fechaInicio) marcar("fechaInicio", "Es obligatoria para aceptar el convenio.");
        if ((datos.tipo === "ESPECIFICO" || datos.tipo === "ADENDA") && !datos.convenioPadreId) {
            marcar("convenioPadreId", "Elija el convenio padre.");
        }
        if (datos.implicadosIds.length === 0) marcar("listaFirmantes", "Seleccione al menos un firmante.");
        if (!archivo && cantidadDocumentos === 0) marcar("archivoPdf", "Adjunte el PDF del convenio.");
    }
    return errores;
}

// ---------- Guardar ----------

const bloquear = (bloqueado) => { botonGuardar.disabled = bloqueado; botonGuardarAceptar.disabled = bloqueado; };

async function recargarTrasConflicto(mensaje) {
    try {
        const editable = await cargarConvenio(convenioId);
        if (!editable) { mostrar(formulario, false); return; }
        aplicarModo();
        mostrarAlerta(alertas, `${mensaje} Se cargaron los datos más recientes: revíselos y vuelva a aplicar sus cambios.`, "warning");
    } catch (error) {
        mostrarAlerta(alertas, error.message);
    }
}

async function manejarError(error, paso) {
    if (paso === "guardar") {
        // 409: otra persona modificó el convenio (o dejó de ser editable)
        if (error.estado === 409 && convenioId !== null) {
            await recargarTrasConflicto(error.message);
            return;
        }
        const marcados = aplicarDetalles(error.detalles);
        mostrarAlerta(alertas, marcados > 0 ? "Revise los datos marcados en el formulario." : error.message);
        return;
    }
    // A partir de acá el convenio ya existe como borrador: se sigue editando el mismo
    if (paso === "pdf") {
        mostrarAlerta(alertas, `El convenio se guardó como ${codigoConvenio}, pero no se pudo subir el PDF: ${error.message} Elija el archivo y vuelva a guardar.`, "warning");
        return;
    }
    mostrarAlerta(alertas, `El convenio se guardó como ${codigoConvenio}, pero no se pudo aceptar: ${error.message}`, "warning");
}

async function guardar(aceptar) {
    limpiarAlerta(alertas);
    limpiarErrores();

    const datos = leerDatos();
    const archivo = campo("archivoPdf").files[0] ?? null;
    const errores = validar(datos, archivo, aceptar);
    if (errores.length > 0) {
        mostrarAlerta(alertas, "Revise los datos marcados en el formulario.", "warning");
        campo(errores[0]).focus();
        return;
    }

    bloquear(true);
    let paso = "guardar";
    try {
        const cuerpo = convenioId === null
            ? datos
            : { ...datos, revision, motivo: campo("motivo").value.trim() || null };
        const convenio = convenioId === null
            ? await crearConvenio(cuerpo)
            : await actualizarConvenio(convenioId, cuerpo);

        // Se recuerda lo guardado: si falla un paso siguiente, "guardar" de nuevo edita este mismo convenio
        convenioId = convenio.id;
        revision = convenio.revision;
        estadoConvenio = convenio.estado;
        codigoConvenio = convenio.codigo;
        aplicarModo();

        if (archivo) {
            paso = "pdf";
            await subirDocumento(convenio.id, archivo);
            campo("archivoPdf").value = "";
            cantidadDocumentos++;
            await cargarDocumentosExistentes(); // la lista muestra el archivo recién subido
        }
        if (aceptar) {
            paso = "aceptar";
            await aceptarConvenio(convenio.id);
        }
        location.href = `convenio.html?id=${convenio.id}`;
    } catch (error) {
        await manejarError(error, paso);
    } finally {
        bloquear(false);
    }
}

// ---------- Inicio ----------

async function iniciar() {
    const editando = idParametro !== null;
    dibujarLayout(editando ? "convenios" : "nuevo");
    activarBotonVolver(campo("botonVolver"), "convenios.html");
    activarBotonVolver(campo("botonCancelar"), "convenios.html");

    if (editando && !/^\d+$/.test(idParametro)) {
        mostrar(campo("cargando"), false);
        mostrarAlerta(alertas, "No se indicó qué convenio editar. Vuelva al listado y elija uno.", "warning");
        return;
    }

    try {
        await Promise.all([cargarUnidades(), cargarFirmantes()]);
        if (editando && !(await cargarConvenio(idParametro))) {
            mostrar(campo("cargando"), false);
            return; // cargarConvenio ya explicó por qué no se puede editar
        }
    } catch (error) {
        mostrar(campo("cargando"), false);
        mostrarAlerta(alertas, error.message);
        return;
    }

    aplicarModo();
    campo("tipo").addEventListener("change", () => cargarPadres());
    campo("subtipo").addEventListener("change", () => cargarPadres());
    campo("filtroFirmantes").addEventListener("input", filtrarFirmantes);
    // Al corregir un campo se le quita la marca de error
    formulario.addEventListener("input", (evento) => evento.target.classList.remove("is-invalid"));
    formulario.addEventListener("submit", (evento) => { evento.preventDefault(); guardar(false); });
    botonGuardarAceptar.addEventListener("click", () => guardar(true));
    campo("botonConfirmarEliminar").addEventListener("click", confirmarEliminacion);
    campo("motivoEliminar").addEventListener("input", (evento) => evento.target.classList.remove("is-invalid"));

    mostrar(campo("cargando"), false);
    mostrar(formulario, true);
}

if (exigirSesion()) iniciar();