import { exigirSesion, obtenerUsuario, obtenerToken, guardarSesion } from "../sesion.js";
import { listarUsuarios, listarUnidades, crearUsuario, actualizarUsuario,
         cambiarActivoUsuario } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta, activarBotonVolver } from "../ui.js";
import { crearElemento } from "../utils.js";

const NOMBRES_ROL = {
    ADMINISTRACION: "Administración", GESTION: "Gestión",
    ESTUDIANTE: "Estudiante", PROFESOR: "Profesor", DECANO: "Decano",
};

const alertas = document.getElementById("alertas");
const resultados = document.getElementById("resultados");
const cuerpoTabla = document.getElementById("cuerpoTabla");
const filtros = document.getElementById("formularioFiltros");
const formulario = document.getElementById("formularioUsuario");
const campo = (id) => document.getElementById(id);
const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);

const modalUsuario = new bootstrap.Modal(campo("modalUsuario"));
const modalDesactivar = new bootstrap.Modal(campo("modalDesactivar"));

let usuarioActual;        // el administrador que tiene la sesión abierta
let usuarios = [];        // lo último que devolvió la API (con el filtro de estado ya aplicado)
let editando = null;      // usuario que se edita en el modal (null = alta)
let aDesactivar = null;   // usuario pendiente de confirmar
let ultimaBusqueda = 0;

// ---------- Listado ----------

async function cargar() {
    // Igual que en convenios.js: una respuesta lenta de una búsqueda vieja no pisa a la nueva
    const numero = ++ultimaBusqueda;
    limpiarAlerta(alertas);
    marcarCargando(true);
    try {
        const filtrosApi = {};
        if (filtros.elements.q.value.trim()) filtrosApi.q = filtros.elements.q.value.trim();
        if (filtros.elements.rol.value) filtrosApi.rol = filtros.elements.rol.value;
        const lista = await listarUsuarios(filtrosApi);
        if (numero !== ultimaBusqueda) return;

        // El estado se filtra acá: la API no lo recibe como parámetro
        const estado = filtros.elements.estado.value;
        usuarios = lista
            .filter((u) => estado === "" || (estado === "activos") === Boolean(u.activo))
            .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"));
        pintarTabla();
    } catch (error) {
        if (numero === ultimaBusqueda) mostrarAlerta(alertas, error.message);
    } finally {
        if (numero === ultimaBusqueda) marcarCargando(false);
    }
}

function marcarCargando(cargando) {
    resultados.setAttribute("aria-busy", String(cargando));
    mostrar(campo("cargando"), cargando);
    if (cargando) mostrar(campo("sinResultados"), false);
}

function crearFila(u) {
    const esYo = u.id === usuarioActual.id;
    const fila = crearElemento("tr", u.activo ? "" : "text-body-secondary");

    const celdaEstado = crearElemento("td");
    celdaEstado.append(crearElemento("span",
        `badge ${u.activo ? "text-bg-success" : "text-bg-secondary"}`, u.activo ? "Activo" : "Inactivo"));

    const nombreCompleto = `${u.apellido}, ${u.nombre}`;
    const editar = crearElemento("button", "btn btn-sm btn-outline-secondary", "Editar");
    editar.type = "button";
    editar.setAttribute("aria-label", `Editar a ${nombreCompleto}`);
    editar.addEventListener("click", () => abrirFormulario(u));

    const cambiar = crearElemento("button",
        `btn btn-sm ${u.activo ? "btn-outline-danger" : "btn-outline-success"}`,
        u.activo ? "Desactivar" : "Activar");
    cambiar.type = "button";
    cambiar.setAttribute("aria-label", `${u.activo ? "Desactivar" : "Activar"} a ${nombreCompleto}`);
    if (esYo && u.activo) {
        // La API también lo rechaza; acá se evita el error innecesario
        cambiar.disabled = true;
        cambiar.title = "No puede desactivarse a sí mismo";
    } else {
        cambiar.addEventListener("click", () => (u.activo ? pedirConfirmacion(u) : activar(u)));
    }

    const celdaAcciones = crearElemento("td", "text-end text-nowrap");
    celdaAcciones.append(editar, " ", cambiar);

    fila.append(
        crearElemento("td", "fw-semibold", esYo ? `${nombreCompleto} (usted)` : nombreCompleto),
        crearElemento("td", "", u.mail),
        crearElemento("td", "", NOMBRES_ROL[u.rol] ?? u.rol),
        crearElemento("td", "", u.unidadNombre ?? "—"),
        celdaEstado,
        celdaAcciones,
    );
    return fila;
}

