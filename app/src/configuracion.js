import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE_API_URL = "convenios.apiUrl";
export const API_URL_POR_DEFECTO = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080/api";

export const TAMANIO_LISTA = 10;
export const SEGUNDOS_RECORDATORIO = 20; // para la demo; en uso real serían horas

// La dirección activa vive en memoria: las llamadas a la API la leen con obtenerApiUrl()
let apiUrlActual = API_URL_POR_DEFECTO;

// Se llama una vez al arrancar: recupera la dirección que se haya configurado en el celular
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