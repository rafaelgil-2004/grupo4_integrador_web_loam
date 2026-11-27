import { obtenerApiUrl } from "../configuracion";
import * as FileSystem from "expo-file-system/legacy";
//el que se encarga de la comunicacion con la api

export class ErrorApi extends Error {
    constructor(mensaje, { estado, codigo, detalles, sinConexion = false } = {}) {
        super(mensaje);
        this.estado = estado;
        this.codigo = codigo;
        this.detalles = detalles;
        this.sinConexion = sinConexion;
    }
}

//token y manejo de secion
let tokenActual = null;
let alVencerSesion = null;//funcion a ejecutar cuando el token no sirva
export const obtenerToken = () => tokenActual;
export const fijarToken = (token) => { tokenActual = token; };
export const registrarAlVencerSesion = (funcion) => { alVencerSesion = funcion; };

//consultas a la api
export async function pedir(ruta, { metodo = "GET", cuerpo, publica = false, tiempoLimiteMs = 15000 } = {}) {
    
    const cabeceras = { Accept: "application/json" };
    if (!publica && tokenActaul) cabeceras.Authorization = `Bearer ${tokenActual}`;

    let cuerpoEnvio;
    if (cuerpo instanceof FormData) {
        cuerpoEnvio = cuerpo; 
    } else if (cuerpo !== undefined) {
        cabeceras["Content-Type"] = "application/json";
        cuerpoEnvio = JSON.stringify(cuerpo);
    }

    //se establece un temporizador, fetch se queda esperando si no responde el servidor
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

    //sesion vencida
    if (respuesta.status === 401 && !publica) {
        alVencerSesion?.();
        throw new ErrorApi("Su sesión venció. Inicie sesión nuevamente.", { estado: 401 });
    }

    //respuesta
    const texto = await respuesta.text();
    let datos = null;
    try { 
        datos = texto ? JSON.parse(texto) : null; 
    } catch { }// la respuesta no era JSON

    if (!respuesta.ok) {
        throw new ErrorApi(datos?.mensaje ?? `Error ${respuesta.status}`,
            { estado: respuesta.status, codigo: datos?.codigo, detalles: datos?.detalles });
    }
    return datos;
}

export const login = (mail, password) => pedir("/auth/login", { metodo: "POST", cuerpo: { mail, password }, publica: true });
export const obtenerDatosUsuario = () => pedir("/auth/datosUsuario");
export const obtenerResumen = () => pedir("/dashboard/resumen");
export const obtenerMovimientos = (limite = 10) => pedir(`/dashboard/movimientos?limite=${limite}`);
export const obtenerPendientes = (limite = 10) => pedir(`/firmas/pendientes?limite=${limite}`);
export const obtenerConvenio = (id) => pedir(`/convenios/${id}`);
export const obtenerDocumentos = (id) => pedir(`/convenios/${id}/documentos`);
export const obtenerObservaciones = (id) => pedir(`/convenios/${id}/observaciones`);
export const agregarObservacion = (id, texto) => pedir(`/convenios/${id}/observaciones`, { metodo: "POST", cuerpo: { texto } });

//subida multipart por el módulo nativo falla en android
async function subirArchivo(ruta, uri, { campo, tipoMime, parametros, mensajeError }) {
    let r;
    try {
        r = await FileSystem.uploadAsync(`${obtenerApiUrl()}${ruta}`, uri, {
            httpMethod: "POST",
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: campo,
            mimeType: tipoMime,
            parameters: parametros,
            headers: { Authorization: `Bearer ${tokenActual}`, Accept: "application/json" },
        });
    } catch {
        throw new Error("No se pudo conectar al servidor.");
    }
    let cuerpo = null;
    try { 
        cuerpo = JSON.parse(r.body); 
    } catch {}
    if (r.status === 401) alVencerSesion?.();
    if (r.status < 200 || r.status >= 300) throw new Error(cuerpo?.mensaje ?? `Error ${r.status} ${mensajeError}`);
    return cuerpo;
}
//subir la firma
export const firmar = (convenioId, { latitud, longitud, uriImagen }) =>
    subirArchivo(`/convenios/${convenioId}/firmas`, uriImagen, {
        campo: "imagen", tipoMime: "image/svg+xml",
        parametros: { latitud: String(latitud), longitud: String(longitud) },
        mensajeError: "al registrar la firma.",
    });

export const subirDocumento = (convenioId, uriPdf) =>
    subirArchivo(`/convenios/${convenioId}/documentos`, uriPdf, {
        campo: "archivo", tipoMime: "application/pdf",
        mensajeError: "al subir el documento.",
    });

//buscar
//pasa los filtros a url
const aParametros = (filtros) => Object.entries(filtros)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

export const buscarConvenios = (filtros, pagina = 0) =>
    pedir(`/convenios?${aParametros({ ...filtros, pagina, tamanio: 20 })}`);

export const obtenerArbol = (filtros) => pedir(`/convenios/arbol?${aParametros(filtros)}`);