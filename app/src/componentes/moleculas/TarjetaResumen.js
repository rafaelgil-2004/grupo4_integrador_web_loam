import { Pressable, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import { radio } from "../../tema";
import Texto from "../atomos/Texto";

/*
onPress: funcion opcional para cuando se toca
*/
export default function TarjetaResumen({ valor, titulo, onPress }) {
    const { colores } = useTema();
    const Contenedor = onPress ? Pressable : View;
    return (
        <Contenedor onPress={onPress} accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={`${titulo}: ${valor}`}
            style={{ flex: 1, minWidth: "45%", backgroundColor: colores.superficie, borderRadius: radio, padding: 14,
                     borderLeftWidth: 4, borderLeftColor: colores.primario }}>
            <Texto variante="titulo">{valor ?? "—"}</Texto>
            <Texto variante="pequenio" color="textoSuave">{titulo}</Texto>
        </Contenedor>
    );
}