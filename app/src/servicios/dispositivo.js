import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";

// ---------- Biometría ----------
export async function hayBiometria() {
    try {
        return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
    } catch {
        return false;
    }
}

export async function autenticarConHuella(motivo) {
    const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: motivo, cancelLabel: "Cancelar", disableDeviceFallback: true,
    });
    return resultado.success;
}

// ---------- Notificaciones locales ----------
// Se llama una vez al iniciar la app: permite que se vean con la app abierta
export function configurarNotificaciones() {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false,
        }),
    });
}

async function conPermisoDeNotificaciones() {
    if (Platform.OS === "android") {
        // Desde Android 8 toda notificación necesita un canal
        await Notifications.setNotificationChannelAsync("default", {
            name: "Convenios", importance: Notifications.AndroidImportance.HIGH,
        });
    }
    const actual = await Notifications.getPermissionsAsync();
    return actual.granted || (await Notifications.requestPermissionsAsync()).granted;
}

// Devuelve false si no hay permiso o falló, para que quien llame muestre otra alternativa
export async function mostrarNotificacion(titulo, cuerpo) {
    try {
        if (!(await conPermisoDeNotificaciones())) return false;
        await Notifications.scheduleNotificationAsync({ content: { title: titulo, body: cuerpo }, trigger: null });
        return true;
    } catch {
        return false;
    }
}

// Una sola lectura al firmar (no hay seguimiento continuo)
export async function obtenerUbicacion() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") throw new Error("Se necesita el permiso de ubicación para firmar.");
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitud: p.coords.latitude, longitud: p.coords.longitude };
}

//perfil
// origen: "camara" | "galeria". Devuelve el uri temporal o null si se canceló
export async function elegirFoto(origen) {
    const opciones = { allowsEditing: true, aspect: [1, 1], quality: 0.4 }; // recorte cuadrado y poco peso: es una miniatura
    if (origen === "camara") {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) throw new Error("Se necesita el permiso de cámara para tomar la foto.");
        const r = await ImagePicker.launchCameraAsync(opciones);
        return r.canceled ? null : r.assets[0].uri;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ ...opciones, mediaTypes: ["images"] }); // el selector del sistema no pide permiso
    return r.canceled ? null : r.assets[0].uri;
}