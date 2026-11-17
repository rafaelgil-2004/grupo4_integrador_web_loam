import { useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";
import { useTema } from "../contexto/ContextoTema";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { elegirFoto } from "../servicios/dispositivo";
import { nombresLetra, radio } from "../tema";
import { nombreRol } from "../utilidades";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import Avatar from "../componentes/atomos/Avatar";

function Dato({ etiqueta, valor }) {
    if (!valor) return null;
    return <Texto><Texto color="textoSuave">{etiqueta}: </Texto>{valor}</Texto>;
}

export default function PantallaPerfil() {
    const { usuario, foto, cambiarFoto, cerrarSesion } = useAutenticacion();
    const { colores, modoOscuro, tamanioLetra, cambiarModoOscuro, cambiarTamanioLetra } = useTema();
    const [error, setError] = useState(null);

    async function cargarFoto(origen) {
        setError(null);
        try {
            const uri = await elegirFoto(origen);
            if (uri) await cambiarFoto(uri);
        } catch (e) { setError(e.message); }
    }

    const opcionesFoto = () => Alert.alert("Foto de perfil", "¿Desde dónde la querés cargar?", [
        { text: "Cámara", onPress: () => cargarFoto("camara") },
        { text: "Galería", onPress: () => cargarFoto("galeria") },
        { text: "Cancelar", style: "cancel" },
    ]);

    const confirmarSalida = () => Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: cerrarSesion },
    ]);

    return (
        <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, gap: 20 }}>
            <View style={{ alignItems: "center", gap: 8 }}>
                <Pressable onPress={opcionesFoto} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil">
                    <Avatar nombre={usuario.nombre} apellido={usuario.apellido} tamanio={96} uri={foto} />
                </Pressable>
                <Boton variante="enlace" texto={foto ? "Cambiar foto" : "Agregar foto"} onPress={opcionesFoto} />
                {error && <Texto color="error" accessibilityLiveRegion="polite">{error}</Texto>}
                <Texto variante="titulo">{usuario.nombre} {usuario.apellido}</Texto>
            </View>

            <View style={{ backgroundColor: colores.superficie, borderRadius: radio, padding: 14, gap: 4 }}>
                <Dato etiqueta="Correo" valor={usuario.mail} />
                <Dato etiqueta="Rol" valor={nombreRol(usuario.rol)} />
                <Dato etiqueta="Unidad" valor={usuario.unidadNombre} />
            </View>

            <View style={{ gap: 12 }}>
                <Texto variante="subtitulo">Apariencia</Texto>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44 }}>
                    <Texto>Modo oscuro</Texto>
                    <Switch value={modoOscuro} onValueChange={cambiarModoOscuro} accessibilityLabel="Modo oscuro" />
                </View>
                <Texto>Tamaño de letra</Texto>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    {Object.entries(nombresLetra).map(([clave, nombre]) => (
                        <Boton key={clave} texto={nombre} style={{ flex: 1 }}
                            variante={tamanioLetra === clave ? "primario" : "secundario"}
                            onPress={() => cambiarTamanioLetra(clave)} />
                    ))}
                </View>
            </View>

            <Boton texto="Cerrar sesión" variante="peligro" onPress={confirmarSalida} />
        </ScrollView>
    );
}