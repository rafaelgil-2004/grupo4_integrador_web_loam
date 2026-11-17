import { Image, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../contexto/ContextoTema";
import { MANUAL } from "../ayuda";
import { radio } from "../tema";
import Texto from "../componentes/atomos/Texto";

export default function PantallaManual() {
    const { colores } = useTema();
    return (
        <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            <Texto color="textoSuave">Guía paso a paso para usar la aplicación.</Texto>
            {MANUAL.map((seccion) => (
                <View key={seccion.titulo} style={{ backgroundColor: colores.superficie, borderRadius: radio, padding: 14, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <Ionicons name={seccion.icono} size={24} color={colores.acento} />
                        <Texto variante="subtitulo" accessibilityRole="header" style={{ flex: 1 }}>{seccion.titulo}</Texto>
                    </View>
                    {seccion.pasos.map((paso, i) => (
                        <View key={i} style={{ gap: 6 }}>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                                <Texto style={{ fontWeight: "700", color: colores.acento }}>{i + 1}.</Texto>
                                <Texto style={{ flex: 1 }}>{paso.texto}</Texto>
                            </View>
                            {paso.imagen && (
                                <Image source={paso.imagen} resizeMode="contain" accessibilityLabel={`Captura: ${paso.texto}`}
                                    style={{ width: "100%", height: 220, borderRadius: radio }} />
                            )}
                        </View>
                    ))}
                </View>
            ))}
        </ScrollView>
    );
}