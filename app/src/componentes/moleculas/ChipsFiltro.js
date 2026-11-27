import { Pressable, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import Texto from "../atomos/Texto";

/*
opciones: lista de de objetos valor(traido de la api):texto(lo que se ve en pantalla)
permiteLimpiar: se puede desmarcar o no
onCambio
*/
export default function ChipsFiltro({ opciones, valor, onCambio, permiteLimpiar = true }) {
    const { colores } = useTema();
    return (
        /*
        key: react la necesita para elementos pertenecientes a listas, deve ser unica
        onCambio:
            -chip no activo: se elige
            -activo y permite limpiar: se desmarca
            -activo y no permite limpiar: no hace nada
        */
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