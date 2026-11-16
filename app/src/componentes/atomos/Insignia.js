import { View } from "react-native";
import Texto from "./Texto";

// Los colores no cambian con el tema: son semánticos y todos cumplen contraste AA con su texto
const ESTADOS = {
    BORRADOR:   { texto: "Borrador",   fondo: "#6C757D", color: "#FFFFFF" },
    ACEPTADO:   { texto: "Aceptado",   fondo: "#0B5ED7", color: "#FFFFFF" },
    FIRMADO:    { texto: "Firmado",    fondo: "#146C2E", color: "#FFFFFF" },
    RESCINDIDO: { texto: "Rescindido", fondo: "#B02A37", color: "#FFFFFF" },
    ARCHIVADO:  { texto: "Archivado",  fondo: "#343A40", color: "#FFFFFF" },
    VIGENTE:    { texto: "Vigente",    fondo: "#146C2E", color: "#FFFFFF" },
    POR_VENCER: { texto: "Por vencer", fondo: "#FFC107", color: "#212529" },
    EXPIRADO:   { texto: "Vencido",    fondo: "#B02A37", color: "#FFFFFF" },
};

// Sirve tanto para el estado del convenio como para su vigencia (son claves distintas)
export default function Insignia({ valor }) {
    const datos = ESTADOS[valor];
    if (!datos) return null; // por ejemplo SIN_VENCIMIENTO: no lleva insignia
    return (
        <View style={{ backgroundColor: datos.fondo, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, alignSelf: "flex-start" }}>
            <Texto variante="pequenio" color={datos.color} style={{ fontWeight: "600" }}>{datos.texto}</Texto>
        </View>
    );
}