// Página: usuarios.html (listado con búsqueda por nombre y filtro por rol)
// Solo Administración. Alta y edición: usuario-form.html. Activar/desactivar: acá, con confirmación.
import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { listarUsuarios, cambiarActivoUsuario } from "../api.js";
import { dibujarLayout, mostrarAlerta, limpiarAlerta } from "../ui.js";
import { crearElemento, parametroUrl } from "../utils.js";

// Rol de la API → [grupo, detalle]. Se muestra como "Consulta · Docente".
const ROLES = {
    ADMINISTRACION: ["Administración", "Administración"],
    GESTION:        ["Gestión", "Gestión"],
    ESTUDIANTE:     ["Consulta", "Estudiante"],
    PROFESOR:       ["Consulta", "Docente"],
    DECANO:         ["Consulta", "Decano"],
};

const alertas = document.getElementById("alertas");
const formulario = document.getElementById("formularioBusqueda");
const cuerpoTabla = document.getElementById("cuerpoTabla");
const mostrar = (elemento, visible) => elemento.classList.toggle("d-none", !visible);

let usuarios = [];      // lo último que devolvió la API para el rol elegido
let rolElegido = "";    // "" = todos
let ultimaBusqueda = 0;

// Sin tildes y en minúsculas: "maria" encuentra "María"
const normalizar = (texto) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// ---------- Datos ----------

async function cargar(conservarAlerta = false) {
    // Si el usuario cambia de filtro rápido, una respuesta lenta vieja no pisa a la nueva
    const numero = ++ultimaBusqueda;
    if (!conservarAlerta) limpiarAlerta(alertas);
    marcarCargando(true);
    try {
        // Al servidor solo viaja el rol. El texto se filtra acá porque la API busca en
        // nombre, apellido y mail por separado y "María González" no coincidiría con ninguno.
        const lista = await listarUsuarios(rolElegido ? { rol: rolElegido } : {});
        if (numero !== ultimaBusqueda) return;
        usuarios = lista;
        pintarTabla();
    } catch (error) {
        if (numero === ultimaBusqueda) mostrarAlerta(alertas, error.message);
    } finally {
        if (numero === ultimaBusqueda) marcarCargando(false);
    }
}

function filtrarPorTexto(lista) {
    const palabras = normalizar(document.getElementById("q").value).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return lista;
    return lista.filter((u) => {
        const texto = normalizar(`${u.nombre} ${u.apellido} ${u.mail}`);
        return palabras.every((p) => texto.includes(p)); // todas las palabras, en cualquier orden
    });
}

// ---------- Tabla ----------

function marcarCargando(cargando) {
    document.getElementById("resultados").setAttribute("aria-busy", String(cargando));
    mostrar(document.getElementById("cargando"), cargando);
}

function crearFila(u) {
    const [grupo, detalle] = ROLES[u.rol] ?? [u.rol, u.rol];
    const esUnoMismo = u.id === obtenerUsuario()?.id;
    const fila = crearElemento("tr", u.activo ? "" : "inactivo");

    const celdaNombre = crearElemento("td", "nombre", `${u.nombre} ${u.apellido}`);
    if (esUnoMismo) celdaNombre.append(crearElemento("span", "marca-usted", "(usted)"));

    const correo = crearElemento("a", "", u.mail);
    correo.href = `mailto:${u.mail}`;
    const celdaMail = crearElemento("td");
    celdaMail.append(correo);

    // El texto va siempre escrito: el color solo refuerza (igual que las etiquetas de convenios)
    const celdaEstado = crearElemento("td");
    celdaEstado.append(crearElemento("span", `etiqueta${u.activo ? " ok" : ""}`, u.activo ? "Activo" : "Inactivo"));

    const editar = crearElemento("a", "btn btn-borde btn-chico", "Editar");
    editar.href = `usuario-form.html?id=${u.id}`;
    editar.setAttribute("aria-label", `Editar a ${u.nombre} ${u.apellido}`);

    const alternar = crearElemento("button", "btn btn-borde btn-chico", u.activo ? "Desactivar" : "Activar");
    alternar.type = "button";
    alternar.setAttribute("aria-label", `${u.activo ? "Desactivar" : "Activar"} a ${u.nombre} ${u.apellido}`);
    if (esUnoMismo && u.activo) {
        // Nadie puede desactivarse a sí mismo (la API también lo rechaza)
        alternar.disabled = true;
        alternar.title = "No puede desactivarse a sí mismo";
    } else {
        alternar.addEventListener("click", () => pedirConfirmacion(u));
    }

    const acciones = crearElemento("div", "acciones-fila");
    acciones.append(editar, alternar);
    const celdaAcciones = crearElemento("td");
    celdaAcciones.append(acciones);

    fila.append(celdaNombre, crearElemento("td", "rol", `${grupo} · ${detalle}`), celdaMail, celdaEstado, celdaAcciones);
    return fila;
}

