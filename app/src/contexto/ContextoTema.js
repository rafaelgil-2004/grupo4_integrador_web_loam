import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { leerPreferencias, guardarPreferencias } from "../servicios/almacenamiento";
import { paletas, escalasLetra } from "../tema";

const Contexto = createContext(null);

export function ProveedorTema({ children }) {
    const sistema = useColorScheme();
    const [preferenciaOscuro, setPreferenciaOscuro] = useState(null); // null = seguir al sistema
    const [tamanioLetra, setTamanioLetra] = useState("mediana");

    useEffect(() => {
        leerPreferencias().then((p) => {
            if (typeof p.modoOscuro === "boolean") setPreferenciaOscuro(p.modoOscuro);
            if (escalasLetra[p.tamanioLetra]) setTamanioLetra(p.tamanioLetra);
        });
    }, []);

    const modoOscuro = preferenciaOscuro ?? sistema === "dark";

    const cambiarModoOscuro = useCallback((valor) => {
        setPreferenciaOscuro(valor);
        guardarPreferencias({ modoOscuro: valor });
    }, []);

    const cambiarTamanioLetra = useCallback((valor) => {
        setTamanioLetra(valor);
        guardarPreferencias({ tamanioLetra: valor });
    }, []);

    // useMemo: los componentes que usan useTema solo se vuelven a dibujar si algo cambió de verdad
    const valor = useMemo(() => ({
        modoOscuro, tamanioLetra, colores: paletas[modoOscuro ? "oscuro" : "claro"],
        escala: escalasLetra[tamanioLetra], cambiarModoOscuro, cambiarTamanioLetra,
    }), [modoOscuro, tamanioLetra, cambiarModoOscuro, cambiarTamanioLetra]);

    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useTema = () => useContext(Contexto);