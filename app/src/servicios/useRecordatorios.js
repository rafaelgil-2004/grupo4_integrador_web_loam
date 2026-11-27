import { useEffect } from "react";
import { AppState } from "react-native";
import { leerCache } from "./almacenamiento";
import { programarRecordatorios, cancelarRecordatorios } from "./recordatorios";

//mira si la app pasa a segundo plano o no
export function useRecordatorios() {
    useEffect(() => {
        cancelarRecordatorios(); // si quedaron de una ejecución anterior
        const suscripcion = AppState.addEventListener("change", async (estado) => {
            if (estado === "active") {
                await cancelarRecordatorios();
            } else if (estado === "background") {
                const pendientes = (await leerCache("pendientes")) ?? [];
                if (pendientes.length > 0) await programarRecordatorios(pendientes.length);
            }
        });
        return () => { suscripcion.remove(); cancelarRecordatorios(); }; // al cerrar sesión no deben quedar avisos
    }, []);
}