import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTema } from "../../contexto/ContextoTema";
import { useAutenticacion } from "../../contexto/ContextoAutenticacion";
import Texto from "../atomos/Texto";
import Avatar from "../atomos/Avatar";
import CampoBusqueda from "../moleculas/CampoBusqueda";

export default function EncabezadoApp({ navigation }) {
    const insets = useSafeAreaInsets();
    const { colores } = useTema();
    const { usuario, foto } = useAutenticacion();
    const [texto, setTexto] = useState("");

    // "momento" cambia en cada envío para que la pantalla de búsqueda se entere aunque el texto sea el mismo
    const buscar = () => navigation.navigate("Buscar", { texto: texto.trim(), momento: Date.now() });

    return (
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 12, flexDirection: "row",
                       alignItems: "center", gap: 10, backgroundColor: colores.superficie }}>
            <Texto style={{ fontWeight: "700", color: colores.acento }}>UNLPam</Texto>
            <CampoBusqueda valor={texto} onCambio={setTexto} onBuscar={buscar} />
            <Pressable onPress={() => navigation.navigate("Perfil")} accessibilityRole="button" accessibilityLabel="Mi perfil">
                <Avatar nombre={usuario.nombre} apellido={usuario.apellido} uri={foto} />
            </Pressable>
        </View>
    );
}