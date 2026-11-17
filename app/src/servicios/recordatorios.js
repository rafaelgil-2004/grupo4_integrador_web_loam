import * as Notifications from "expo-notifications";
import { RECORDATORIOS_MINUTOS } from "../configuracion";
import { TIPOS_NOTIFICACION } from "./notificaciones";

// Identificadores fijos: así se cancelan solo los recordatorios y no otras notificaciones programadas (la simulación)
const idDe = (i) => `recordatorio-${i}`;

export async function programarRecordatorios(cantidad) {
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return;
    const cuerpo = cantidad === 1
        ? TIPOS_NOTIFICACION.pendiente.cuerpo
        : `Aún tiene ${cantidad} convenios pendientes de su firma.`;
    await Promise.all(RECORDATORIOS_MINUTOS.map((minutos, i) => Notifications.scheduleNotificationAsync({
        identifier: idDe(i),
        content: { title: TIPOS_NOTIFICACION.pendiente.titulo, body: cuerpo },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutos * 60 },
    })));
}

export const cancelarRecordatorios = () => Promise.all(
    RECORDATORIOS_MINUTOS.map((_, i) => Notifications.cancelScheduledNotificationAsync(idDe(i)).catch(() => {}))
);