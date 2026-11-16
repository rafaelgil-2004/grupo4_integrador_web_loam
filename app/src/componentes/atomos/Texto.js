import { Text } from "react-native";
import { useTema } from "../../contexto/ContextoTema";

const VARIANTES = {
    titulo: { fontSize: 24, fontWeight: "700" },
    subtitulo: { fontSize: 18, fontWeight: "600" },
    cuerpo: { fontSize: 16 },
    pequenio: { fontSize: 13 },
};

// Todo el texto de la app pasa por acá: así el tamaño de letra elegido en el perfil
// se aplica en todas las pantallas. "color" es una clave de la paleta o un color directo.
export default function Texto({ variante = "cuerpo", color = "texto", style, children, ...resto }) {
    const { colores, escala } = useTema();
    const base = VARIANTES[variante];
    return (
        <Text accessibilityRole={variante === "titulo" ? "header" : undefined} {...resto}
              style={[{ color: colores[color] ?? color, fontSize: base.fontSize * escala, fontWeight: base.fontWeight }, style]}>
            {children}
        </Text>
    );
}