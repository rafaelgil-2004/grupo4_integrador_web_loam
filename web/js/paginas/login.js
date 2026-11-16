import { login } from "../api.js";
import { guardarSesion, haySesion } from "../sesion.js";
import { mostrarAlerta, limpiarAlerta } from "../ui.js";

// La web es solo para estos roles; los demás usan la app móvil
const ROLES_WEB = ["ADMINISTRACION", "GESTION"];
const CLAVE_MAIL_RECORDADO = "convenios.mailRecordado";

if (haySesion()) location.replace("convenios.html");

const formulario = document.getElementById("formularioLogin");
const campoMail = document.getElementById("mail");
const campoPassword = document.getElementById("password");
const campoRecordar = document.getElementById("recordar");
const enlaceOlvido = document.getElementById("olvido");
const botonIngresar = document.getElementById("botonIngresar");
const girando = document.getElementById("girando");
const textoBoton = document.getElementById("textoBoton");
const alertas = document.getElementById("alertas");
const TEXTO_BOTON = textoBoton.textContent;

function marcarCargando(cargando) {
    botonIngresar.disabled = cargando; // evita enviar dos veces
    girando.classList.toggle("d-none", !cargando);
    textoBoton.textContent = cargando ? "Ingresando..." : TEXTO_BOTON;
}

// "Recordar usuario": se guarda solo el mail, nunca la contraseña
try {
    const mailGuardado = localStorage.getItem(CLAVE_MAIL_RECORDADO);
    if (mailGuardado) {
        campoMail.value = mailGuardado;
        campoRecordar.checked = true;
        campoPassword.focus();
    }
} catch { /* el almacenamiento del navegador no está disponible */ }

function actualizarMailRecordado(mail) {
    try {
        if (campoRecordar.checked) localStorage.setItem(CLAVE_MAIL_RECORDADO, mail);
        else localStorage.removeItem(CLAVE_MAIL_RECORDADO);
    } catch { /* ídem */ }
}

// No hay restablecimiento automático: las personas las registra Administración
enlaceOlvido.addEventListener("click", (evento) => {
    evento.preventDefault();
    mostrarAlerta(alertas, "Para restablecer tu contraseña, comunicate con Administración.", "info");
});

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarAlerta(alertas);

    // Muestra los mensajes de "invalid-feedback" de Bootstrap
    formulario.classList.add("was-validated");
    if (!formulario.checkValidity()) return;

    marcarCargando(true);
    try {
        const mail = campoMail.value.trim();
        const { token, usuario } = await login(mail, campoPassword.value);

        if (!ROLES_WEB.includes(usuario.rol)) {
            mostrarAlerta(alertas,
                "Esta plataforma es solo para Administración y Gestión. Usá la aplicación móvil.",
                "warning");
            return; // no se guarda la sesión
        }

        actualizarMailRecordado(mail);
        guardarSesion(token, usuario);
        location.href = "convenios.html";
    } catch (error) {
        mostrarAlerta(alertas, error.message); // "Credenciales inválidas", error de red, etc.
    } finally {
        marcarCargando(false);
    }
});
