import { API_URL } from "./config.js";
import { obtenerToken, cerrarSesion } from "./sesion.js";

//canal de comunicacion con la api
//ruta: parametros de la url
//objeto de opciones para la consulta
export async function pedir(ruta, { metodo = "GET", cuerpo, publica = false, formato = "json" } = {}) {
    const cabeceras = {};
    //la api no recuerdda las seciones
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

    if (formato === "blob") return respuesta.blob();

    const tipo = respuesta.headers.get("Content-Type") ?? "";
    return tipo.includes("json") ? respuesta.json() : null;
}

export const login = (mail, password) =>
    pedir("/auth/login", { metodo: "POST", cuerpo: { mail, password }, publica: true });

export const obtenerResumen = () => pedir("/dashboard/resumen");

function aParametros(filtros) {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== "") parametros.set(clave, valor);
    }
    return parametros;
}

// Sirve también para el listado: ignora los filtros vacíos
export const listarConvenios = (filtros = {}) => pedir(`/convenios?${aParametros(filtros)}`);
export const obtenerArbol = (filtros = {}) => pedir(`/convenios/arbol?${aParametros(filtros)}`);
export const listarUnidades = () => pedir("/unidades");

//convenio
export const obtenerConvenio = (id) => pedir(`/convenios/${id}`);
export const obtenerHistorial = (id) => pedir(`/convenios/${id}/historial`);
export const listarDocumentos = (id) => pedir(`/convenios/${id}/documentos`);
export const listarObservaciones = (id) => pedir(`/convenios/${id}/observaciones`);

export const crearObservacion = (id, texto) =>
    pedir(`/convenios/${id}/observaciones`, { metodo: "POST", cuerpo: { texto } });

export function subirDocumento(id, archivo) {
    const datos = new FormData();
    datos.append("archivo", archivo); // el nombre del campo lo exige la API (@RequestPart("archivo"))
    return pedir(`/convenios/${id}/documentos`, { metodo: "POST", cuerpo: datos });
}

// Devuelve un Blob (el contenido binario del PDF)
export const descargarDocumento = (id) => pedir(`/documentos/${id}/descargar`, { formato: "blob" });

//creacion/edicion convenios
export const crearConvenio = (datos) =>
    pedir("/convenios", { metodo: "POST", cuerpo: datos });

// "datos" lleva también la revision que se leyó (control de concurrencia) y, si el
// convenio está Aceptado, el motivo de la modificación
export const actualizarConvenio = (id, datos) =>
    pedir(`/convenios/${id}`, { metodo: "PUT", cuerpo: datos });

export const aceptarConvenio = (id) =>
    pedir(`/convenios/${id}/aceptar`, { metodo: "POST" });

// Gestión recibe solo usuarios activos de consulta; Administración recibe todos
export const listarUsuarios = (filtros = {}) => pedir(`/usuarios?${aParametros(filtros)}`);

//usuarios
// usuarios (solo Administración)
export const crearUsuario = (datos) =>
    pedir("/usuarios", { metodo: "POST", cuerpo: datos });

// Si "password" no viaja (o viene vacío), la API conserva la contraseña actual
export const actualizarUsuario = (id, datos) =>
    pedir(`/usuarios/${id}`, { metodo: "PUT", cuerpo: datos });

// Baja lógica: el usuario desactivado no puede iniciar sesión, pero conserva su historial
export const cambiarActivoUsuario = (id, activo) =>
    pedir(`/usuarios/${id}/activo?activo=${activo}`, { metodo: "PATCH" });