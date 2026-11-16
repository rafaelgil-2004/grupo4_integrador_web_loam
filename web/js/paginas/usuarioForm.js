// Página: usuario-form.html (registrar y editar usuario)
// Sin ?id= registra; con ?id= abre el formulario con los datos cargados y permite modificarlos.
// Solo Administración. Las reglas de validación repiten las de la API (que las vuelve a comprobar).
import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { listarUsuarios, listarUnidades, crearUsuario, actualizarUsuario } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, activarBotonVolver } from "../ui.js";
import { parametroUrl } from "../utils.js";

const MIN_PASSWORD = 8;
const campo = (id) => document.getElementById(id);
const idEdicion = parametroUrl("id");
const editando = idEdicion !== null;

// ---------- Errores por campo ----------

function marcarError(id, mensaje) {
    const entrada = campo(id);
    entrada.classList.add("is-invalid");
    let aviso = entrada.parentElement.querySelector(".invalid-feedback");
    if (!aviso) {
        aviso = document.createElement("div");
        aviso.className = "invalid-feedback";
        entrada.parentElement.append(aviso);
    }
    aviso.textContent = mensaje;
}

function limpiarErrores() {
    document.querySelectorAll("#formularioUsuario .is-invalid").forEach((e) => e.classList.remove("is-invalid"));
}

// ---------- Unidad según el rol ----------

// Administración nunca lleva unidad; Gestión la necesita; el resto es opcional
function ajustarUnidad() {
    const rol = campo("rol").value;
    const selector = campo("unidadId");
    selector.disabled = rol === "ADMINISTRACION";
    if (selector.disabled) selector.value = "";
    selector.required = rol === "GESTION";
}

// ---------- Validación ----------

function validar() {
    limpiarErrores();
    let valido = true;
    const falla = (id, mensaje) => { marcarError(id, mensaje); valido = false; };

    if (!campo("nombre").value.trim()) falla("nombre", "Ingrese el nombre.");
    if (!campo("apellido").value.trim()) falla("apellido", "Ingrese el apellido.");

    const mail = campo("mail").value.trim();
    if (!mail) falla("mail", "Ingrese el email.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) falla("mail", "Ingrese un email válido.");

    if (!campo("rol").value) falla("rol", "Seleccione un rol.");
    if (campo("rol").value === "GESTION" && !campo("unidadId").value) falla("unidadId", "Un usuario de Gestión necesita unidad.");

    const password = campo("password").value;
    if (!editando && !password) falla("password", "Ingrese una contraseña inicial.");
    else if (password && password.length < MIN_PASSWORD) falla("password", `Debe tener al menos ${MIN_PASSWORD} caracteres.`);

    return valido;
}

function armarSolicitud() {
    const rol = campo("rol").value;
    const datos = {
        nombre: campo("nombre").value.trim(),
        apellido: campo("apellido").value.trim(),
        mail: campo("mail").value.trim(),
        rol,
        unidadId: rol === "ADMINISTRACION" || !campo("unidadId").value ? null : Number(campo("unidadId").value),
    };
    // Al editar, sin contraseña la API conserva la actual
    if (campo("password").value) datos.password = campo("password").value;
    return datos;
}

// ---------- Guardar ----------

async function guardar(evento) {
    evento.preventDefault();
    limpiarAlerta(campo("alertas"));
    if (!validar()) {
        document.querySelector("#formularioUsuario .is-invalid")?.focus();
        return;
    }
    const boton = campo("botonGuardar");
    boton.disabled = true;
    try {
        const datos = armarSolicitud();
        if (editando) await actualizarUsuario(idEdicion, datos);
        else await crearUsuario(datos);
        location.href = `usuarios.html?ok=${editando ? "editado" : "creado"}`;
    } catch (error) {
        boton.disabled = false;
        if (error.codigo === "MAIL_DUPLICADO") marcarError("mail", error.message);
        // Errores por campo de un 400 (los nombres coinciden con los ids del formulario)
        for (const [nombre, mensaje] of Object.entries(error.detalles ?? {})) if (campo(nombre)) marcarError(nombre, mensaje);
        mostrarAlerta(campo("alertas"), error.message);
        campo("alertas").scrollIntoView({ block: "nearest" });
    }
}

// ---------- Carga de datos ----------

async function cargarUnidades() {
    for (const unidad of await listarUnidades()) campo("unidadId").append(new Option(unidad.nombre, unidad.id));
}

async function cargarUsuario() {
    // La API no tiene "obtener uno": se toma del listado (Administración recibe todos)
    const usuario = (await listarUsuarios()).find((u) => String(u.id) === idEdicion);
    if (!usuario) throw new Error("No se encontró el usuario que se quiere editar.");
    campo("nombre").value = usuario.nombre;
    campo("apellido").value = usuario.apellido;
    campo("mail").value = usuario.mail;
    campo("rol").value = usuario.rol;
    ajustarUnidad();
    campo("unidadId").value = usuario.unidadId ?? "";
}

function prepararModoEdicion() {
    document.title = "Editar usuario | Convenios UNLPam";
    campo("tituloPagina").textContent = "Editar usuario";
    campo("subtituloPagina").textContent = "Modificá los datos de la persona. Los cambios se aplican al guardar.";
    campo("botonGuardar").textContent = "Guardar cambios";
    campo("etiquetaPassword").textContent = "Contraseña";
    campo("ayudaPassword").textContent = `Dejala vacía para conservar la actual. Si la cambiás: mínimo ${MIN_PASSWORD} caracteres.`;
}

async function iniciar() {
    // Solo Administración registra y edita usuarios
    if (obtenerUsuario()?.rol !== "ADMINISTRACION") { location.replace("convenios.html"); return; }
    dibujarLayout("usuarios", { menu: false }); // formulario: sin menú de navegación

    activarBotonVolver(campo("botonVolver"), "usuarios.html");
    activarBotonVolver(campo("botonCancelar"), "usuarios.html");

    if (editando && !/^\d+$/.test(idEdicion)) {
        campo("formularioUsuario").hidden = true;
        mostrarAlerta(campo("alertas"), "No se indicó qué usuario editar. Vuelva al listado y elija uno.", "warning");
        return;
    }
    if (editando) prepararModoEdicion();

    campo("rol").addEventListener("change", ajustarUnidad);
    campo("formularioUsuario").addEventListener("submit", guardar);
    campo("formularioUsuario").addEventListener("input", (e) => e.target.classList.remove("is-invalid"));
    ajustarUnidad();

    try {
        await cargarUnidades();
        if (editando) await cargarUsuario();
    } catch (error) {
        mostrarAlerta(campo("alertas"), error.message);
        if (editando) campo("formularioUsuario").hidden = true;
    }
}

if (exigirSesion()) iniciar();
