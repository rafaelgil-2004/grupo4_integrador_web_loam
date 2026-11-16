import { ActivityIndicator, Pressable } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import { radio } from "../../tema";
import Texto from "./Texto";

export default function Boton({ texto, onPress, variante = "primario", cargando = false, deshabilitado = false, style }) {
    const { colores } = useTema();
    const inactivo = deshabilitado || cargando;
    const variantes = {
        primario:   { fondo: colores.primario, texto: colores.textoPrimario, borde: colores.primario },
        secundario: { fondo: "transparent", texto: colores.texto, borde: colores.borde },
        peligro:    { fondo: "transparent", texto: colores.error, borde: colores.error },
        enlace:     { fondo: "transparent", texto: colores.acento, borde: "transparent" },
    };
    const v = variantes[variante];
    return (
        <Pressable onPress={onPress} disabled={inactivo} accessibilityRole="button" accessibilityLabel={texto}
            accessibilityState={{ disabled: inactivo, busy: cargando }}
            style={({ pressed }) => [{
                minHeight: 48, borderRadius: radio, borderWidth: 1, paddingHorizontal: 16, alignItems: "center",
                justifyContent: "center", backgroundColor: v.fondo, borderColor: v.borde,
                opacity: inactivo ? 0.5 : pressed ? 0.8 : 1,
            }, style]}>
            {cargando ? <ActivityIndicator color={v.texto} />
                      : <Texto color={v.texto} style={{ fontWeight: "600", textAlign: "center" }}>{texto}</Texto>}
        </Pressable>
    );
}