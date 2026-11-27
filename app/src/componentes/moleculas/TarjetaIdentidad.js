import { View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import { radio } from "../../tema";
import Texto from "../atomos/Texto";

//registrado: true/false segun si esta cargado o no

export default function TarjetaIdentidad({ titulo, registrado, descripcion, children }) {
    const { colores } = useTema();
    return (
        <View style={{ backgroundColor: colores.superficie, borderRadius: radio, padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <Texto variante="subtitulo" style={{ flex: 1 }}>{titulo}</Texto>
                <Texto accessibilityLabel={registrado ? "Registrada" : "Sin registrar"}
                    color={registrado ? "exito" : "textoSuave"} style={{ fontWeight: "700" }}>
                    {registrado ? "● Registrada" : "○ Sin registrar"}
                </Texto>
            </View>
            {descripcion ? <Texto variante="pequenio" color="textoSuave">{descripcion}</Texto> : null}
            {children}
        </View>
    );
}