import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import NetInfo from "@react-native-community/netinfo";
import { cargarApiUrl, guardarApiUrl, obtenerApiUrl } from "./src/configuracion";

// /v3/api-docs es público en la API: sirve para comprobar la conexión sin iniciar sesión
async function probarApi(url) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 5000); // fetch no tiene timeout propio
    try {
        const respuesta = await fetch(`${url}/v3/api-docs`, { signal: controlador.signal });
        return { ok: respuesta.ok, detalle: `HTTP ${respuesta.status}` };
    } catch (error) {
        return { ok: false, detalle: error.name === "AbortError" ? "sin respuesta en 5 s" : error.message };
    } finally {
        clearTimeout(temporizador);
    }
}

export default function App() {
    const [campoUrl, setCampoUrl] = useState("");
    const [resultados, setResultados] = useState([]);
    const [probando, setProbando] = useState(false);
    const [PruebaPdf, setPruebaPdf] = useState(null);



    const ejecutarPruebas = useCallback(async () => {
        setProbando(true);
        const lista = [];
        const red = await NetInfo.fetch();
        lista.push({ nombre: "Red", ok: !!red.isConnected, detalle: red.type });
        lista.push({ nombre: `API (${obtenerApiUrl()})`, ...(await probarApi(obtenerApiUrl())) });
        try {
            await SecureStore.setItemAsync("prueba", "ok");
            const valor = await SecureStore.getItemAsync("prueba");
            lista.push({ nombre: "Almacenamiento seguro", ok: valor === "ok", detalle: valor ?? "sin valor" });
        } catch (error) {
            lista.push({ nombre: "Almacenamiento seguro", ok: false, detalle: error.message });
        }
        try {
            const hardware = await LocalAuthentication.hasHardwareAsync();
            const registrada = await LocalAuthentication.isEnrolledAsync();
            lista.push({ nombre: "Biometría", ok: hardware && registrada,
                detalle: !hardware ? "sin hardware" : registrada ? "disponible" : "sin huella registrada" });
        } catch (error) {
            lista.push({ nombre: "Biometría", ok: false, detalle: error.message });
        }
        setResultados(lista);
        setProbando(false);
    }, []);

    useEffect(() => {
        cargarApiUrl().then((url) => { setCampoUrl(url); ejecutarPruebas(); });
    }, [ejecutarPruebas]);

    const guardarYProbar = async () => {
        setCampoUrl(await guardarApiUrl(campoUrl));
        ejecutarPruebas();
    };

    const abrirPruebaPdf = () => {
        // require dentro del try: en Expo Go el módulo nativo no existe y la importación fallaría
        try { setPruebaPdf(() => require("./src/PruebaPdf").default); }
        catch (error) { setResultados((r) => [...r, { nombre: "Visor PDF", ok: false, detalle: error.message }]); }
    };

    if (PruebaPdf) {
    return (
        <SafeAreaProvider>
            <SafeAreaView style={estilos.pantalla}>
                <PruebaPdf onCerrar={() => setPruebaPdf(null)} />
            </SafeAreaView>
        </SafeAreaProvider>
    );
}
    return (
        <SafeAreaProvider>
            <SafeAreaView style={estilos.pantalla}>
                <StatusBar style="dark" />
                <ScrollView contentContainerStyle={estilos.contenido}>
                    <Text style={estilos.titulo}>Convenios UNLPam · diagnóstico</Text>

                    <Text style={estilos.etiqueta}>Dirección de la API</Text>
                    <TextInput style={estilos.campo} value={campoUrl} onChangeText={setCampoUrl}
                        autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                    <Pressable style={estilos.boton} onPress={guardarYProbar} accessibilityRole="button">
                        <Text style={estilos.textoBoton}>Guardar y probar</Text>
                    </Pressable>

                    {probando && <ActivityIndicator style={{ marginVertical: 16 }} />}
                    {resultados.map((r) => (
                        <View key={r.nombre} style={estilos.fila}>
                            <Text style={{ color: r.ok ? "#146c2e" : "#b02a37", fontWeight: "700" }}>{r.ok ? "✔" : "✘"} {r.nombre}</Text>
                            <Text style={estilos.detalle}>{r.detalle}</Text>
                        </View>
                    ))}

                    <Pressable style={[estilos.boton, estilos.botonSecundario]} onPress={abrirPruebaPdf} accessibilityRole="button">
                        <Text style={estilos.textoBoton}>Probar visor de PDF (solo build de desarrollo)</Text>
                    </Pressable>
                    {PruebaPdf && <PruebaPdf />}
                </ScrollView>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const estilos = StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: "#fff" },
    contenido: { padding: 20, gap: 8 },
    titulo: { fontSize: 20, fontWeight: "700", color: "#404040", marginBottom: 12 },
    etiqueta: { color: "#626262" },
    campo: { borderWidth: 1, borderColor: "#bbb", borderRadius: 8, padding: 10, color: "#212529" },
    boton: { backgroundColor: "#F26722", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 8 },
    botonSecundario: { backgroundColor: "#EB8022", marginTop: 20 },
    textoBoton: { color: "#212529", fontWeight: "600", textAlign: "center" },
    fila: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#eee" },
    detalle: { color: "#626262" },
});