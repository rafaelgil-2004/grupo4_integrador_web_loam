//la sesion se guarda en localstorage
const CLAVE_TOKEN = "convenios.token";
const CLAVE_USUARIO = "convenios.usuario";

export function guardarSesion(token, usuario) {
    localStorage.setItem(CLAVE_TOKEN, token);
    //usuario se guarda como string(objeto > string)
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function obtenerToken() {
    return localStorage.getItem(CLAVE_TOKEN);
}

export function obtenerUsuario() {
    try {
        //se convierte el string del usuario en un objeto(string > objeto)
        return JSON.parse(localStorage.getItem(CLAVE_USUARIO));
    } catch {
        return null; // valor corrupto
    }
}

export function haySesion() {
    return obtenerToken() !== null;
}

export function cerrarSesion() {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    location.replace("login.html");
}

export function exigirSesion() {
    if (haySesion()) return true;
    location.replace("login.html");
    return false;
}