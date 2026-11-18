import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerConvenio, actualizarConvenio, crearConvenio, subirDocumento,
         listarConvenios, listarUnidades, listarUsuarios } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, esConsulta, volverAtras, activarBotonVolver } from "../ui.js";
import { parametroUrl, crearElemento } from "../utils.js";

const TIPOS = {
    MARCO:      { nombre: "Marco",      seccion: "camposMarco",      prefijo: "m-" },
    ESPECIFICO: { nombre: "Específico", seccion: "camposEspecifico", prefijo: "e-" },
};
const LIMITE_BYTES = 20 * 1024 * 1024;

const campo = (id) => document.getElementById(id);
const idEdicion = parametroUrl("id");
const editando = idEdicion !== null;

const idPadreAdenda = parametroUrl("padre");
const creandoAdenda = !editando && idPadreAdenda !== null;
let padreAdenda = null;

let tipoActual = null;
let modalTipo;
let convenio = null; 
let usuarioSesion;
let candidatosFirmantes = []; 

const tipoEfectivo = () => (editando ? (convenio.tipo === "MARCO" ? "MARCO" : "ESPECIFICO") : tipoActual);
const valorDe = (nombre) => campo((tipoEfectivo() === "MARCO" ? "m-" : "e-") + nombre);

function dibujarFirmantes(contenedor, usuarios, { marcados = [], deshabilitado = false } = {}) {
    contenedor.replaceChildren();
    if (usuarios.length === 0) {
        contenedor.append(crearElemento("p", "vacio", "No hay usuarios de consulta disponibles."));
        return;
    }
    for (const u of usuarios) {
        const id = `${contenedor.id}-${u.id}`;
        const casilla = crearElemento("input", "form-check-input");
        casilla.type = "checkbox";
        casilla.id = id;
        casilla.value = u.id;
        casilla.checked = marcados.includes(u.id);
        casilla.disabled = deshabilitado;
        const etiqueta = crearElemento("label", "form-check-label", u.nombre);
        etiqueta.htmlFor = id;
        const fila = crearElemento("div", "form-check");
        fila.append(casilla, etiqueta);
        contenedor.append(fila);
    }
}

const firmantesElegidos = (contenedor) =>
    [...contenedor.querySelectorAll("input:checked")].map((c) => Number(c.value));

// Marcos del mismo subtipo que se pueden elegir como padre de un específico
async function cargarMarcos() {
    const selector = campo("e-marco");
    const subtipo = campo("subtipo").value;
    selector.replaceChildren(new Option("Seleccionar", ""));
    if (!subtipo) return;
    try {
        const pagina = await listarConvenios({ tipo: "MARCO", subtipo, tamanio: 200 });
        for (const m of pagina.content ?? []) selector.append(new Option(`${m.codigo} · ${m.titulo}`, m.id));
    } catch (error) {
        mostrarAlerta(campo("alertas"), `No se pudieron cargar los marcos: ${error.message}`);
    }
}

// Solo pueden firmar usuarios activos de consulta (la API lo vuelve a comprobar)
const filtrarFirmantes = (usuarios) => usuarios
    .filter((u) => u.activo && !["ADMINISTRACION", "GESTION"].includes(u.rol))
    .map((u) => ({ id: u.id, nombre: `${u.nombre} ${u.apellido}` }));

// ---------- Crear ----------

function elegirTipo(tipo) {
    tipoActual = tipo;
    campo("tipoElegido").textContent = TIPOS[tipo].nombre;
    for (const [clave, datos] of Object.entries(TIPOS)) campo(datos.seccion).hidden = clave !== tipo;
    campo("formularioConvenio").hidden = false;
    modalTipo.hide();
}

