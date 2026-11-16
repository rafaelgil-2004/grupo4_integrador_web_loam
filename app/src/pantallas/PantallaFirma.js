import { useState } from "react";
import { ScrollView, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { firmar } from "../servicios/api";
import { hayBiometria, autenticarConHuella, obtenerUbicacion } from "../servicios/dispositivo";
import { formatearFechaHora, trazosASvg } from "../utilidades";
import { radio } from "../tema";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";
import LienzoFirma, { ALTO_LIENZO } from "../componentes/organismos/LienzoFirma";

export default function PantallaFirma({ route, navigation }) {
    const { convenioId, codigo } = route.params;
    const { colores } = useTema();
    const { estaConectado } = useConexion();
    const { usuario } = useAutenticacion();
    const [trazos, setTrazos] = useState([]);
    const [medida, setMedida] = useState({ width: 300, height: ALTO_LIENZO });
    const [dibujando, setDibujando] = useState(false);
    const [paso, setPaso] = useState(null);
    const [error, setError] = useState(null);
    const [comprobante, setComprobante] = useState(null);

    const hayFirma = trazos.some((t) => t.length >= 2);

    async function confirmarFirma() {
        setError(null);
        try {
            setPaso("Verificando identidad...");
            if (await hayBiometria()) {
                if (!(await autenticarConHuella(`Confirmar la firma del convenio ${codigo}`)))
                    throw new Error("No se pudo verificar su huella.");
            }
            setPaso("Obteniendo ubicación...");
            const ubicacion = await obtenerUbicacion();
            setPaso("Enviando firma...");
            const ruta = `${FileSystem.cacheDirectory}firma-${convenioId}.svg`;
            await FileSystem.writeAsStringAsync(ruta, trazosASvg(trazos, medida.width, medida.height));
            const r = await firmar(convenioId, { ...ubicacion, uriImagen: ruta });
            // La respuesta puede ser la firma o el convenio completo: se toma mi firma y, si falta algo, lo local
            const mia = r?.listaImplicados ? r.listaImplicados.find((f) => f.usuarioId === usuario.id) : r;
            setComprobante({
                fecha: mia?.fechaFirma ?? new Date().toISOString(),
                latitud: mia?.latitud ?? ubicacion.latitud,
                longitud: mia?.longitud ?? ubicacion.longitud,
            });
        } catch (e) { setError(e.message); }
        finally { setPaso(null); }
    }

    if (comprobante) {
        return (
            <View style={{ flex: 1, backgroundColor: colores.fondo, padding: 16, gap: 16 }}>
                <Texto variante="titulo" color="exito">Firma registrada</Texto>
                <View style={{ backgroundColor: colores.superficie, borderRadius: radio, padding: 14, gap: 4 }}>
                    <Texto style={{ fontWeight: "700" }}>Convenio {codigo}</Texto>
                    <Texto>Fecha y hora: {formatearFechaHora(comprobante.fecha)}</Texto>
                    <Texto>Latitud: {Number(comprobante.latitud).toFixed(5)}</Texto>
                    <Texto>Longitud: {Number(comprobante.longitud).toFixed(5)}</Texto>
                </View>
                <Boton texto="Volver a pendientes"
                    onPress={() => navigation.navigate("Pestanias", { screen: "Pendientes" })} />
            </View>
        );
    }

    return (
        <ScrollView scrollEnabled={!dibujando} style={{ backgroundColor: colores.fondo }}
            contentContainerStyle={{ padding: 16, gap: 16 }}>
            <AvisoSinConexion detalle="Para firmar necesita conexión." />
            <Texto variante="subtitulo">Firma del convenio {codigo}</Texto>
            <Texto color="textoSuave">Dibuje su firma en el recuadro. Al confirmar se pedirá su huella y se registrará su ubicación.</Texto>

            <LienzoFirma trazos={trazos} onCambio={setTrazos} onTocar={setDibujando} onMedir={setMedida} />
            <Boton variante="enlace" texto="Borrar y volver a firmar" onPress={() => setTrazos([])} />

            {error && <Texto color="error" accessibilityLiveRegion="polite">{error}</Texto>}
            {paso && <Texto color="textoSuave" accessibilityLiveRegion="polite">{paso}</Texto>}
            <Boton texto="Confirmar firma" onPress={confirmarFirma} deshabilitado={!hayFirma || !!paso || !estaConectado} />
        </ScrollView>
    );
}