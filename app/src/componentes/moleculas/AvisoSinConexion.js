import { View } from "react-native";
import { useConexion } from "../../contexto/ContextoConexion";
import Texto from "../atomos/Texto";

export default function AvisoSinConexion({ detalle }) {
    const { estaConectado } = useConexion();
    if (estaConectado) return null;
    return (
        <View accessibilityRole="alert" accessibilityLiveRegion="polite"
            style={{ backgroundColor: "#B02A37", padding: 10, borderRadius: 8, marginBottom: 12 }}>
            <Texto color="#FFFFFF" style={{ fontWeight: "600" }}>Estás sin conexión</Texto>
            {detalle ? <Texto variante="pequenio" color="#FFFFFF">{detalle}</Texto> : null}
        </View>
    );
}