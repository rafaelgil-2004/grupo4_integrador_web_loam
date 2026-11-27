import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTema } from "../../contexto/ContextoTema";
import { useAutenticacion } from "../../contexto/ContextoAutenticacion";
import Texto from "../atomos/Texto";
import Avatar from "../atomos/Avatar";
import CampoBusqueda from "../moleculas/CampoBusqueda";
import BotonAyuda from "../moleculas/BotonAyuda";

/*
se usa un ecabezado propio porque el estandar no lo permite
*/
export default function EncabezadoApp({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { colores } = useTema();
    const { usuario, foto } = useAutenticacion();
    const [texto, setTexto] = useState("");

    const buscar = () => navigation.navigate("Buscar", { texto: texto.trim(), momento: Date.now() });

    return (
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 12, flexDirection: "row",
                       alignItems: "center", gap: 10, backgroundColor: colores.superficie }}>
            <Texto style={{ fontWeight: "700", color: colores.acento }}>UNLPam</Texto>
            <CampoBusqueda valor={texto} onCambio={setTexto} onBuscar={buscar} />
            <BotonAyuda pantalla={route.name} />
            <Pressable onPress={() => navigation.navigate("Perfil")} accessibilityRole="button" accessibilityLabel="Mi perfil">
                <Avatar nombre={usuario.nombre} apellido={usuario.apellido} uri={foto} />
            </Pressable>
        </View>
    );
}