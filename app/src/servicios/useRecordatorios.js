import { useEffect } from "react";
import { AppState } from "react-native";
import { leerCache } from "./almacenamiento";
import { programarRecordatorios, cancelarRecordatorios } from "./recordatorios";

// Se usa una sola vez, en el navegador que solo existe con sesión iniciada.
// Al salir de la app programa los avisos si hay pendientes; al volver, los cancela.
export function useRecordatorios() {
    useEffect(() => {
        cancelarRecordatorios(); // por si quedaron de una ejecución anterior
        const suscripcion = AppState.addEventListener("change", async (estado) => {
            if (estado === "active") {
                await cancelarRecordatorios();
            } else if (estado === "background") {
                // Se lee la caché de pendientes (la que ya muestra Inicio y Pendientes): en segundo plano no se confía en la red
                const pendientes = (await leerCache("pendientes")) ?? [];
                if (pendientes.length > 0) await programarRecordatorios(pendientes.length);
            }
        });
        return () => { suscripcion.remove(); cancelarRecordatorios(); }; // al cerrar sesión no deben quedar avisos
    }, []);
}