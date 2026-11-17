import { useState } from "react";
import { Alert, ScrollView, Switch, View } from "react-native";
import { useTema } from "../contexto/ContextoTema";
import { TIPOS_NOTIFICACION, mostrarAhora } from "../servicios/notificaciones";
import { radio } from "../tema";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";

export default function PantallaSimulacion() {
    const { colores } = useTema();
    const [conDemora, setConDemora] = useState(false);
    const [aviso, setAviso] = useState(null);

    async function disparar(tipo) {
        const entregada = await mostrarAhora(tipo, conDemora ? 5 : 0);
        if (!entregada) {
            // Sin permiso de notificaciones: se muestra igual, dentro de la app
            const { titulo, cuerpo } = TIPOS_NOTIFICACION[tipo];
            Alert.alert(titulo, cuerpo);
        }
        setAviso(entregada
            ? (conDemora ? "Programada: llega en 5 segundos. Puede salir de la app." : "Notificación enviada.")
            : "Sin permiso de notificaciones: se mostró como aviso dentro de la app.");
    }

    return (
        <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, gap: 14 }}>
            <Texto color="textoSuave">
                Zona de pruebas totalmente legal
            </Texto>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12,
                           backgroundColor: colores.superficie, borderRadius: radio, padding: 12 }}>
                <View style={{ flex: 1 }}>
                    <Texto style={{ fontWeight: "600" }}>Demorar 5 segundos</Texto>
                    <Texto variante="pequenio" color="textoSuave">salir de la app y ver llegar la notificación.</Texto>
                </View>
                <Switch value={conDemora} onValueChange={setConDemora} accessibilityLabel="Demorar 5 segundos" />
            </View>

            {Object.entries(TIPOS_NOTIFICACION).map(([tipo, datos]) => (
                <Boton key={tipo} texto={datos.etiqueta} variante="secundario" onPress={() => disparar(tipo)} />
            ))}

            {aviso && <Texto accessibilityLiveRegion="polite" style={{ fontWeight: "600" }}>{aviso}</Texto>}
        </ScrollView>
    );
}