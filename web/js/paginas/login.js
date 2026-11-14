import { login } from "../api.js";
import { guardarSesion, haySesion } from "../sesion.js";
import { mostrarAlerta, limpiarAlerta } from "../ui.js";

// La web es solo para estos roles; los demás usan la app móvil
const ROLES_WEB = ["ADMINISTRACION", "GESTION"];

if (haySesion()) location.replace("inicio.html");

const formulario = document.getElementById("formularioLogin");
const campoMail = document.getElementById("mail");
const campoPassword = document.getElementById("password");
const botonIngresar = document.getElementById("botonIngresar");
const girando = document.getElementById("girando");
const textoBoton = document.getElementById("textoBoton");
const alertas = document.getElementById("alertas");

function marcarCargando(cargando) {
    botonIngresar.disabled = cargando; // evita enviar dos veces
    girando.classList.toggle("d-none", !cargando);
    textoBoton.textContent = cargando ? "Ingresando..." : "Ingresar";
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarAlerta(alertas);

    // Muestra los mensajes de "invalid-feedback" de Bootstrap
    formulario.classList.add("was-validated");
    if (!formulario.checkValidity()) return;

    marcarCargando(true);
    try {
        const { token, usuario } = await login(campoMail.value.trim(), campoPassword.value);

        if (!ROLES_WEB.includes(usuario.rol)) {
            mostrarAlerta(alertas,
                "Esta plataforma es solo para Administración y Gestión. Use la aplicación móvil.",
                "warning");
            return; // no se guarda la sesión
        }

        guardarSesion(token, usuario);
        location.href = "inicio.html";
    } catch (error) {
        mostrarAlerta(alertas, error.message); // "Credenciales inválidas", error de red, etc.
    } finally {
        marcarCargando(false);
    }
});