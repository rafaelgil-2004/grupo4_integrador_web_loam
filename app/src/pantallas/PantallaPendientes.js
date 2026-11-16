import { useCallback, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { obtenerPendientes } from "../servicios/api";
import { guardarCache, leerCache } from "../servicios/almacenamiento";
import Texto from "../componentes/atomos/Texto";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";
import FilaConvenio from "../componentes/moleculas/FilaConvenio";

export default function PantallaPendientes({ navigation }) {
    const { colores } = useTema();
    const { estaConectado } = useConexion();
    const [pendientes, setPendientes] = useState([]);
    const [refrescando, setRefrescando] = useState(false);
    const [error, setError] = useState(null);

    const cargar = useCallback(async () => {
        setError(null);
        if (estaConectado) {
            try {
                const datos = await obtenerPendientes(100);
                setPendientes(datos);
                guardarCache("pendientes", datos); // última copia buena para el modo sin conexión
                return;
            } catch (e) { setError(e.message); }
        }
        setPendientes((await leerCache("pendientes")) ?? []);
    }, [estaConectado]);

    useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

    async function refrescar() {
        setRefrescando(true);
        await cargar();
        setRefrescando(false);
    }

    return (
        <FlatList
            style={{ backgroundColor: colores.fondo }}
            contentContainerStyle={{ padding: 16, flexGrow: 1 }}
            data={pendientes}
            keyExtractor={(c) => String(c.id)}
            refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[colores.primario]} />}
            ListHeaderComponent={
                <View>
                    <AvisoSinConexion detalle="Se muestran los pendientes guardados la última vez. Para firmar necesitás conexión." />
                    {error && <Texto color="error">{error}</Texto>}
                </View>
            }
            ListEmptyComponent={<Texto color="textoSuave">No tenés convenios por firmar.</Texto>}
            renderItem={({ item }) => (
                <FilaConvenio convenio={item} mostrarActualizacion onPress={() => navigation.navigate("Detalle", { id: item.id })} />
            )}
        />
    );
}