// Reglas que la API vuelve a comprobar; acá solo se evita un viaje
function validar() {
    const aviso = (mensaje) => { mostrarAlerta(campo("alertas"), mensaje, "warning"); campo("alertas").scrollIntoView({ block: "nearest" }); return false; };
    if (!valorDe("nombre").value.trim()) return aviso("Ingrese el nombre del convenio.");
    if (!editando && !campo("subtipo").value) return aviso("Seleccione el subtipo.");
    if (!editando && !creandoAdenda && usuarioSesion.rol === "ADMINISTRACION" && !campo("unidad").value) return aviso("Seleccione la unidad responsable.");
    if (!editando && tipoActual === "ESPECIFICO" && !campo("e-marco").value) return aviso("Seleccione el marco del que extiende.");
    const inicio = valorDe("inicio").value, fin = valorDe("vencimiento").value;
    if (inicio && fin && fin < inicio) return aviso("La fecha de vencimiento no puede ser anterior a la de inicio.");
    if (editando && convenio.estado === "ACEPTADO" && !campo("motivo").value.trim()) return aviso("Indique el motivo de la modificación.");
    const archivo = valorDe("pdf").files[0];
    if (archivo && !archivo.name.toLowerCase().endsWith(".pdf")) return aviso("Solo se admiten archivos PDF.");
    if (archivo && archivo.size > LIMITE_BYTES) return aviso("El archivo supera los 20 MB.");
    return true;
}

function solicitudNueva() {
    return {
        titulo: valorDe("nombre").value.trim(),
        tipo: tipoActual,
        subtipo: campo("subtipo").value,
        // Gestión trabaja siempre en su unidad: la API la toma del usuario
        unidadId: creandoAdenda ? padreAdenda.unidad.id
            : usuarioSesion.rol === "ADMINISTRACION" ? Number(campo("unidad").value) : usuarioSesion.unidadId ?? null,
        organizacion: valorDe("partes").value.trim() || null,
        fechaInicio: valorDe("inicio").value || null,
        fechaVencimiento: valorDe("vencimiento").value || null,
        convenioPadreId: tipoActual === "MARCO" ? null : Number(campo("e-marco").value),
        implicadosIds: firmantesElegidos(valorDe("firmantes")),
    };
}

// ---------- Editar ----------

function cargarFormulario(c) {
    const esMarco = c.tipo === "MARCO";
    campo("tipoElegido").textContent = (esMarco ? "Marco" : c.tipo === "ADENDA" ? "Adenda" : "Específico");
    campo("camposMarco").hidden = !esMarco;
    campo("camposEspecifico").hidden = esMarco;
    campo("botonCambiarTipo").hidden = true; // la API no permite cambiar el tipo de un convenio existente

    // Subtipo y unidad no se cambian al editar (el subtipo forma parte del código)
    campo("subtipo").value = c.subtipo;
    campo("subtipo").disabled = true;

    valorDe("nombre").value = c.titulo ?? "";
    valorDe("codigo").placeholder = "";
    valorDe("codigo").value = c.codigo ?? "";
    valorDe("inicio").value = c.fechaInicio ?? "";
    valorDe("vencimiento").value = c.fechaVencimiento ?? "";
    valorDe("partes").value = c.organizacion ?? "";

    // Los firmantes se pueden cambiar
    const actuales = (c.listaImplicados ?? []).map((f) => ({ id: f.usuarioId, nombre: f.usuarioNombre }));
    const idsCandidatos = new Set(candidatosFirmantes.map((u) => u.id));
    const opciones = [...candidatosFirmantes, ...actuales.filter((f) => !idsCandidatos.has(f.id))];
    dibujarFirmantes(valorDe("firmantes"), opciones, { marcados: actuales.map((f) => f.id) });

    if (!esMarco) {
        const selector = campo("e-marco");
        selector.replaceChildren(new Option(c.convenioPadreId ? `Convenio n.º ${c.convenioPadreId}` : "—", c.convenioPadreId ?? ""));
        selector.disabled = true;
        if (c.convenioPadreId) {
            obtenerConvenio(c.convenioPadreId)
                .then((padre) => { selector.options[0].text = `${padre.codigo} · ${padre.titulo}`; })
                .catch(() => { /* queda el número */ });
        }
    }
    campo("campoMotivo").hidden = c.estado !== "ACEPTADO";
    campo("formularioConvenio").hidden = false;
}

