import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
//escritura y lectura de datos permanentes

const CLAVE = {
    token: "convenios.token",//en securestorage      
    credenciales: "convenios.credenciales",//en securestorage
    usuario: "convenios.usuario",//en asyncstorage
    preferencias: "convenios.preferencias",//en asyncstorage
};

//si falla se trata como si nu hubiese dato
async function leerSeguro(clave) {
    try { 
        return await SecureStore.getItemAsync(clave); 
    } catch { return null; }
}

export async function guardarSesion(token, usuario) {
    await SecureStore.setItemAsync(CLAVE.token, token);
    await AsyncStorage.setItem(CLAVE.usuario, JSON.stringify(usuario));
}

export async function leerSesion() {
    const token = await leerSeguro(CLAVE.token);
    const texto = await AsyncStorage.getItem(CLAVE.usuario);
    if (!token || !texto) return null;
    try { 
        return { token, usuario: JSON.parse(texto) }; 
    } catch { return null; }
}

export async function borrarSesion() {
    await SecureStore.deleteItemAsync(CLAVE.token).catch(() => {});
    await AsyncStorage.removeItem(CLAVE.usuario);
}

//login con huella
export const guardarCredenciales = (mail, password) =>
    SecureStore.setItemAsync(CLAVE.credenciales, JSON.stringify({ mail, password }));

export async function leerCredenciales() {
    const texto = await leerSeguro(CLAVE.credenciales);
    try {
        return texto ? JSON.parse(texto) : null; 
    } catch { return null; }
}

export const borrarCredenciales = () => SecureStore.deleteItemAsync(CLAVE.credenciales).catch(() => {});

export async function leerPreferencias() {
    try { return JSON.parse(await AsyncStorage.getItem(CLAVE.preferencias)) ?? {}; } catch { return {}; }
}

export async function guardarPreferencias(parcial) {
    const actuales = await leerPreferencias();
    await AsyncStorage.setItem(CLAVE.preferencias, JSON.stringify({ ...actuales, ...parcial }));
}
// Caché para el modo sin conexión
export const guardarCache = (clave, datos) =>
    AsyncStorage.setItem(`convenios.cache.${clave}`, JSON.stringify(datos));

export async function leerCache(clave) {
    try { 
        return JSON.parse(await AsyncStorage.getItem(`convenios.cache.${clave}`)); 
    } catch { return null; }
}

//foto perfil
export const guardarFoto = (usuarioId, uri) => AsyncStorage.setItem(`convenios.foto.${usuarioId}`, uri);
export const leerFoto = (usuarioId) => AsyncStorage.getItem(`convenios.foto.${usuarioId}`);

// Borra solo la caché de datos, solo los pendientes
export async function borrarCache() {
    const claves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith("convenios.cache."));
    if (claves.length) await AsyncStorage.multiRemove(claves);
}

//identidad
export const guardarIdentidad = (usuarioId, tipo, valor) =>
    AsyncStorage.setItem(`convenios.identidad.${tipo}.${usuarioId}`, JSON.stringify(valor));

export async function leerIdentidad(usuarioId, tipo) {
    try { 
        return JSON.parse(await AsyncStorage.getItem(`convenios.identidad.${tipo}.${usuarioId}`)); 
    } catch { return null; }
}

export const borrarIdentidad = (usuarioId, tipo) => AsyncStorage.removeItem(`convenios.identidad.${tipo}.${usuarioId}`);