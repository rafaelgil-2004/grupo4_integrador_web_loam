import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Pdf from "react-native-pdf";
import * as FileSystem from "expo-file-system/legacy";

const PDF_DE_PRUEBA = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

export default function PruebaPdf({ onCerrar }) {
    const [archivo, setArchivo] = useState(null);
    const [estado, setEstado] = useState("Descargando...");
    const [pagina, setPagina] = useState("");

    useEffect(() => {
        FileSystem.downloadAsync(PDF_DE_PRUEBA, FileSystem.cacheDirectory + "prueba.pdf")
            .then((resultado) => setArchivo(resultado.uri))
            .catch((error) => setEstado(`Error al descargar: ${error.message}`));
    }, []);

    return (
        // Pantalla completa y SIN ScrollView alrededor: el visor necesita todos los gestos para él
        <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", padding: 12, gap: 8 }}>
                <Text style={{ flex: 1 }}>{estado} {pagina}</Text>
                <Pressable onPress={onCerrar} accessibilityRole="button" style={{ padding: 8 }}>
                    <Text style={{ fontWeight: "700" }}>Cerrar</Text>
                </Pressable>
            </View>
            {archivo && (
                <Pdf source={{ uri: archivo }} style={{ flex: 1 }} minScale={1} maxScale={5}
                    onLoadComplete={(paginas) => setEstado(`PDF cargado (${paginas} pág.).`)}
                    onPageChanged={(actual, total) => setPagina(`Página ${actual} de ${total}`)}
                    onError={(error) => setEstado(`Error del visor: ${String(error)}`)} />
            )}
        </View>
    );
}