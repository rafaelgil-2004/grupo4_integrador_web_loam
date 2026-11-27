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
    //bandera para saber que todo esta listo
    const [listo, setListo] = useState(false);

    //leer la ip del selector
    useEffect(() => { cargarApiUrl().finally(() => setListo(true)); }, []);
    if (!listo) return null;

    /*
    safearea: zona segura para colocar contenido
    proveedores: para que puedan acceder al contexto
    */
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