function solicitudEdicion() {
    return {
        titulo: valorDe("nombre").value.trim(),
        tipo: convenio.tipo,
        subtipo: convenio.subtipo,
        unidadId: convenio.unidad.id,
        organizacion: valorDe("partes").value.trim() || null,
        objeto: convenio.objeto,
        resolucion: convenio.resolucion,
        expediente: convenio.expediente,
        fechaInicio: valorDe("inicio").value || null,
        fechaVencimiento: valorDe("vencimiento").value || null,
        convenioPadreId: convenio.convenioPadreId,
        implicadosIds: firmantesElegidos(valorDe("firmantes")),
        revision: convenio.revision,
        motivo: convenio.estado === "ACEPTADO" ? campo("motivo").value.trim() : null,
    };
}

// ---------- Guardar (crear o editar) ----------

async function guardar(evento) {
    evento.preventDefault();
    const alertas = campo("alertas");
    limpiarAlerta(alertas);
    if (!validar()) return;

    const boton = campo("botonGuardar");
    boton.disabled = true;
    let id = idEdicion;
    try {
        if (editando) await actualizarConvenio(idEdicion, solicitudEdicion());
        else id = (await crearConvenio(solicitudNueva())).id;
    } catch (error) {
        boton.disabled = false;
        const desactualizado = error.codigo === "VERSION_DESACTUALIZADA";
        mostrarAlerta(alertas, desactualizado ? `${error.message}. Recargue la página y vuelva a intentar.` : error.message);
        alertas.scrollIntoView({ block: "nearest" });
        return;
    }
    // Los datos ya quedaron guardados: si falla solo el PDF, se avisa y se ofrece seguir en la ficha
    const archivo = valorDe("pdf").files[0];
    if (archivo) {
        try { await subirDocumento(id, archivo); }
        catch (error) {
            mostrarAlerta(alertas, `El convenio se guardó, pero no se pudo subir el PDF: ${error.message}. Podrá adjuntarlo desde la ficha.`, "warning");
            setTimeout(() => { location.href = `convenio.html?id=${id}`; }, 3500);
            return;
        }
    }
    location.href = `convenio.html?id=${id}`;
}

// ---------- Inicio ----------

async function prepararCreacion() {
    campo("campoUnidad").hidden = usuarioSesion.rol !== "ADMINISTRACION";
    campo("subtipo").addEventListener("change", cargarMarcos);

    modalTipo = new bootstrap.Modal(campo("modalTipo"));
    document.querySelectorAll(".opcion-tipo").forEach((boton) =>
        boton.addEventListener("click", () => elegirTipo(boton.dataset.tipo)));
    campo("botonCambiarTipo").addEventListener("click", () => modalTipo.show());
    // Sin tipo elegido no hay formulario: cancelar vuelve atrás. Con un tipo ya elegido, solo cierra la ventana.
    campo("cancelarModal").addEventListener("click", () => (tipoActual ? modalTipo.hide() : volverAtras("convenios.html")));
    modalTipo.show();

    // Datos para los selectores; si algo falla, se avisa y el resto del formulario sigue
    const [unidades, usuarios] = await Promise.allSettled([
        usuarioSesion.rol === "ADMINISTRACION" ? listarUnidades() : Promise.resolve([]),
        listarUsuarios(),
    ]);
    if (unidades.status === "fulfilled") {
        for (const u of unidades.value) campo("unidad").append(new Option(u.nombre, u.id));
    }
    if (usuarios.status === "fulfilled") {
        // Solo pueden firmar usuarios activos de consulta
        candidatosFirmantes = filtrarFirmantes(usuarios.value);
    }
    for (const t of Object.values(TIPOS)) dibujarFirmantes(campo(`${t.prefijo}firmantes`), candidatosFirmantes);
    const fallo = [unidades, usuarios].find((r) => r.status === "rejected");
    if (fallo) mostrarAlerta(campo("alertas"), `No se pudo cargar parte de los datos: ${fallo.reason.message}`);
}

