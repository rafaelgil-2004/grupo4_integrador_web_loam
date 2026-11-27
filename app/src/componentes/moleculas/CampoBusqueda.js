import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../contexto/ContextoTema";
import { radio } from "../../tema";
/*
valor: texto del campo
onCambio: funcion que se llama cuando escribe
onBuscar: funcion que se llama al buscar

*/
export default function CampoBusqueda({ valor, onCambio, onBuscar, placeholder = "Buscar convenios" }) {
    const { colores, escala } = useTema();
    return (
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colores.superficie,
                       borderRadius: radio, borderWidth: 1, borderColor: colores.borde }}>
            <TextInput value={valor} onChangeText={onCambio} onSubmitEditing={onBuscar} returnKeyType="search"
                placeholder={placeholder} placeholderTextColor={colores.textoSuave} accessibilityLabel={placeholder}
                style={{ flex: 1, minHeight: 44, paddingHorizontal: 12, fontSize: 15 * escala, color: colores.texto }} />
            <Pressable onPress={onBuscar} accessibilityRole="button" accessibilityLabel="Buscar"
                style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="search" size={20} color={colores.textoSuave} />
            </Pressable>
        </View>
    );
}