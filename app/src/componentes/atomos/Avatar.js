import { Image, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import Texto from "./Texto";

//
export default function Avatar({ nombre = "", apellido = "", tamanio = 36, uri = null }) {
    const { colores } = useTema();//se trae la propiedad colores directamente
    const iniciales = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();//iniciales para la imagen sin foto
    //la forma circular
    const forma = { width: tamanio, height: tamanio, borderRadius: tamanio / 2 };

    //con foto
    if (uri) return <Image source={{ uri }} accessibilityLabel={`Foto de ${nombre} ${apellido}`} style={forma} />;
    //sin foto
    return (
        <View accessibilityLabel={`${nombre} ${apellido}`}
            style={{ ...forma, backgroundColor: colores.primario, alignItems: "center", justifyContent: "center" }}>
            <Texto variante="pequenio" color="textoPrimario" style={{ fontWeight: "700" }}>{iniciales}</Texto>
        </View>
    );
}