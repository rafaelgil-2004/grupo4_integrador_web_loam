import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fijarToken, registrarAlVencerSesion, obtenerDatosUsuario } from "../servicios/api";
import { guardarSesion, leerSesion, borrarSesion, guardarFoto, leerFoto, borrarCache } from "../servicios/almacenamiento";
import * as FileSystem from "expo-file-system/legacy";

const Contexto = createContext(null);

export function ProveedorAutenticacion({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [foto, setFoto] = useState(null);

    const cerrarSesion = useCallback(async () => {
        fijarToken(null);
        setUsuario(null);
        await borrarSesion();
        await borrarCache();
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

    // Carga la foto del usuario que inició sesión
    useEffect(() => {
        if (usuario?.id) leerFoto(usuario.id).then(setFoto); else setFoto(null);
    }, [usuario?.id]);

    // La copia al almacenamiento de la app evita perder la foto cuando el sistema limpia el uri temporal.
    // Nombre con marca de tiempo: así Image no muestra la versión anterior en caché.
    const cambiarFoto = useCallback(async (uriTemporal) => {
        const destino = `${FileSystem.documentDirectory}foto-${usuario.id}-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: uriTemporal, to: destino });
        if (foto) await FileSystem.deleteAsync(foto, { idempotent: true });
        await guardarFoto(usuario.id, destino);
        setFoto(destino);
    }, [usuario?.id, foto]);

    const valor = useMemo(() => ({ usuario, foto, cargando, confirmarSesion, cerrarSesion, cambiarFoto }),
        [usuario, foto, cargando, confirmarSesion, cerrarSesion, cambiarFoto]);
    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useAutenticacion = () => useContext(Contexto);