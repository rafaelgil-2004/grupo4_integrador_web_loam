import { createContext, useContext, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

const Contexto = createContext({ estaConectado: true });

export function ProveedorConexion({ children }) {
    const [estaConectado, setEstaConectado] = useState(true);

    useEffect(() => {
        // Solo isConnected: isInternetReachable da "false" en un wifi sin salida a internet,
        // aunque la API de la red local sí responda
        return NetInfo.addEventListener((estado) => setEstaConectado(estado.isConnected === true));
    }, []);

    return <Contexto.Provider value={{ estaConectado }}>{children}</Contexto.Provider>;
}

export const useConexion = () => useContext(Contexto);