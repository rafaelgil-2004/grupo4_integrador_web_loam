import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { leerPreferencias, guardarPreferencias } from "../servicios/almacenamiento";
import { paletas, escalasLetra } from "../tema";


const Contexto = createContext(null);

export function ProveedorTema({ children }) {
    const sistema = useColorScheme();//modo del selular
    const [preferenciaOscuro, setPreferenciaOscuro] = useState(null); 
    //null = mantener la del sistema
    //true = oscuro
    //false = claro
    const [tamanioLetra, setTamanioLetra] = useState("mediana");

    //cargar lo guardado
    useEffect(() => {
        leerPreferencias().then((p) => {
            if (typeof p.modoOscuro === "boolean") setPreferenciaOscuro(p.modoOscuro);
            if (escalasLetra[p.tamanioLetra]) setTamanioLetra(p.tamanioLetra);
        });
    }, []);

    //si el usuario decido, sino lo del sistema
    const modoOscuro = preferenciaOscuro ?? sistema === "dark";

    //cambiar de modo
    const cambiarModoOscuro = useCallback((valor) => {
        setPreferenciaOscuro(valor);
        guardarPreferencias({ modoOscuro: valor });
    }, []);

    const cambiarTamanioLetra = useCallback((valor) => {
        setTamanioLetra(valor);
        guardarPreferencias({ tamanioLetra: valor });
    }, []);

    const valor = useMemo(() => ({
        modoOscuro, tamanioLetra, colores: paletas[modoOscuro ? "oscuro" : "claro"],
        escala: escalasLetra[tamanioLetra], cambiarModoOscuro, cambiarTamanioLetra,
    }), [modoOscuro, tamanioLetra, cambiarModoOscuro, cambiarTamanioLetra]);

    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useTema = () => useContext(Contexto);