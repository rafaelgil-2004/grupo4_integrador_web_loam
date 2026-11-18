import { API_URL } from "./config.js";
import { obtenerToken, cerrarSesion } from "./sesion.js";

//canal de comunicacion con la api
//ruta: parametros de la url
//objeto de opciones para la consulta
export async function pedir(ruta, { metodo = "GET", cuerpo, publica = false, formato = "json" } = {}) {
    const cabeceras = {};
    //la api no recuerda las sesiones
    if (!publica && obtenerToken()) {
        cabeceras["Authorization"] = `Bearer ${obtenerToken()}`;
    }

    /*3 casos
    sin cuerpo: un get, no se envia nada
    objeto(crear o editar convenio): se manda como un json
    formdata(subir pdf): no se modifica, ya viaja como multipart/form-data
    */
    let cuerpoEnvio;
    if (cuerpo instanceof FormData) {
        cuerpoEnvio = cuerpo;
    } else if (cuerpo !== undefined) {
        cabeceras["Content-Type"] = "application/json";
        cuerpoEnvio = JSON.stringify(cuerpo);
    }

    //peticion y errores de red
    let respuesta;
    try {
        respuesta = await fetch(`${API_URL}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpoEnvio });
    } catch {
        // fetch solo falla (sin respuesta HTTP) si no hay conexión o CORS bloquea
        throw new Error("No se pudo conectar con el servidor. Verifique que la API esté en funcionamiento.");
    }

    //sesion vencida
    if (respuesta.status === 401 && !publica) {
        cerrarSesion();
        throw new Error("Su sesión venció. Inicie sesión nuevamente.");
    }

    //control de errores
    if (!respuesta.ok) {
        let error = { mensaje: `Error ${respuesta.status}` };
        try { error = await respuesta.json(); } catch { /* la respuesta no era JSON */ }
        const excepcion = new Error(error.mensaje);
        excepcion.estado = respuesta.status;
        excepcion.codigo = error.codigo;      // por ejemplo VERSION_DESACTUALIZADA
        excepcion.detalles = error.detalles;  // errores por campo en un 400
        throw excepcion;
    }

    //respuesta exitosa
    if (formato === "blob") return respuesta.blob();

    const tipo = respuesta.headers.get("Content-Type") ?? "";
    return tipo.includes("json") ? respuesta.json() : null;
}

export const login = (mail, password) => pedir("/auth/login", { metodo: "POST", cuerpo: { mail, password }, publica: true });
//panel de inicio
export const obtenerResumen = () => pedir("/dashboard/resumen");

//para armar los query string
function aParametros(filtros) {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== "") parametros.set(clave, valor);
    }
    return parametros;
}

// cosas para convenio
export const listarConvenios = (filtros = {}) => pedir(`/convenios?${aParametros(filtros)}`);
export const obtenerArbol = (filtros = {}) => pedir(`/convenios/arbol?${aParametros(filtros)}`);
export const listarUnidades = () => pedir("/unidades");

export const obtenerConvenio = (id) => pedir(`/convenios/${id}`);
export const obtenerHistorial = (id) => pedir(`/convenios/${id}/historial`);
export const listarDocumentos = (id) => pedir(`/convenios/${id}/documentos`);
export const listarObservaciones = (id) => pedir(`/convenios/${id}/observaciones`);

//observaciones
export const crearObservacion = (id, texto) => pedir(`/convenios/${id}/observaciones`, { metodo: "POST", cuerpo: { texto } });

//documento
export function subirDocumento(id, archivo) {
    const datos = new FormData();
    datos.append("archivo", archivo); // el nombre del campo lo exige la API (@RequestPart("archivo"))
    return pedir(`/convenios/${id}/documentos`, { metodo: "POST", cuerpo: datos });
}

// devuelve un blob(datos binarios del pdf) 
export const descargarDocumento = (id) => pedir(`/documentos/${id}/descargar`, { formato: "blob" });

//creacion/edicion convenios
export const crearConvenio = (datos) => pedir("/convenios", { metodo: "POST", cuerpo: datos });

export const actualizarConvenio = (id, datos) => pedir(`/convenios/${id}`, { metodo: "PUT", cuerpo: datos });

export const aceptarConvenio = (id) => pedir(`/convenios/${id}/aceptar`, { metodo: "POST" });

// Solo borradores sin convenios dependientes; responde 204 (sin cuerpo)
export const eliminarConvenio = (id) => pedir(`/convenios/${id}`, { metodo: "DELETE" });

// El fundamento es obligatorio y queda registrado en el historial
export const rescindirConvenio = (id, motivo) => pedir(`/convenios/${id}/rescindir`, { metodo: "POST", cuerpo: { motivo } });

// Motivo opcional: sin motivo viaja sin cuerpo (la API lo acepta)
export const archivarConvenio = (id, motivo) => pedir(`/convenios/${id}/archivar`, { metodo: "POST", cuerpo: motivo ? { motivo } : undefined });

export const listarUsuarios = (filtros = {}) => pedir(`/usuarios?${aParametros(filtros)}`);

//usuarios
export const crearUsuario = (datos) =>
    pedir("/usuarios", { metodo: "POST", cuerpo: datos });

export const actualizarUsuario = (id, datos) =>
    pedir(`/usuarios/${id}`, { metodo: "PUT", cuerpo: datos });

export const cambiarActivoUsuario = (id, activo) =>
    pedir(`/usuarios/${id}/activo?activo=${activo}`, { metodo: "PATCH" });