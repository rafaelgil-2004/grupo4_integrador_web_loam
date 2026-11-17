import { View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import { radio } from "../../tema";
import Texto from "../atomos/Texto";

// Tarjeta con título para un grupo de chips. Si hay una opción elegida, el borde izquierdo se resalta
export default function GrupoFiltro({ titulo, activo = false, children }) {
    const { colores } = useTema();
    return (
        <View style={{ backgroundColor: colores.superficie, borderRadius: radio, padding: 12, gap: 8, borderLeftWidth: 4,
                       borderLeftColor: activo ? colores.primario : colores.borde }}>
            <Texto variante="pequenio" color="textoSuave" style={{ fontWeight: "700", textTransform: "uppercase" }}>{titulo}</Texto>
            {children}
        </View>
    );
}