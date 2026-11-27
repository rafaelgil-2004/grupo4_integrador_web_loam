import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE_API_URL = "convenios.apiUrl";
export const API_URL_POR_DEFECTO = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api";

// La dirección activa vive en memoria
let apiUrlActual = API_URL_POR_DEFECTO;

//recupera la dirección que se haya configurado en el celular
export async function cargarApiUrl() {
    const guardada = await AsyncStorage.getItem(CLAVE_API_URL);
    if (guardada) apiUrlActual = guardada;
    return apiUrlActual;
}

export const obtenerApiUrl = () => apiUrlActual;

// Texto vacío = volver a la dirección por defecto
export async function guardarApiUrl(url) {
    const limpia = url.trim().replace(/\/+$/, ""); // sin barras al final
    apiUrlActual = limpia || API_URL_POR_DEFECTO;
    if (limpia) await AsyncStorage.setItem(CLAVE_API_URL, limpia);
    else await AsyncStorage.removeItem(CLAVE_API_URL);
    return apiUrlActual;
}

//recordatorio
//1 minutos, 2 horas, 1 dia
export const RECORDATORIOS_MINUTOS = [1, 120, 1440];

//claves de los servidores guardados
const CLAVE_SERVIDORES = "convenios.servidores";

// La primera vez ofrece el atajo para el cable USB
const SERVIDORES_INICIALES = [{ nombre: "USB (adb reverse)", url: "http://localhost:8080/api" }];

const normalizarUrl = (url) => url.trim().replace(/\/+$/, "");

export async function leerServidores() {
    try {
        const guardados = JSON.parse(await AsyncStorage.getItem(CLAVE_SERVIDORES));
        if (Array.isArray(guardados)) return guardados;
    } catch {}
    return SERVIDORES_INICIALES;
}

// Si la URL ya existe se actualiza su nombre, para no duplicar
export async function guardarServidor(nombre, url) {
    const limpia = normalizarUrl(url);
    const lista = (await leerServidores()).filter((s) => s.url !== limpia);
    const nueva = [...lista, { nombre: nombre.trim() || limpia, url: limpia }];
    await AsyncStorage.setItem(CLAVE_SERVIDORES, JSON.stringify(nueva));
    return nueva;
}

export async function borrarServidor(url) {
    const nueva = (await leerServidores()).filter((s) => s.url !== url);
    await AsyncStorage.setItem(CLAVE_SERVIDORES, JSON.stringify(nueva));
    return nueva;
}