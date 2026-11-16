import { Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import { useTema } from "../contexto/ContextoTema";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { nombresLetra } from "../tema";

export default function PantallaProvisoria() {
    const { usuario, cerrarSesion } = useAutenticacion();
    const { colores, modoOscuro, tamanioLetra, cambiarModoOscuro, cambiarTamanioLetra } = useTema();
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo, padding: 24 }}>
            <Texto variante="titulo">Hola, {usuario.nombre}</Texto>
            <Texto color="textoSuave" style={{ marginBottom: 24 }}>
                {usuario.rol}{usuario.unidadNombre ? ` · ${usuario.unidadNombre}` : ""}
            </Texto>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Texto>Modo oscuro</Texto>
                <Switch value={modoOscuro} onValueChange={cambiarModoOscuro} accessibilityLabel="Modo oscuro" />
            </View>

            <Texto style={{ marginBottom: 8 }}>Tamaño de letra</Texto>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 32 }}>
                {Object.entries(nombresLetra).map(([clave, nombre]) => (
                    <Boton key={clave} texto={nombre} style={{ flex: 1 }}
                        variante={tamanioLetra === clave ? "primario" : "secundario"}
                        onPress={() => cambiarTamanioLetra(clave)} />
                ))}
            </View>

            <Boton texto="Cerrar sesión" variante="peligro" onPress={cerrarSesion} />
        </SafeAreaView>
    );
}