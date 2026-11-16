import { obtenerApiUrl } from "../configuracion";
import * as FileSystem from "expo-file-system/legacy";

export class ErrorApi extends Error {
    constructor(mensaje, { estado, codigo, detalles, sinConexion = false } = {}) {
        super(mensaje);
        this.estado = estado;
        this.codigo = codigo;
        this.detalles = detalles;
        this.sinConexion = sinConexion;
    }
}

// El token vive en memoria: ContextoAutenticacion lo fija al iniciar o restaurar la sesión
let tokenActual = null;
let alVencerSesion = null;
export const obtenerToken = () => tokenActual;
export const fijarToken = (token) => { tokenActual = token; };
export const registrarAlVencerSesion = (funcion) => { alVencerSesion = funcion; };

/**
 * Todas las llamadas a la API pasan por acá.
 * publica: true → sin token y sin tratar el 401 como sesión vencida (solo el login)
 * cuerpo: objeto → JSON; FormData → multipart (archivos)
 */
export async function pedir(ruta, { metodo = "GET", cuerpo, publica = false, tiempoLimiteMs = 15000 } = {}) {
    
    const cabeceras = { Accept: "application/json" };
    if (!publica && tokenActual) cabeceras.Authorization = `Bearer ${tokenActual}`;

    let cuerpoEnvio;
    if (cuerpo instanceof FormData) {
        cuerpoEnvio = cuerpo; // sin Content-Type: lo completa fetch con el "boundary"
    } else if (cuerpo !== undefined) {
        cabeceras["Content-Type"] = "application/json";
        cuerpoEnvio = JSON.stringify(cuerpo);
    }

    // fetch no tiene tiempo límite propio: se cancela con AbortController
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), tiempoLimiteMs);
    let respuesta;
    try {
        respuesta = await fetch(`${obtenerApiUrl()}${ruta}`, {
            method: metodo, headers: cabeceras, body: cuerpoEnvio, signal: controlador.signal,
        });
    } catch (error) {
        throw new ErrorApi(error.name === "AbortError"
            ? "El servidor tardó demasiado en responder."
            : "No se pudo conectar con el servidor.", { sinConexion: true });
    } finally {
        clearTimeout(temporizador);
    }

    if (respuesta.status === 401 && !publica) {
        alVencerSesion?.();
        throw new ErrorApi("Su sesión venció. Inicie sesión nuevamente.", { estado: 401 });
    }

    const texto = await respuesta.text();
    let datos = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch { /* la respuesta no era JSON */ }

    if (!respuesta.ok) {
        throw new ErrorApi(datos?.mensaje ?? `Error ${respuesta.status}`,
            { estado: respuesta.status, codigo: datos?.codigo, detalles: datos?.detalles });
    }
    return datos;
}

export const login = (mail, password) =>
    pedir("/auth/login", { metodo: "POST", cuerpo: { mail, password }, publica: true });

export const obtenerDatosUsuario = () => pedir("/auth/datosUsuario");
export const obtenerResumen = () => pedir("/dashboard/resumen");
export const obtenerMovimientos = (limite = 10) => pedir(`/dashboard/movimientos?limite=${limite}`);
export const obtenerPendientes = (limite = 10) => pedir(`/firmas/pendientes?limite=${limite}`);
export const obtenerConvenio = (id) => pedir(`/convenios/${id}`);
export const obtenerDocumentos = (id) => pedir(`/convenios/${id}/documentos`);
export const obtenerObservaciones = (id) => pedir(`/convenios/${id}/observaciones`);
export const agregarObservacion = (id, texto) =>
    pedir(`/convenios/${id}/observaciones`, { metodo: "POST", cuerpo: { texto } });

export async function firmar(convenioId, { latitud, longitud, uriImagen }) {
    let r;
    try {
        r = await FileSystem.uploadAsync(`${obtenerApiUrl()}/convenios/${convenioId}/firmas`, uriImagen, {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: "imagen",
            mimeType: "image/svg+xml",
            parameters: { latitud: String(latitud), longitud: String(longitud) },
            headers: { Authorization: `Bearer ${tokenActual}`, Accept: "application/json" },
        });
    } catch {
        throw new Error("No se pudo conectar al servidor.");
    }
    let cuerpo = null;
    try { cuerpo = JSON.parse(r.body); } catch {}
    if (r.status < 200 || r.status >= 300) throw new Error(cuerpo?.mensaje ?? `Error ${r.status} al registrar la firma.`);
    return cuerpo;
}