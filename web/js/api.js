import { API_URL } from "./config.js";
import { obtenerToken, cerrarSesion } from "./sesion.js";

/**
 * Función central: todas las llamadas a la API pasan por acá.
 * - publica: true  → no envía token ni trata el 401 como sesión vencida (solo el login)
 * - cuerpo: objeto → se envía como JSON; FormData → se envía tal cual (archivos)
 */
export async function pedir(ruta, { metodo = "GET", cuerpo, publica = false } = {}) {
    const cabeceras = {};
    if (!publica && obtenerToken()) {
        cabeceras["Authorization"] = `Bearer ${obtenerToken()}`;
    }

    let cuerpoEnvio;
    if (cuerpo instanceof FormData) {
        // No se fija Content-Type: el navegador lo agrega con el "boundary" correcto
        cuerpoEnvio = cuerpo;
    } else if (cuerpo !== undefined) {
        cabeceras["Content-Type"] = "application/json";
        cuerpoEnvio = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
        respuesta = await fetch(`${API_URL}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpoEnvio });
    } catch {
        // fetch solo falla (sin respuesta HTTP) si no hay conexión o CORS bloquea
        throw new Error("No se pudo conectar con el servidor. Verifique que la API esté en funcionamiento.");
    }

    if (respuesta.status === 401 && !publica) {
        cerrarSesion();
        throw new Error("Su sesión venció. Inicie sesión nuevamente.");
    }

    if (!respuesta.ok) {
        let error = { mensaje: `Error ${respuesta.status}` };
        try { error = await respuesta.json(); } catch { /* la respuesta no era JSON */ }
        const excepcion = new Error(error.mensaje);
        excepcion.estado = respuesta.status;
        excepcion.codigo = error.codigo;      // por ejemplo VERSION_DESACTUALIZADA
        excepcion.detalles = error.detalles;  // errores por campo en un 400
        throw excepcion;
    }

    const tipo = respuesta.headers.get("Content-Type") ?? "";
    return tipo.includes("json") ? respuesta.json() : null;
}

export const login = (mail, password) =>
    pedir("/auth/login", { metodo: "POST", cuerpo: { mail, password }, publica: true });