import { Pressable, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import Texto from "../atomos/Texto";
import Insignia from "../atomos/Insignia";
import { formatearFechaHora } from "../../utilidades";

/*
convenio: el que devuelve la api
*/
export default function FilaConvenio({ convenio, onPress, mostrarActualizacion = false }) {
    const { colores } = useTema();
    return (
        <Pressable onPress={onPress} accessibilityRole="button"
            accessibilityLabel={`Convenio ${convenio.codigo}, ${convenio.titulo}`}
            style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1,
                                       borderBottomColor: colores.superficie, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Texto style={{ fontWeight: "700" }}>{convenio.codigo}</Texto>
                <Insignia valor={convenio.estado} />
            </View>
            <Texto numberOfLines={2}>{convenio.titulo}</Texto>
            {mostrarActualizacion && (
                <Texto variante="pequenio" color="textoSuave">
                    Actualizado: {formatearFechaHora(convenio.fechaActualizacion)}
                </Texto>
            )}
        </Pressable>
    );
}