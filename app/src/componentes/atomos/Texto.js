/*
se usa esto en vez del text de react para aplicar 
el estilo tipografico, los colores del tema y el tamano de letra
que elige el usuario
*/
import { Text } from "react-native";
import { useTema } from "../../contexto/ContextoTema";

const VARIANTES = {
    titulo: { fontSize: 24, fontWeight: "700" },
    subtitulo: { fontSize: 18, fontWeight: "600" },
    cuerpo: { fontSize: 16 },
    pequenio: { fontSize: 13 },
};

//
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