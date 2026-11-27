import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import { radio } from "../../tema";
import Texto from "./Texto";

/*
las primeras cuatro prop tienen us propia variable
lo que venga despues se junta todo en resto
para abarcar todo lo de textimput
secureTextEntry se deja por la implementacion del mostra/ocultar
*/
export default function CampoTexto({ etiqueta, error, secureTextEntry, style, ...resto }) {
    const { colores, escala } = useTema();//escala: tamaño de letra
    const [visible, setVisible] = useState(false);//se ve o no la contraseña
    
    return (
        <View style={[{ marginBottom: 16 }, style]}>
            <Texto variante="pequenio" color="textoSuave" style={{ marginBottom: 4 }}>{etiqueta}</Texto>
            <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: radio,
                           borderColor: error ? colores.error : colores.borde, backgroundColor: colores.superficie }}>
                <TextInput {...resto} secureTextEntry={secureTextEntry && !visible} accessibilityLabel={etiqueta}
                    placeholderTextColor={colores.textoSuave}
                    style={{ flex: 1, minHeight: 48, paddingHorizontal: 12, fontSize: 16 * escala, color: colores.texto }} />
                {secureTextEntry && (
                    <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button"
                        accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                        style={{ minHeight: 48, paddingHorizontal: 12, justifyContent: "center" }}>
                        <Texto variante="pequenio" color="acento">{visible ? "Ocultar" : "Mostrar"}</Texto>
                    </Pressable>
                )}
            </View>
            {error ? <Texto variante="pequenio" color="error" accessibilityLiveRegion="polite" style={{ marginTop: 4 }}>{error}</Texto> : null}
        </View>
    );
}