import { View } from "react-native";
import { useTema } from "../contexto/ContextoTema";
import Texto from "../componentes/atomos/Texto";

export default function PantallaEnConstruccion({ route }) {
    const { colores } = useTema();
    return (
        <View style={{ flex: 1, backgroundColor: colores.fondo, padding: 24 }}>
            <Texto variante="titulo">{route.name}</Texto>
            <Texto color="textoSuave">Pantalla en construcción.</Texto>
        </View>
    );
}