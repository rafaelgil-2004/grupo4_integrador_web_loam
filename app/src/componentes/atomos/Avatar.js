import { Image, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import Texto from "./Texto";

// Con foto muestra la miniatura; sin foto, las iniciales
export default function Avatar({ nombre = "", apellido = "", tamanio = 36, uri = null }) {
    const { colores } = useTema();
    const iniciales = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
    const forma = { width: tamanio, height: tamanio, borderRadius: tamanio / 2 };
    if (uri) return <Image source={{ uri }} accessibilityLabel={`Foto de ${nombre} ${apellido}`} style={forma} />;
    return (
        <View accessibilityLabel={`${nombre} ${apellido}`}
            style={{ ...forma, backgroundColor: colores.primario, alignItems: "center", justifyContent: "center" }}>
            <Texto variante="pequenio" color="textoPrimario" style={{ fontWeight: "700" }}>{iniciales}</Texto>
        </View>
    );
}