//Adenda
async function prepararAdenda() {
    document.title = "Crear adenda | Convenios UNLPam";
    campo("tituloPagina").textContent = "Crear adenda";
    campo("subtituloPagina").textContent =
        "La adenda es un instrumento nuevo, con código propio, que modifica al convenio elegido sin reemplazarlo.";

    if (!/^\d+$/.test(idPadreAdenda)) {
        mostrarAlerta(campo("alertas"), "No se indicó qué convenio modifica la adenda. Vuelva a la ficha y elija uno.", "warning");
        return;
    }
    let usuarios;
    try {
        // Promise.all (no allSettled): sin el convenio padre no hay adenda posible
        [padreAdenda, usuarios] = await Promise.all([obtenerConvenio(idPadreAdenda), listarUsuarios()]);
    } catch (error) {
        mostrarAlerta(campo("alertas"), error.message);
        return;
    }
    // Regla de la web: la adenda modifica un convenio vigente (la API no lo exige)
    if (padreAdenda.estado !== "FIRMADO") {
        mostrarAlerta(campo("alertas"), "Solo se pueden crear adendas de convenios Firmados.", "warning");
        return;
    }

    tipoActual = "ADENDA";
    campo("tipoElegido").textContent = "Adenda";
    campo("camposMarco").hidden = true;
    campo("camposEspecifico").hidden = false;
    campo("botonCambiarTipo").hidden = true;

    // Subtipo y unidad se heredan del convenio que se modifica
    campo("subtipo").value = padreAdenda.subtipo;
    campo("subtipo").disabled = true;
    const selector = campo("e-marco");
    selector.replaceChildren(new Option(`${padreAdenda.codigo} · ${padreAdenda.titulo}`, padreAdenda.id));
    selector.disabled = true;
    document.querySelector('label[for="e-marco"]').textContent = "Convenio que modifica";
    campo("ayudaMarco").textContent = "La adenda queda vinculada a este convenio, que sigue vigente.";
    valorDe("partes").value = padreAdenda.organizacion ?? "";

    // Se proponen los firmantes del convenio original; se pueden cambiar
    candidatosFirmantes = filtrarFirmantes(usuarios);
    const delPadre = (padreAdenda.listaImplicados ?? []).map((f) => f.usuarioId);
    dibujarFirmantes(campo("e-firmantes"), candidatosFirmantes, { marcados: delPadre });
    campo("formularioConvenio").hidden = false;
}

async function prepararEdicion() {
    campo("tituloPagina").textContent = "Editar convenio";
    campo("subtituloPagina").textContent = "Modificá los datos del convenio. Los cambios se aplican al guardar.";
    campo("botonGuardar").textContent = "Guardar cambios";
    document.title = "Editar convenio | Convenios UNLPam";
    document.querySelectorAll(".zona-ayuda").forEach((e) => { e.textContent = "Opcional: se agrega a los documentos del convenio"; });

    if (!/^\d+$/.test(idEdicion)) {
        mostrarAlerta(campo("alertas"), "No se indicó qué convenio editar. Vuelva al listado y elija uno.", "warning");
        return;
    }
    try {
        convenio = await obtenerConvenio(idEdicion);
    } catch (error) {
        mostrarAlerta(campo("alertas"), error.message);
        return;
    }
    if (convenio.estado !== "BORRADOR" && convenio.estado !== "ACEPTADO") {
        mostrarAlerta(campo("alertas"), "Solo se pueden editar convenios en Borrador o Aceptados.", "warning");
        return;
    }
    try {
        candidatosFirmantes = filtrarFirmantes(await listarUsuarios());
    } catch { /* sin la lista se muestran solo los firmantes actuales */ }
    cargarFormulario(convenio);
}

function iniciar() {
    usuarioSesion = obtenerUsuario();
    // Consulta no crea ni edita convenios
    if (esConsulta(usuarioSesion?.rol)) { location.replace("convenios.html"); return; }
    // En los formularios no hay menú de navegación; el resto del encabezado y el pie son los de siempre
    dibujarLayout("convenios", { menu: false });

    activarBotonVolver(campo("botonVolver"), "convenios.html");
    activarBotonVolver(campo("botonCancelar"), "convenios.html");
    campo("formularioConvenio").addEventListener("submit", guardar);
    campo("formularioConvenio").addEventListener("input", () => limpiarAlerta(campo("alertas")));

    if (editando) prepararEdicion();
    else if (creandoAdenda) prepararAdenda();
    else prepararCreacion();
}

if (exigirSesion()) iniciar();
