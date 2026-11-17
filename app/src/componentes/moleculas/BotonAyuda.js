import { Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTema } from "../../contexto/ContextoTema";
import { AYUDAS } from "../../ayuda";

// Se usa en el encabezado de las pestañas y de las pantallas del Stack. Sin texto de ayuda para esa pantalla, no se dibuja.
export default function BotonAyuda({ pantalla }) {
    const navigation = useNavigation();
    const { colores } = useTema();
    const texto = AYUDAS[pantalla];
    if (!texto) return null;
    return (
        <Pressable accessibilityRole="button" accessibilityLabel="Ayuda de esta pantalla"
            onPress={() => Alert.alert("Ayuda", texto, [
                { text: "Ver manual", onPress: () => navigation.navigate("Manual") },
                { text: "Cerrar", style: "cancel" },
            ])}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="help-circle-outline" size={26} color={colores.acento} />
        </Pressable>
    );
}