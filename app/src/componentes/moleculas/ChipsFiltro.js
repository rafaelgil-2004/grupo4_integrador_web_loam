import { Pressable, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import Texto from "../atomos/Texto";

// Selección única. Tocar la opción activa la limpia (salvo permiteLimpiar=false)
export default function ChipsFiltro({ opciones, valor, onCambio, permiteLimpiar = true }) {
    const { colores } = useTema();
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {opciones.map((o) => {
                const activa = o.valor === valor;
                return (
                    <Pressable key={o.valor} accessibilityRole="button" accessibilityState={{ selected: activa }}
                        onPress={() => onCambio(activa && permiteLimpiar ? null : o.valor)}
                        style={{ minHeight: 40, paddingHorizontal: 14, justifyContent: "center", borderRadius: 20, borderWidth: 1,
                                 borderColor: activa ? colores.primario : colores.borde,
                                 backgroundColor: activa ? colores.primario : colores.fondo }}>
                        <Texto variante="pequenio" color={activa ? "textoPrimario" : undefined}>{o.texto}</Texto>
                    </Pressable>
                );
            })}
        </View>
    );
}