import { useRef } from "react";
import { PanResponder, View } from "react-native";
import { radio } from "../../tema";

export const ALTO_LIENZO = 180;

// Lienzo de firma a mano sin librerías nativas: un PanResponder captura los puntos y cada tramo
// se dibuja como una barra fina rotada (View). El estado vive en el padre; acá solo se dibuja y captura.
export default function LienzoFirma({ trazos, onCambio, onTocar, onMedir, soloLectura = false }) {
    const trazosRef = useRef(trazos);
    trazosRef.current = trazos;
    const funciones = useRef({});
    funciones.current = { onCambio, onTocar };

    const responder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false, // que el ScrollView no robe el gesto
        onPanResponderGrant: (e) => {
            funciones.current.onTocar?.(true);
            const { locationX: x, locationY: y } = e.nativeEvent;
            trazosRef.current = [...trazosRef.current, [{ x, y }]];
            funciones.current.onCambio(trazosRef.current);
        },
        onPanResponderMove: (e) => {
            const { locationX: x, locationY: y } = e.nativeEvent;
            const actual = trazosRef.current[trazosRef.current.length - 1];
            const ultimo = actual[actual.length - 1];
            if (Math.hypot(x - ultimo.x, y - ultimo.y) < 3) return; // descarta puntos casi iguales
            trazosRef.current = [...trazosRef.current.slice(0, -1), [...actual, { x, y }]];
            funciones.current.onCambio(trazosRef.current);
        },
        onPanResponderRelease: () => funciones.current.onTocar?.(false),
        onPanResponderTerminate: () => funciones.current.onTocar?.(false),
    })).current;

    return (
        <View {...(soloLectura ? {} : responder.panHandlers)} accessibilityLabel="Área para dibujar la firma"
            onLayout={(e) => onMedir?.(e.nativeEvent.layout)}
            style={{ height: ALTO_LIENZO, backgroundColor: "#FFFFFF", borderRadius: radio, borderWidth: 1,
                     borderColor: "#6C757D", overflow: "hidden" }}>
            <View pointerEvents="none" style={{ ...{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } }}>
                {trazos.flatMap((t, i) => t.slice(1).map((p, j) => {
                    const a = t[j];
                    const dx = p.x - a.x, dy = p.y - a.y;
                    const largo = Math.hypot(dx, dy) + 1.5; // +1.5 tapa las uniones
                    return (
                        <View key={`${i}-${j}`} style={{
                            position: "absolute", left: (a.x + p.x) / 2 - largo / 2, top: (a.y + p.y) / 2 - 1.5,
                            width: largo, height: 3, borderRadius: 1.5, backgroundColor: "#000000",
                            transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                        }} />
                    );
                }))}
            </View>
        </View>
    );
}