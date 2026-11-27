import { View } from "react-native";
import Texto from "../atomos/Texto";
import FilaConvenio from "../moleculas/FilaConvenio";

/*
datos: lista de convenios sacada de la api
alAbrir: funcion que se llama al tocar el convenio
mensajeVacio: lo que se muestra si no tenes nada
*/
export default function ListaConvenios({ datos, alAbrir, mensajeVacio, mostrarActualizacion }) {
    //lista vacia
    if (!datos || datos.length === 0) return <Texto color="textoSuave">{mensajeVacio}</Texto>;
    return (
        <View>
            {datos.map((c) => (
                <FilaConvenio key={c.id} convenio={c} mostrarActualizacion={mostrarActualizacion} onPress={() => alAbrir(c)} />
            ))}
        </View>
    );
}