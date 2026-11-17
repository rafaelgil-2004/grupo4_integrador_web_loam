import { useState } from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../../contexto/ContextoTema";
import { obtenerDocumentos } from "../../servicios/api";
import Texto from "../atomos/Texto";
import Insignia from "../atomos/Insignia";

// Nodo recursivo: convenio → (adendas/convenios hijos) + documentos. Los documentos se piden al expandir.
export default function NodoArbol({ nodo, nivel = 0, alAbrirConvenio, alAbrirDocumento }) {
    const { colores } = useTema();
    const [abierto, setAbierto] = useState(false);
    const [documentos, setDocumentos] = useState(null); // null = todavía no cargados

    async function alternar() {
        const nuevo = !abierto;
        setAbierto(nuevo);
        if (nuevo && documentos === null) {
            try { setDocumentos(await obtenerDocumentos(nodo.id)); } catch { setDocumentos([]); }
        }
    }

    return (
        <View>
            <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: nivel * 16, borderBottomWidth: 1, borderBottomColor: colores.superficie }}>
                <Pressable onPress={alternar} accessibilityRole="button" accessibilityLabel={abierto ? "Contraer" : "Expandir"}
                    style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                    <Ionicons name={abierto ? "chevron-down" : "chevron-forward"} size={20} color={colores.textoSuave} />
                </Pressable>
                <Pressable onPress={() => alAbrirConvenio(nodo)} accessibilityRole="button"
                    style={{ flex: 1, paddingVertical: 8, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Texto style={{ fontWeight: "700" }}>{nodo.codigo}</Texto>
                        <Insignia valor={nodo.estado} />
                    </View>
                    <Texto variante="pequenio" numberOfLines={2}>{nodo.titulo}</Texto>
                </Pressable>
            </View>

            {abierto && (
                <View>
                    {nodo.hijos?.map((h) => (
                        <NodoArbol key={h.id} nodo={h} nivel={nivel + 1} alAbrirConvenio={alAbrirConvenio} alAbrirDocumento={alAbrirDocumento} />
                    ))}
                    {documentos?.map((d) => (
                        <Pressable key={`d${d.id}`} onPress={() => alAbrirDocumento(d, nodo)} accessibilityRole="button"
                            style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingLeft: (nivel + 1) * 16 + 12 }}>
                            <Ionicons name="document-text-outline" size={18} color={colores.acento} />
                            <Texto variante="pequenio" style={{ flex: 1, color: colores.acento }} numberOfLines={1}>{d.nombre}</Texto>
                        </Pressable>
                    ))}
                    {documentos?.length === 0 && !nodo.hijos?.length && (
                        <Texto variante="pequenio" color="textoSuave" style={{ paddingLeft: (nivel + 1) * 16 + 12, paddingVertical: 8 }}>
                            Sin documentos.
                        </Texto>
                    )}
                </View>
            )}
        </View>
    );
}