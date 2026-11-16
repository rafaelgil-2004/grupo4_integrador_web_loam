import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CLAVE = {
    token: "convenios.token",              // SecureStore (cifrado)
    credenciales: "convenios.credenciales",// SecureStore: para el ingreso con huella
    usuario: "convenios.usuario",          // AsyncStorage (no es secreto)
    preferencias: "convenios.preferencias",
};

// Las lecturas de SecureStore pueden fallar si el sistema invalida la clave: se tratan como "no hay dato"
async function leerSeguro(clave) {
    try { return await SecureStore.getItemAsync(clave); } catch { return null; }
}

export async function guardarSesion(token, usuario) {
    await SecureStore.setItemAsync(CLAVE.token, token);
    await AsyncStorage.setItem(CLAVE.usuario, JSON.stringify(usuario));
}

export async function leerSesion() {
    const token = await leerSeguro(CLAVE.token);
    const texto = await AsyncStorage.getItem(CLAVE.usuario);
    if (!token || !texto) return null;
    try { return { token, usuario: JSON.parse(texto) }; } catch { return null; }
}

export async function borrarSesion() {
    await SecureStore.deleteItemAsync(CLAVE.token).catch(() => {});
    await AsyncStorage.removeItem(CLAVE.usuario);
}

export const guardarCredenciales = (mail, password) =>
    SecureStore.setItemAsync(CLAVE.credenciales, JSON.stringify({ mail, password }));

export async function leerCredenciales() {
    const texto = await leerSeguro(CLAVE.credenciales);
    try { return texto ? JSON.parse(texto) : null; } catch { return null; }
}

export const borrarCredenciales = () => SecureStore.deleteItemAsync(CLAVE.credenciales).catch(() => {});

export async function leerPreferencias() {
    try { return JSON.parse(await AsyncStorage.getItem(CLAVE.preferencias)) ?? {}; } catch { return {}; }
}

// Fusiona con lo ya guardado: se puede guardar solo una de las dos preferencias
export async function guardarPreferencias(parcial) {
    const actuales = await leerPreferencias();
    await AsyncStorage.setItem(CLAVE.preferencias, JSON.stringify({ ...actuales, ...parcial }));
}
// Caché para el modo sin conexión (por ahora solo los pendientes de firma)
export const guardarCache = (clave, datos) =>
    AsyncStorage.setItem(`convenios.cache.${clave}`, JSON.stringify(datos));

export async function leerCache(clave) {
    try { return JSON.parse(await AsyncStorage.getItem(`convenios.cache.${clave}`)); } catch { return null; }
}