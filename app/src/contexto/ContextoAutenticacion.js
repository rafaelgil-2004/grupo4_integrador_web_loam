import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fijarToken, registrarAlVencerSesion, obtenerDatosUsuario } from "../servicios/api";
import { guardarSesion, leerSesion, borrarSesion } from "../servicios/almacenamiento";

const Contexto = createContext(null);

export function ProveedorAutenticacion({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    const cerrarSesion = useCallback(async () => {
        fijarToken(null);
        setUsuario(null);
        await borrarSesion();
    }, []);

    // La pantalla de login primero verifica credenciales y código; recién ahí llama a esto
    const confirmarSesion = useCallback(async ({ token, usuario: datosUsuario }) => {
        fijarToken(token);
        await guardarSesion(token, datosUsuario);
        setUsuario(datosUsuario);
    }, []);

    useEffect(() => {
        registrarAlVencerSesion(cerrarSesion); // un 401 en cualquier llamada cierra la sesión
        (async () => {
            const guardada = await leerSesion();
            if (guardada) {
                fijarToken(guardada.token);
                setUsuario(guardada.usuario); // se entra ya con lo guardado: sirve sin conexión
                // Se refresca en segundo plano. Si el token venció, el 401 cierra la sesión;
                // si no hay red, el error se ignora y se sigue con los datos guardados.
                obtenerDatosUsuario()
                    .then((actualizado) => { setUsuario(actualizado); return guardarSesion(guardada.token, actualizado); })
                    .catch(() => {});
            }
            setCargando(false);
        })();
    }, [cerrarSesion]);

    const valor = useMemo(() => ({ usuario, cargando, confirmarSesion, cerrarSesion }),
        [usuario, cargando, confirmarSesion, cerrarSesion]);
    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useAutenticacion = () => useContext(Contexto);