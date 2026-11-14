const CLAVE_TOKEN = "convenios.token";
const CLAVE_USUARIO = "convenios.usuario";

export function guardarSesion(token, usuario) {
    localStorage.setItem(CLAVE_TOKEN, token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function obtenerToken() {
    return localStorage.getItem(CLAVE_TOKEN);
}

export function obtenerUsuario() {
    try {
        return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
    } catch {
        return null; // valor guardado corrupto
    }
}

export function haySesion() {
    return obtenerToken() !== null;
}

export function cerrarSesion() {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    location.href = "login.html";
}

export function exigirSesion() {
    if (haySesion()) return true;
    location.replace("login.html");
    return false;
}