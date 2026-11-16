import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { useTema } from "../contexto/ContextoTema";
import PantallaLogin from "../pantallas/PantallaLogin";
import PantallaProvisoria from "../pantallas/PantallaProvisoria";

// Decide qué se ve: cargando la sesión guardada → login → app.
// Cuando haya navegación real, PantallaProvisoria se reemplaza por NavegadorPrincipal.
export default function NavegadorRaiz() {
    const { usuario, cargando } = useAutenticacion();
    const { colores, modoOscuro } = useTema();
    return (
        <View style={{ flex: 1, backgroundColor: colores.fondo }}>
            <StatusBar style={modoOscuro ? "light" : "dark"} />
            {cargando
                ? <ActivityIndicator style={{ flex: 1 }} color={colores.primario} />
                : usuario ? <PantallaProvisoria /> : <PantallaLogin />}
        </View>
    );
}