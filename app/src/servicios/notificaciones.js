import * as Notifications from "expo-notifications";
import { mostrarNotificacion } from "./dispositivo";

// Catálogo único: la simulación y, más adelante, los recordatorios usan los mismos textos
export const TIPOS_NOTIFICACION = {
    nuevo:      { etiqueta: "Convenio nuevo",              titulo: "Nuevo convenio",         cuerpo: "Se le asignó un convenio para firmar." },
    comentario: { etiqueta: "Comentario o cambio de datos", titulo: "Convenio actualizado",   cuerpo: "Hay un comentario nuevo o cambiaron los datos de un convenio." },
    cancelado:  { etiqueta: "Convenio cancelado",          titulo: "Convenio cancelado",     cuerpo: "Un convenio en el que participa fue rescindido." },
    pendiente:  { etiqueta: "Convenio por firmar",         titulo: "Tiene convenios por firmar", cuerpo: "Aún tiene un convenio pendiente de su firma." },
    novedades:  { etiqueta: "Hay novedades",               titulo: "Hay novedades",          cuerpo: "Hubo movimientos en sus convenios desde su última visita." },
};

// demoraSegundos > 0 programa la notificación: permite cerrar la app y ver que llega igual
export async function mostrarAhora(tipo, demoraSegundos = 0) {
    const { titulo, cuerpo } = TIPOS_NOTIFICACION[tipo];
    if (demoraSegundos <= 0) return mostrarNotificacion(titulo, cuerpo); // devuelve false si no hay permiso
    const permiso = await Notifications.getPermissionsAsync();
    if (!permiso.granted) return false;
    await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: cuerpo },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: demoraSegundos },
    });
    return true;
}