function pintarTabla() {
    cuerpoTabla.replaceChildren(...usuarios.map(crearFila));
    campo("resumenResultados").textContent =
        `(${usuarios.length} ${usuarios.length === 1 ? "usuario" : "usuarios"})`;
    mostrar(campo("sinResultados"), usuarios.length === 0);
    mostrar(campo("contenedorTabla"), usuarios.length > 0);
}

// ---------- Alta y edición ----------

function marcarInvalido(id, mensaje) {
    const elemento = campo(id);
    if (!elemento || !formulario.contains(elemento)) return false;
    elemento.classList.add("is-invalid");
    elemento.setAttribute("aria-invalid", "true");
    const aviso = elemento.parentElement.querySelector(".invalid-feedback");
    if (aviso) aviso.textContent = mensaje;
    return true;
}

function limpiarErrores() {
    formulario.querySelectorAll(".is-invalid").forEach((el) => {
        el.classList.remove("is-invalid");
        el.removeAttribute("aria-invalid");
    });
    limpiarAlerta(campo("errorModalUsuario"));
}

// El rol decide si la unidad se muestra y si es obligatoria
function aplicarRol() {
    const rol = campo("rol").value;
    const selectUnidad = campo("unidadId");
    mostrar(campo("grupoUnidad"), rol !== "ADMINISTRACION");
    if (rol === "ADMINISTRACION") selectUnidad.value = ""; // Administración nunca lleva unidad
    selectUnidad.required = rol === "GESTION";
    mostrar(campo("marcaUnidad"), rol === "GESTION");
}

function abrirFormulario(usuario = null) {
    editando = usuario;
    formulario.reset();
    limpiarErrores();

    campo("tituloModalUsuario").textContent = usuario ? "Editar usuario" : "Nuevo usuario";
    if (usuario) {
        campo("nombre").value = usuario.nombre;
        campo("apellido").value = usuario.apellido;
        campo("mail").value = usuario.mail;
        campo("rol").value = usuario.rol;
        campo("unidadId").value = usuario.unidadId ? String(usuario.unidadId) : "";
    }

    // Cambiarse el propio rol podría dejar al sistema sin quien administre
    const esYo = Boolean(usuario) && usuario.id === usuarioActual.id;
    campo("rol").disabled = esYo;
    mostrar(campo("avisoRolPropio"), esYo);

    // En el alta la contraseña es obligatoria; al editar, vacía significa "no cambiarla"
    campo("password").required = !usuario;
    mostrar(campo("marcaPassword"), !usuario);
    campo("ayudaPassword").textContent = usuario
        ? "Déjela vacía para conservar la actual. Si la cambia, mínimo 8 caracteres."
        : "Mínimo 8 caracteres.";

    aplicarRol();
    modalUsuario.show();
}

// Mensajes propios en español (los del navegador salen en el idioma del navegador)
function validarLocal() {
    let primero = null;
    for (const el of formulario.elements) {
        if (!el.id || el.disabled || el.validity.valid) continue;
        let mensaje = "Revise este campo";
        if (el.validity.valueMissing) mensaje = "Este campo es obligatorio";
        else if (el.validity.typeMismatch) mensaje = "Ingrese un mail válido";
        else if (el.validity.tooShort) mensaje = "Debe tener al menos 8 caracteres";
        marcarInvalido(el.id, mensaje);
        primero ??= el;
    }
    primero?.focus();
    return primero === null;
}

