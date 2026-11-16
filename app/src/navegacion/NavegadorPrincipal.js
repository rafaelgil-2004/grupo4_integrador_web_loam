import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTema } from "../contexto/ContextoTema";
import EncabezadoApp from "../componentes/organismos/EncabezadoApp";
import PantallaInicio from "../pantallas/PantallaInicio";
import PantallaDetalleConvenio from "../pantallas/PantallaDetalleConvenio";
import PantallaEnConstruccion from "../pantallas/PantallaEnConstruccion";
import PantallaProvisoria from "../pantallas/PantallaProvisoria"; // hace de Perfil por ahora

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONOS = { Inicio: "home", Pendientes: "create", Buscar: "search", Perfil: "person" };

function Pestanias() {
    const { colores } = useTema();
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                // El buscador vive en el encabezado y se ve en todas las pestañas
                header: ({ navigation }) => <EncabezadoApp navigation={navigation} />,
                tabBarActiveTintColor: colores.acento,
                tabBarInactiveTintColor: colores.textoSuave,
                tabBarIcon: ({ color, size }) => <Ionicons name={ICONOS[route.name]} size={size} color={color} />,
            })}>
            <Tab.Screen name="Inicio" component={PantallaInicio} />
            <Tab.Screen name="Pendientes" component={PantallaEnConstruccion} />
            <Tab.Screen name="Buscar" component={PantallaEnConstruccion} />
            <Tab.Screen name="Perfil" component={PantallaProvisoria} />
        </Tab.Navigator>
    );
}

export default function NavegadorPrincipal() {
    const { colores, modoOscuro } = useTema();
    // Se parte del tema de React Navigation y se pisan sus colores con los del equipo
    const base = modoOscuro ? DarkTheme : DefaultTheme;
    const tema = { ...base, colors: { ...base.colors, background: colores.fondo, card: colores.superficie,
                                      text: colores.texto, border: colores.borde, primary: colores.acento } };
    return (
        <NavigationContainer theme={tema}>
            <Stack.Navigator>
                <Stack.Screen name="Pestanias" component={Pestanias} options={{ headerShown: false }} />
                <Stack.Screen name="Detalle" component={PantallaDetalleConvenio} options={{ title: "Convenio" }} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}