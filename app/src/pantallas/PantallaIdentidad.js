import { useCallback, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useTema } from "../contexto/ContextoTema";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { guardarIdentidad, leerIdentidad, borrarIdentidad, leerCredenciales, borrarCredenciales } from "../servicios/almacenamiento";
import { hayBiometria, autenticarConHuella, elegirFoto } from "../servicios/dispositivo";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import TarjetaIdentidad from "../componentes/moleculas/TarjetaIdentidad";
import LienzoFirma from "../componentes/organismos/LienzoFirma";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";

export default function PantallaIdentidad() {
    const { usuario } = useAutenticacion();
    const { colores } = useTema();
    const [firma, setFirma] = useState(null);          // trazos registrados
    const [trazos, setTrazos] = useState([]);          // trazos en edición
    const [editando, setEditando] = useState(false);
    const [dibujando, setDibujando] = useState(false);
    const [huella, setHuella] = useState({ disponible: false, activada: false });
    const [rostro, setRostro] = useState(null);        // uri de la selfie de referencia
    const [rostroNuevo, setRostroNuevo] = useState(null);
    const [mensaje, setMensaje] = useState(null);

    const cargar = useCallback(async () => {
        setFirma(await leerIdentidad(usuario.id, "firma"));
        setRostro(await leerIdentidad(usuario.id, "rostro"));
        // "Activada" = hay credenciales guardadas para el ingreso con huella (se ofrece al iniciar sesión)
        setHuella({ disponible: await hayBiometria(), activada: (await leerCredenciales()) !== null });
    }, [usuario.id]);

    useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

    // Envuelve cada acción para mostrar sus errores en un solo lugar
    const ejecutar = (accion) => async () => {
        setMensaje(null);
        try { await accion(); } catch (e) { setMensaje(e.message); }
    };

    const guardarFirma = ejecutar(async () => {
        if (!trazos.some((t) => t.length >= 2)) throw new Error("Dibuje su firma antes de guardarla.");
        await guardarIdentidad(usuario.id, "firma", trazos);
        setFirma(trazos); setEditando(false); setMensaje("Firma registrada.");
    });
    const eliminarFirma = ejecutar(async () => {
        await borrarIdentidad(usuario.id, "firma"); setFirma(null); setMensaje("Firma eliminada.");
    });

    const probarHuella = ejecutar(async () => {
        const ok = await autenticarConHuella("Verificar su identidad");
        setMensaje(ok ? "Huella verificada correctamente." : "No se pudo verificar la huella.");
    });
    const desactivarHuella = ejecutar(async () => {
        await borrarCredenciales(); setHuella((h) => ({ ...h, activada: false }));
        setMensaje("Ingreso con huella desactivado.");
    });

    const registrarRostro = ejecutar(async () => {
        const uri = await elegirFoto("camara", true);
        if (!uri) return;
        const destino = `${FileSystem.documentDirectory}rostro-${usuario.id}-${Date.now()}.jpg`; // nombre único: evita la caché de Image
        await FileSystem.copyAsync({ from: uri, to: destino });
        if (rostro) await FileSystem.deleteAsync(rostro, { idempotent: true });
        await guardarIdentidad(usuario.id, "rostro", destino);
        setRostro(destino); setRostroNuevo(null); setMensaje("Rostro de referencia registrado.");
    });
    const verificarRostro = ejecutar(async () => setRostroNuevo(await elegirFoto("camara", true)));
    const resolverVerificacion = (coincide) => {
        setRostroNuevo(null);
        setMensaje(coincide ? "Identidad facial verificada (simulado)." : "El rostro no coincide con el registrado.");
    };

    return (
        <ScrollView scrollEnabled={!dibujando} style={{ backgroundColor: colores.fondo }}
            contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
            <AvisoSinConexion detalle="La firma, el rostro y la huella se guardan en este celular, así que se pueden registrar igual." />
            {mensaje && <Texto accessibilityLiveRegion="polite" style={{ fontWeight: "600" }}>{mensaje}</Texto>}

            <TarjetaIdentidad titulo="Firma manual" registrado={!!firma}
                descripcion="Se guarda en este celular y se puede usar al firmar convenios.">
                {editando ? (
                    <>
                        <LienzoFirma trazos={trazos} onCambio={setTrazos} onTocar={setDibujando} />
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <Boton texto="Guardar" style={{ flex: 1 }} onPress={guardarFirma} />
                            <Boton texto="Borrar" variante="secundario" style={{ flex: 1 }} onPress={() => setTrazos([])} />
                        </View>
                        <Boton variante="enlace" texto="Cancelar" onPress={() => setEditando(false)} />
                    </>
                ) : (
                    <>
                        {firma && <LienzoFirma trazos={firma} soloLectura onCambio={() => {}} />}
                        <Boton texto={firma ? "Volver a registrar" : "Registrar firma"} variante="secundario"
                            onPress={() => { setTrazos([]); setEditando(true); }} />
                        {firma && <Boton variante="enlace" texto="Eliminar firma" onPress={eliminarFirma} />}
                    </>
                )}
            </TarjetaIdentidad>

            <TarjetaIdentidad titulo="Huella digital" registrado={huella.disponible && huella.activada}
                descripcion={!huella.disponible ? "Este equipo no tiene huella configurada."
                    : huella.activada ? "Activada para iniciar sesión y confirmar firmas."
                    : "Para activarla, inicie sesión con su clave y acepte la opción de huella."}>
                {huella.disponible && <Boton texto="Probar huella" variante="secundario" onPress={probarHuella} />}
                {huella.activada && <Boton variante="enlace" texto="Desactivar ingreso con huella" onPress={desactivarHuella} />}
            </TarjetaIdentidad>

            <TarjetaIdentidad titulo="Reconocimiento facial" registrado={!!rostro}
                descripcion="Se guarda una selfie de referencia. La verificación compara dos fotos a simple vista: no usa reconocimiento automático.">
                {rostro && !rostroNuevo && (
                    <Image source={{ uri: rostro }} accessibilityLabel="Rostro de referencia"
                        style={{ width: 120, height: 120, borderRadius: 60, alignSelf: "center" }} />
                )}
                {rostroNuevo ? (
                    <>
                        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                            <View style={{ alignItems: "center", gap: 4 }}>
                                <Image source={{ uri: rostro }} style={{ width: 110, height: 110, borderRadius: 55 }} accessibilityLabel="Registrado" />
                                <Texto variante="pequenio" color="textoSuave">Registrado</Texto>
                            </View>
                            <View style={{ alignItems: "center", gap: 4 }}>
                                <Image source={{ uri: rostroNuevo }} style={{ width: 110, height: 110, borderRadius: 55 }} accessibilityLabel="Nueva foto" />
                                <Texto variante="pequenio" color="textoSuave">Ahora</Texto>
                            </View>
                        </View>
                        <Texto>¿Es la misma persona?</Texto>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <Boton texto="Sí, coincide" style={{ flex: 1 }} onPress={() => resolverVerificacion(true)} />
                            <Boton texto="No" variante="secundario" style={{ flex: 1 }} onPress={() => resolverVerificacion(false)} />
                        </View>
                    </>
                ) : (
                    <>
                        <Boton texto={rostro ? "Volver a registrar rostro" : "Registrar rostro"} variante="secundario" onPress={registrarRostro} />
                        {rostro && <Boton texto="Verificar rostro" onPress={verificarRostro} />}
                    </>
                )}
            </TarjetaIdentidad>
        </ScrollView>
    );
}