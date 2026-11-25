import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import Pdf from "react-native-pdf";
import * as FileSystem from "expo-file-system/legacy";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { descargarDocumento } from "../servicios/api";
import { compartirPdf } from "../servicios/dispositivo";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";

export default function PantallaVisorPdf({ route, navigation }) {
    const { documento, convenioId, codigo, puedeFirmar } = route.params;
    const { colores } = useTema();
    const { estaConectado } = useConexion();
    const [archivo, setArchivo] = useState(null);
    const [error, setError] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [total, setTotal] = useState(0);
    const [avisoCompartir, setAvisoCompartir] = useState(null);

    useEffect(() => {
        navigation.setOptions({ title: documento.nombre });
        (async () => {
            const destino = `${FileSystem.cacheDirectory}documento-${documento.id}.pdf`;
            try {
                if (estaConectado) {
                    // Se baja a un archivo local con el token y el visor lee esa ruta (evita la red de blob-util)
                    await descargarDocumento(documento.id);
                } else if (!(await FileSystem.getInfoAsync(destino)).exists) {
                    throw new Error("Sin conexión y el documento no fue descargado antes.");
                }
                setArchivo(destino);
            } catch (e) { setError(e.message); }
        })();
    }, []);

    // Debe llegar a la última página para habilitar la firma
    const leyoTodo = total > 0 && pagina >= total;

    if (error) return <View style={{ flex: 1, backgroundColor: colores.fondo, padding: 24 }}><Texto color="error">{error}</Texto></View>;
    if (!archivo) return <View style={{ flex: 1, backgroundColor: colores.fondo, justifyContent: "center" }}><ActivityIndicator color={colores.primario} size="large" /></View>;

    return (
        <View style={{ flex: 1, backgroundColor: colores.fondo }}>
            {/* El visor va fuera de cualquier ScrollView/FlatList para que el zoom y el scroll propios funcionen */}
            <Pdf source={{ uri: archivo }} style={{ flex: 1 }} minScale={1} maxScale={5}
                onLoadComplete={(paginas) => setTotal(paginas)}
                onPageChanged={(p, paginas) => { setPagina(p); setTotal(paginas); }}
                onError={(e) => setError(`No se pudo abrir el PDF: ${String(e)}`)} />
            <View style={{ padding: 12, gap: 8, backgroundColor: colores.superficie }}>
                <Texto variante="pequenio" color="textoSuave" style={{ textAlign: "center" }}>
                    Página {pagina} de {total}
                </Texto>
                <Boton variante="secundario" texto="Compartir PDF"
                    onPress={() => compartirPdf(archivo, `Compartir ${documento.nombre}`).catch((e) => setAvisoCompartir(e.message))} />
                {avisoCompartir && <Texto variante="pequenio" color="error" style={{ textAlign: "center" }}>{avisoCompartir}</Texto>}
                {puedeFirmar && (
                    <>
                        <Boton texto="Firmar convenio" deshabilitado={!leyoTodo || !estaConectado}
                            onPress={() => navigation.navigate("Firma", { convenioId, codigo })} />
                        {!leyoTodo && <Texto variante="pequenio" color="textoSuave" style={{ textAlign: "center" }}>
                            Lea el documento hasta la última página para poder firmar.
                        </Texto>}
                    </>
                )}
            </View>
        </View>
    );
}