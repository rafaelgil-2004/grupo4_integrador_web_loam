import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fijarToken, registrarAlVencerSesion, obtenerDatosUsuario } from "../servicios/api";
import { guardarSesion, leerSesion, borrarSesion, guardarFoto, leerFoto, borrarCache } from "../servicios/almacenamiento";
import * as FileSystem from "expo-file-system/legacy";

//crea el contexto(mochila)
const Contexto = createContext(null);

//llenar el contexto(cargar la mochila)
export function ProveedorAutenticacion({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [foto, setFoto] = useState(null);

    const cerrarSesion = useCallback(async () => {
        fijarToken(null);//borrar token de memoria
        setUsuario(null);//volver al login
        await borrarSesion();//borrar los datos estaticos
        await borrarCache();
    }, []);

    //guarda el token e inicia secion
    const confirmarSesion = useCallback(async ({ token, usuario: datosUsuario }) => {
        fijarToken(token);
        await guardarSesion(token, datosUsuario);
        setUsuario(datosUsuario);
    }, []);

    //hay o no sesion, lo que usa cuando se habre la app
    useEffect(() => {
        registrarAlVencerSesion(cerrarSesion); // un 401 cierra la sesión
        (async () => {
            const guardada = await leerSesion();
            if (guardada) {
                fijarToken(guardada.token);
                setUsuario(guardada.usuario);
                obtenerDatosUsuario()
                    .then((actualizado) => { setUsuario(actualizado); return guardarSesion(guardada.token, actualizado); })
                    .catch(() => {});
            }
            setCargando(false);
        })();
    }, [cerrarSesion]);

    // Carga la foto del usuario 
    useEffect(() => {
        if (usuario?.id) leerFoto(usuario.id).then(setFoto); else setFoto(null);
    }, [usuario?.id]);

    const cambiarFoto = useCallback(async (uriTemporal) => {
        const destino = `${FileSystem.documentDirectory}foto-${usuario.id}-${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: uriTemporal, to: destino });
        if (foto) await FileSystem.deleteAsync(foto, { idempotent: true });
        await guardarFoto(usuario.id, destino);
        setFoto(destino);
    }, [usuario?.id, foto]);

    //control de cambio, cuando uno de los valores cambia redibuja a todos los que leen el contexto
    const valor = useMemo(() => ({ usuario, foto, cargando, confirmarSesion, cerrarSesion, cambiarFoto }),
        [usuario, foto, cargando, confirmarSesion, cerrarSesion, cambiarFoto]);
    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

//hook
export const useAutenticacion = () => useContext(Contexto);