// El 400/409 de la API trae { campo: mensaje } o solo un mensaje general
function mostrarErrorServidor(error) {
    let marcados = 0;
    for (const [clave, mensaje] of Object.entries(error.detalles ?? {})) {
        if (marcarInvalido(clave, mensaje)) marcados++;
    }
    if (marcados > 0) return;
    const mensaje = error.message;
    if (error.estado === 409 && /mail/i.test(mensaje)) marcarInvalido("mail", mensaje);
    else if (/contraseña/i.test(mensaje)) marcarInvalido("password", mensaje);
    else if (/unidad/i.test(mensaje)) marcarInvalido("unidadId", mensaje);
    else mostrarAlerta(campo("errorModalUsuario"), mensaje);
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarErrores();
    if (!validarLocal()) return;

    const rol = campo("rol").value;
    const unidad = campo("unidadId").value;
    const datos = {
        nombre: campo("nombre").value.trim(),
        apellido: campo("apellido").value.trim(),
        mail: campo("mail").value.trim(),
        rol,
        unidadId: rol === "ADMINISTRACION" || unidad === "" ? null : Number(unidad),
    };
    // La contraseña no se recorta (puede llevar espacios a propósito) y, vacía, no viaja
    if (campo("password").value !== "") datos.password = campo("password").value;

    const boton = campo("botonGuardar");
    boton.disabled = true; // evita enviar dos veces
    try {
        const eraAlta = editando === null;
        const guardado = eraAlta
            ? await crearUsuario(datos)
            : await actualizarUsuario(editando.id, datos);

        // Si el administrador se editó a sí mismo, el navbar debe mostrar los datos nuevos
        if (!eraAlta && guardado.id === usuarioActual.id) {
            guardarSesion(obtenerToken(), guardado);
            usuarioActual = guardado;
            dibujarLayout("usuarios");
        }
        modalUsuario.hide();
        await cargar();
        mostrarAlerta(alertas,
            eraAlta ? `Usuario ${guardado.apellido}, ${guardado.nombre} creado.`
                    : `Usuario ${guardado.apellido}, ${guardado.nombre} actualizado.`,
            "success");
    } catch (error) {
        mostrarErrorServidor(error);
    } finally {
        boton.disabled = false;
    }
});

campo("rol").addEventListener("change", aplicarRol);

// ---------- Activar y desactivar ----------

async function cambiarActivo(usuario, activo) {
    await cambiarActivoUsuario(usuario.id, activo);
    await cargar();
    mostrarAlerta(alertas,
        `Usuario ${usuario.apellido}, ${usuario.nombre} ${activo ? "activado" : "desactivado"}.`, "success");
}

async function activar(usuario) {
    try {
        await cambiarActivo(usuario, true);
    } catch (error) {
        mostrarAlerta(alertas, error.message);
    }
}

function pedirConfirmacion(usuario) {
    aDesactivar = usuario;
    campo("textoModalDesactivar").textContent =
        `¿Desactivar a ${usuario.apellido}, ${usuario.nombre}? No podrá iniciar sesión, ` +
        "pero se conservan su historial, sus firmas y sus comentarios. Puede volver a activarlo cuando quiera.";
    limpiarAlerta(campo("errorModalDesactivar"));
    modalDesactivar.show();
}

campo("botonConfirmarDesactivar").addEventListener("click", async () => {
    const boton = campo("botonConfirmarDesactivar");
    boton.disabled = true;
    try {
        await cambiarActivo(aDesactivar, false);
        modalDesactivar.hide();
    } catch (error) {
        mostrarAlerta(campo("errorModalDesactivar"), error.message);
    } finally {
        boton.disabled = false;
    }
});

// ---------- Inicio ----------

async function cargarUnidades() {
    try {
        const selector = campo("unidadId");
        for (const unidad of await listarUnidades()) selector.append(new Option(unidad.nombre, unidad.id));
    } catch (error) {
        mostrarAlerta(alertas, `No se pudieron cargar las unidades: ${error.message}`);
    }
}

async function iniciar() {
    usuarioActual = obtenerUsuario();
    // La API solo deja entrar a Administración; acá se evita mostrar una pantalla que fallaría
    if (usuarioActual?.rol !== "ADMINISTRACION") {
        location.replace("inicio.html");
        return;
    }
    dibujarLayout("usuarios");
    activarBotonVolver(campo("botonVolver"));

    filtros.addEventListener("submit", (evento) => {
        evento.preventDefault();
        cargar();
    });
    campo("botonLimpiar").addEventListener("click", () => {
        filtros.reset();
        cargar();
    });
    campo("botonNuevo").addEventListener("click", () => abrirFormulario());

    await cargarUnidades();
    cargar();
}

if (exigirSesion()) iniciar();