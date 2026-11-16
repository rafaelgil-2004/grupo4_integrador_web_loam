import { View } from "react-native";
import { useTema } from "../contexto/ContextoTema";
import Texto from "../componentes/atomos/Texto";

export default function PantallaDetalleConvenio({ route }) {
    const { colores } = useTema();
    return (
        <View style={{ flex: 1, backgroundColor: colores.fondo, padding: 24 }}>
            <Texto variante="titulo">Convenio n.º {route.params.id}</Texto>
            <Texto color="textoSuave">El detalle se arma en el próximo paso.</Texto>
        </View>
    );
}