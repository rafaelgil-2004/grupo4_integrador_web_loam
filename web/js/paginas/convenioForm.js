// Página: convenio-form.html
// - Sin ?id=: pantalla "Crear convenio". SOLO VISUAL: elige el tipo y muestra los campos; no guarda todavía.
// - Con ?id=: EDITAR. Abre el formulario con los datos del convenio cargados, permite modificarlos y
//   guarda con la API (control de revisión, motivo si está Aceptado y PDF opcional).
import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerConvenio, actualizarConvenio, subirDocumento } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, esConsulta, volverAtras, activarBotonVolver } from "../ui.js";
import { parametroUrl } from "../utils.js";

const TIPOS = {
    MARCO:      { nombre: "Marco",      seccion: "camposMarco" },
    ESPECIFICO: { nombre: "Específico", seccion: "camposEspecifico" },
};

const campo = (id) => document.getElementById(id);
let tipoActual = null;
let modalTipo;

// ---------- Edición ----------

const idEdicion = parametroUrl("id");
const editando = idEdicion !== null;
const LIMITE_BYTES = 20 * 1024 * 1024;
let convenio = null; // lo que devolvió la API: de acá salen la revisión y los datos que el formulario no muestra

const prefijo = () => (convenio.tipo === "MARCO" ? "m-" : "e-"); // los campos de cada sección tienen su prefijo
const valorDe = (nombre) => campo(prefijo() + nombre);

function cargarFormulario(c) {
    const esMarco = c.tipo === "MARCO";
    campo("tipoElegido").textContent = TIPOS[esMarco ? "MARCO" : "ESPECIFICO"].nombre + (c.tipo === "ADENDA" ? " (adenda)" : "");
    campo("camposMarco").hidden = !esMarco;
    campo("camposEspecifico").hidden = esMarco;
    campo("botonCambiarTipo").hidden = true; // la API no permite cambiar el tipo de un convenio existente

    valorDe("nombre").value = c.titulo ?? "";
    valorDe("codigo").value = c.codigo ?? "";
    valorDe("codigo").readOnly = true; // lo genera la API
    valorDe("inicio").value = c.fechaInicio ?? "";
    valorDe("vencimiento").value = c.fechaVencimiento ?? "";
    valorDe("partes").value = c.organizacion ?? "";
    if (!esMarco) {
        // Estos dos no se editan acá: se muestran para consulta y se conservan tal cual
        campo("e-marco").value = c.convenioPadreId ? `Convenio n.º ${c.convenioPadreId}` : "";
        campo("e-marco").readOnly = true;
        campo("e-firmantes").value = (c.listaImplicados ?? []).map((f) => f.usuarioNombre).join(", ");
        campo("e-firmantes").readOnly = true;
        if (c.convenioPadreId) {
            obtenerConvenio(c.convenioPadreId)
                .then((padre) => { campo("e-marco").value = `${padre.codigo} · ${padre.titulo}`; })
                .catch(() => { /* queda el número */ });
        }
    }
    campo("campoMotivo").hidden = c.estado !== "ACEPTADO";
    campo("formularioConvenio").hidden = false;
}

function armarSolicitud() {
    return {
        titulo: valorDe("nombre").value.trim(),
        tipo: convenio.tipo,
        subtipo: convenio.subtipo,
        unidadId: convenio.unidad.id,
        organizacion: valorDe("partes").value.trim() || null,
        // Los que este formulario no muestra se reenvían como estaban, para no borrarlos
        objeto: convenio.objeto,
        resolucion: convenio.resolucion,
        expediente: convenio.expediente,
        fechaInicio: valorDe("inicio").value || null,
        fechaVencimiento: valorDe("vencimiento").value || null,
        convenioPadreId: convenio.convenioPadreId,
        // implicadosIds no se envía: la API conserva los firmantes actuales
        revision: convenio.revision,
        motivo: convenio.estado === "ACEPTADO" ? campo("motivo").value.trim() : null,
    };
}

