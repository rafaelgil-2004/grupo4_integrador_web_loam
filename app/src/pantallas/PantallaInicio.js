import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { obtenerResumen, obtenerMovimientos, obtenerPendientes } from "../servicios/api";
import { guardarCache, leerCache } from "../servicios/almacenamiento";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";
import PanelResumen from "../componentes/organismos/PanelResumen";
import ListaConvenios from "../componentes/organismos/ListaConvenios";

export default function PantallaInicio({ navigation }) {
    const { colores } = useTema();
    const { estaConectado } = useConexion();
    const { usuario } = useAutenticacion();
    const [resumen, setResumen] = useState(null);
    const [movimientos, setMovimientos] = useState([]);
    const [pendientes, setPendientes] = useState([]);
    const [refrescando, setRefrescando] = useState(false);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        setError(null);
        if (!estaConectado) {
            // Sin conexión solo se ven los pendientes de firma (lo guardado la última vez)
            setResumen(null);
            setMovimientos([]);
            setPendientes((await leerCache("pendientes")) ?? []);
            return;
        }
        // Las tres consultas van en paralelo y una que falle no tapa a las otras
        const [r, m, p] = await Promise.allSettled([obtenerResumen(), obtenerMovimientos(10), obtenerPendientes(10)]);
        if (r.status === "fulfilled") setResumen(r.value);
        if (m.status === "fulfilled") setMovimientos(m.value);
        if (p.status === "fulfilled") { setPendientes(p.value); guardarCache("pendientes", p.value); }
        else setPendientes((await leerCache("pendientes")) ?? []);
        const fallo = [r, m, p].find((x) => x.status === "rejected");
        if (fallo) setError(fallo.reason.message);
    }, [estaConectado]);

    // Recarga al volver a la pestaña y cuando cambia la conexión (cargar depende de estaConectado)
    useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

    async function refrescar() {
        setRefrescando(true);
        await cargar();
        setRefrescando(false);
    }

    const abrir = (c) => navigation.navigate("Detalle", { id: c.id });

    return (
        <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, gap: 20 }}
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colores.primario]} />}>
            <AvisoSinConexion detalle="Solo se muestran los convenios pendientes de firma." />
            {error && <Texto color="error" accessibilityLiveRegion="polite">{error}</Texto>}

            <View>
                <Texto variante="titulo">Hola, {usuario.nombre}</Texto>
                {usuario.unidadNombre ? <Texto color="textoSuave">{usuario.unidadNombre}</Texto> : null}
            </View>

            {resumen && <PanelResumen resumen={resumen} alTocar={(filtros) => navigation.navigate("Buscar", { ...filtros, momento: Date.now() })} />}

            <View>
                <Texto variante="subtitulo" style={{ marginBottom: 4 }}>Mis pendientes</Texto>
                <ListaConvenios datos={pendientes.slice(0, 3)} alAbrir={abrir} mensajeVacio="No tenés convenios por firmar." />
                {pendientes.length > 0 && (
                    <Boton variante="enlace" texto={`Ver todos (${pendientes.length})`} onPress={() => navigation.navigate("Pendientes")} />
                )}
            </View>

            {estaConectado && (
                <View>
                    <Texto variante="subtitulo" style={{ marginBottom: 4 }}>Últimos movimientos</Texto>
                    <ListaConvenios datos={movimientos} alAbrir={abrir} mostrarActualizacion
                        mensajeVacio="Todavía no hay movimientos." />
                </View>
            )}
        </ScrollView>
    );
}