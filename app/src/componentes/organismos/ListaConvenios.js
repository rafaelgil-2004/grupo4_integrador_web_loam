import { View } from "react-native";
import Texto from "../atomos/Texto";
import FilaConvenio from "../moleculas/FilaConvenio";

// Usa map y no FlatList porque va dentro de un ScrollView (anidar listas virtualizadas da avisos
// y mala performance). Las pantallas que son solo una lista larga usarán FlatList directamente.
export default function ListaConvenios({ datos, alAbrir, mensajeVacio, mostrarActualizacion }) {
    if (!datos || datos.length === 0) return <Texto color="textoSuave">{mensajeVacio}</Texto>;
    return (
        <View>
            {datos.map((c) => (
                <FilaConvenio key={c.id} convenio={c} mostrarActualizacion={mostrarActualizacion} onPress={() => alAbrir(c)} />
            ))}
        </View>
    );
}