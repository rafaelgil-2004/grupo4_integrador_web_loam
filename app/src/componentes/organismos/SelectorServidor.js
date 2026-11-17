import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useTema } from "../../contexto/ContextoTema";
import { obtenerApiUrl, guardarApiUrl, leerServidores, guardarServidor, borrarServidor } from "../../configuracion";
import { radio } from "../../tema";
import Texto from "../atomos/Texto";
import Boton from "../atomos/Boton";
import CampoTexto from "../atomos/CampoTexto";

export default function SelectorServidor() {
    const { colores } = useTema();
    const [abierto, setAbierto] = useState(false);
    const [servidores, setServidores] = useState([]);
    const [activo, setActivo] = useState(obtenerApiUrl());
    const [nombre, setNombre] = useState("");
    const [url, setUrl] = useState("");
    const [estado, setEstado] = useState(null);

    useEffect(() => { leerServidores().then(setServidores); }, []);

    // guardarApiUrl actualiza la dirección en memoria: la siguiente llamada a la API ya usa la nueva
    async function usar(direccion) {
        setActivo(await guardarApiUrl(direccion));
        setEstado(null);
    }

    async function agregar() {
        if (!url.trim()) return;
        setServidores(await guardarServidor(nombre, url));
        await usar(url);
        setNombre(""); setUrl("");
    }

    // Consulta un endpoint público (la documentación de la API) con 5 s de espera.
    // Cualquier respuesta del servidor, incluso 401 o 403, prueba que la red y la IP están bien.
    async function probar() {
        setEstado("Probando...");
        const controlador = new AbortController();
        const espera = setTimeout(() => controlador.abort(), 5000);
        try {
            const r = await fetch(`${activo}/v3/api-docs`, { signal: controlador.signal });
            if (r.ok || r.status === 401 || r.status === 403) setEstado("✔ Servidor accesible.");
            else setEstado(`El servidor respondió ${r.status}. Revise que la dirección termine en /api.`);
        } catch {
            setEstado("✘ No se pudo conectar. Revise la IP, que estén en la misma red y el firewall.");
        } finally { clearTimeout(espera); }
    }

    return (
        <View style={{ marginTop: 32, gap: 8 }}>
            <Boton variante="enlace" texto={`Servidor: ${activo}`} onPress={() => setAbierto(!abierto)} />
            {abierto && (
                <View style={{ gap: 8 }}>
                    {servidores.map((s) => {
                        const esActivo = s.url === activo;
                        return (
                            <View key={s.url} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <Pressable onPress={() => usar(s.url)} accessibilityRole="button" accessibilityState={{ selected: esActivo }}
                                    style={{ flex: 1, minHeight: 48, justifyContent: "center", paddingHorizontal: 12, borderRadius: radio, borderWidth: 1,
                                             borderColor: esActivo ? colores.primario : colores.borde,
                                             backgroundColor: esActivo ? colores.primario : colores.superficie }}>
                                    <Texto color={esActivo ? "textoPrimario" : undefined} style={{ fontWeight: "600" }}>{s.nombre}</Texto>
                                    <Texto variante="pequenio" color={esActivo ? "textoPrimario" : "textoSuave"}>{s.url}</Texto>
                                </Pressable>
                                <Pressable onPress={() => borrarServidor(s.url).then(setServidores)} accessibilityRole="button"
                                    accessibilityLabel={`Quitar ${s.nombre}`}
                                    style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                                    <Texto color="textoSuave">✕</Texto>
                                </Pressable>
                            </View>
                        );
                    })}

                    <Boton texto="Probar conexión" variante="secundario" onPress={probar} />
                    {estado && <Texto accessibilityLiveRegion="polite">{estado}</Texto>}

                    <Texto variante="pequenio" color="textoSuave" style={{ marginTop: 8 }}>Agregar servidor</Texto>
                    <CampoTexto etiqueta="Nombre (ej.: Facu)" value={nombre} onChangeText={setNombre} />
                    <CampoTexto etiqueta="Dirección (ej.: http://172.17.138.55:8080/api)" value={url} onChangeText={setUrl}
                        autoCapitalize="none" autoCorrect={false} keyboardType="url" />
                    <Boton texto="Guardar y usar" onPress={agregar} deshabilitado={!url.trim()} />
                </View>
            )}
        </View>
    );
}