import { login } from "../api.js";
import { guardarSesion, haySesion } from "../sesion.js";
import { mostrarAlerta, limpiarAlerta } from "../ui.js";

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

// Recordar usuario
try {
    const mailGuardado = localStorage.getItem(CLAVE_MAIL_RECORDADO);
    if (mailGuardado) {
        campoMail.value = mailGuardado;
        campoRecordar.checked = true;
        campoPassword.focus();
    }
} catch { /* almacenamiento del navegador no disponible */ }

function actualizarMailRecordado(mail) {
    try {
        if (campoRecordar.checked) localStorage.setItem(CLAVE_MAIL_RECORDADO, mail);
        else localStorage.removeItem(CLAVE_MAIL_RECORDADO);
    } catch { }
}

// No hay restablecimiento automático
enlaceOlvido.addEventListener("click", (evento) => {
    evento.preventDefault();
    mostrarAlerta(alertas, "Para restablecer tu contraseña, comunicate con Administración.", "info");
});

//submit del login
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    limpiarAlerta(alertas);

    formulario.classList.add("was-validated");
    if (!formulario.checkValidity()) return;

    marcarCargando(true);
    try {
        const mail = campoMail.value.trim();
        const { token, usuario } = await login(mail, campoPassword.value);

        actualizarMailRecordado(mail);
        guardarSesion(token, usuario);
        location.href = "convenios.html";
    } catch (error) {
        mostrarAlerta(alertas, error.message); // "Credenciales inválidas", error de red, etc.
    } finally {
        marcarCargando(false);
    }
});