// ---------- Activar / desactivar ----------

let usuarioPendiente = null;
let modalActivo;

function pedirConfirmacion(u) {
    usuarioPendiente = u;
    const nombre = `${u.nombre} ${u.apellido}`;
    document.getElementById("tituloModalActivo").textContent = u.activo ? "Desactivar usuario" : "Activar usuario";
    document.getElementById("textoModalActivo").textContent = u.activo
        ? `${nombre} ya no podrá iniciar sesión, pero conservará su historial, firmas y comentarios.`
        : `${nombre} volverá a poder iniciar sesión.`;
    modalActivo.show();
}

async function confirmarCambio() {
    const u = usuarioPendiente;
    if (!u) return;
    const boton = document.getElementById("confirmarActivo");
    boton.disabled = true;
    try {
        await cambiarActivoUsuario(u.id, !u.activo);
        modalActivo.hide();
        mostrarAlerta(alertas, `${u.nombre} ${u.apellido} quedó ${u.activo ? "desactivado" : "activado"}.`, "success");
        await cargar(true);
    } catch (error) {
        modalActivo.hide();
        mostrarAlerta(alertas, error.message);
    } finally {
        boton.disabled = false;
        usuarioPendiente = null;
    }
}

function pintarTabla() {
    const visibles = filtrarPorTexto(usuarios)
        .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es"));
    cuerpoTabla.replaceChildren(...visibles.map(crearFila));
    mostrar(document.getElementById("contenedorTabla"), visibles.length > 0);
    mostrar(document.getElementById("sinResultados"), visibles.length === 0);
    document.getElementById("cantidadUsuarios").textContent = visibles.length === 0 ? "" :
        `${visibles.length} ${visibles.length === 1 ? "usuario encontrado" : "usuarios encontrados"}`;
}

// ---------- Filtro por rol ----------

function dibujarMenuRoles() {
    const opciones = [["", "Todos los roles"], ...Object.entries(ROLES).map(([clave, [, detalle]]) => [clave, detalle])];
    document.getElementById("menuRoles").replaceChildren(...opciones.map(([clave, texto]) => {
        const boton = crearElemento("button", `dropdown-item${clave === rolElegido ? " active" : ""}`, texto);
        boton.type = "button";
        boton.addEventListener("click", () => elegirRol(clave, texto));
        const item = crearElemento("li");
        item.append(boton);
        return item;
    }));
}

function elegirRol(clave, texto) {
    rolElegido = clave;
    document.getElementById("textoFiltroRol").textContent = clave ? `Rol: ${texto}` : "Filtrar por rol";
    dibujarMenuRoles();
    cargar();
}

// ---------- Inicio ----------

function iniciar() {
    // La API solo deja entrar a Administración; acá se evita mostrar una pantalla que fallaría
    if (obtenerUsuario()?.rol !== "ADMINISTRACION") { location.replace("convenios.html"); return; }
    dibujarLayout("usuarios");
    dibujarMenuRoles();
    modalActivo = new bootstrap.Modal(document.getElementById("modalActivo"));
    document.getElementById("confirmarActivo").addEventListener("click", confirmarCambio);

    // Mensaje de éxito que deja usuario-form.html al guardar
    const resultado = parametroUrl("ok");
    if (resultado) {
        mostrarAlerta(alertas, resultado === "editado" ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.", "success");
        history.replaceState(null, "", location.pathname);
    }

    formulario.addEventListener("submit", (evento) => { evento.preventDefault(); cargar(); });
    // Mientras escribe, filtra lo ya cargado (sin pedir nada al servidor)
    document.getElementById("q").addEventListener("input", pintarTabla);
    cargar(Boolean(resultado));
}

if (exigirSesion()) iniciar();
