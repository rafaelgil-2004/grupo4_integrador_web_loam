import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { cargarApiUrl } from "./src/configuracion";
import { configurarNotificaciones } from "./src/servicios/dispositivo";
import { ProveedorTema } from "./src/contexto/ContextoTema";
import { ProveedorConexion } from "./src/contexto/ContextoConexion";
import { ProveedorAutenticacion } from "./src/contexto/ContextoAutenticacion";
import NavegadorRaiz from "./src/navegacion/NavegadorRaiz";

configurarNotificaciones();

export default function App() {
    const [listo, setListo] = useState(false);

    // La dirección de la API guardada en el celular se lee antes de que cualquier pantalla pida datos
    useEffect(() => { cargarApiUrl().finally(() => setListo(true)); }, []);
    if (!listo) return null;

    return (
        <SafeAreaProvider>
            <ProveedorTema>
                <ProveedorConexion>
                    <ProveedorAutenticacion>
                        <NavegadorRaiz />
                    </ProveedorAutenticacion>
                </ProveedorConexion>
            </ProveedorTema>
        </SafeAreaProvider>
    );
}