import { View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import Texto from "./Texto";

// Por ahora solo iniciales; cuando exista la foto de perfil se agrega una Image acá
export default function Avatar({ nombre = "", apellido = "", tamanio = 36 }) {
    const { colores } = useTema();
    const iniciales = `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
    return (
        <View accessibilityLabel={`${nombre} ${apellido}`}
            style={{ width: tamanio, height: tamanio, borderRadius: tamanio / 2, backgroundColor: colores.primario,
                     alignItems: "center", justifyContent: "center" }}>
            <Texto variante="pequenio" color="textoPrimario" style={{ fontWeight: "700" }}>{iniciales}</Texto>
        </View>
    );
}