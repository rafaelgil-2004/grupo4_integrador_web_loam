import { createContext, useContext, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
//control de conexion a internet
const Contexto = createContext({ estaConectado: true });

export function ProveedorConexion({ children }) {
    const [estaConectado, setEstaConectado] = useState(true);

    useEffect(() => {
        return NetInfo.addEventListener((estado) => setEstaConectado(estado.isConnected === true));
    }, []);

    return <Contexto.Provider value={{ estaConectado }}>{children}</Contexto.Provider>;
}

export const useConexion = () => useContext(Contexto);