async function guardarEdicion(evento) {
    evento.preventDefault();
    const alertas = campo("alertas");
    limpiarAlerta(alertas);
    const aviso = (mensaje) => { mostrarAlerta(alertas, mensaje, "warning"); alertas.scrollIntoView({ block: "nearest" }); };

    if (!valorDe("nombre").value.trim()) return aviso("Ingrese el nombre del convenio.");
    const inicio = valorDe("inicio").value, fin = valorDe("vencimiento").value;
    if (inicio && fin && fin < inicio) return aviso("La fecha de vencimiento no puede ser anterior a la de inicio.");
    if (convenio.estado === "ACEPTADO" && !campo("motivo").value.trim()) return aviso("Indique el motivo de la modificación.");
    const archivo = valorDe("pdf").files[0];
    if (archivo && !archivo.name.toLowerCase().endsWith(".pdf")) return aviso("Solo se admiten archivos PDF.");
    if (archivo && archivo.size > LIMITE_BYTES) return aviso("El archivo supera los 20 MB.");

    const boton = campo("botonGuardar");
    boton.disabled = true;
    try {
        await actualizarConvenio(idEdicion, armarSolicitud());
    } catch (error) {
        boton.disabled = false;
        const desactualizado = error.codigo === "VERSION_DESACTUALIZADA";
        mostrarAlerta(alertas, desactualizado ? `${error.message}. Recargue la página y vuelva a intentar.` : error.message);
        alertas.scrollIntoView({ block: "nearest" });
        return;
    }
    // Los datos ya quedaron guardados: si falla solo el PDF, se avisa sin perder el resto
    if (archivo) {
        try { await subirDocumento(idEdicion, archivo); }
        catch (error) {
            boton.disabled = false;
            mostrarAlerta(alertas, `El convenio se guardó, pero no se pudo subir el PDF: ${error.message}`, "warning");
            return;
        }
    }
    location.href = `convenio.html?id=${idEdicion}`;
}

async function iniciarEdicion() {
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
    cargarFormulario(convenio);
    campo("formularioConvenio").addEventListener("submit", guardarEdicion);
    campo("formularioConvenio").addEventListener("input", () => limpiarAlerta(campo("alertas")));
}

function elegirTipo(tipo) {
    tipoActual = tipo;
    campo("tipoElegido").textContent = TIPOS[tipo].nombre;
    for (const [clave, datos] of Object.entries(TIPOS)) campo(datos.seccion).hidden = clave !== tipo;
    campo("formularioConvenio").hidden = false;
    modalTipo.hide();
}

function iniciar() {
    // Consulta no crea convenios
    if (esConsulta(obtenerUsuario()?.rol)) { location.replace("convenios.html"); return; }
    // En los formularios no hay menú de navegación; el resto del encabezado y el pie son los de siempre
    dibujarLayout("convenios", { menu: false });

    activarBotonVolver(campo("botonVolver"), "convenios.html");
    activarBotonVolver(campo("botonCancelar"), "convenios.html");

    if (editando) { iniciarEdicion(); return; } // sin modal de tipo: el convenio ya tiene el suyo

    modalTipo = new bootstrap.Modal(campo("modalTipo"));
    document.querySelectorAll(".opcion-tipo").forEach((boton) =>
        boton.addEventListener("click", () => elegirTipo(boton.dataset.tipo)));
    campo("botonCambiarTipo").addEventListener("click", () => modalTipo.show());
    // Sin tipo elegido no hay formulario: cancelar vuelve atrás. Con un tipo ya elegido, solo cierra la ventana.
    campo("cancelarModal").addEventListener("click", () => (tipoActual ? modalTipo.hide() : volverAtras("convenios.html")));

    campo("formularioConvenio").addEventListener("submit", (evento) => {
        evento.preventDefault();
        mostrarAlerta(campo("alertas"), "Pantalla de maqueta: todavía no guarda el convenio.", "info");
        campo("alertas").scrollIntoView({ block: "nearest" });
    });
    campo("formularioConvenio").addEventListener("input", () => limpiarAlerta(campo("alertas")));

    modalTipo.show();
}

if (exigirSesion()) iniciar();
