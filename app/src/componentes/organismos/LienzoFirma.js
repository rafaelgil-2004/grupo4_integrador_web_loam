import { useRef } from "react";
import { PanResponder, View } from "react-native";
import { radio } from "../../tema";
//PanResponder: sistema de gestos de reactnative

export const ALTO_LIENZO = 180;

//la firma es una lista de trazos
/*
trazos: lo dibujado
onCambio: aviso de trazos nuevos
onTocar: devo tocando o levantado
onMedir: tamaño de la ¨hoja¨
soloLectura: para mostrar sin dejar escribir
*/
export default function LienzoFirma({ trazos, onCambio, onTocar, onMedir, soloLectura = false }) {
    /*
    useref crea contenedores que se mantienen actualizados, ya que 
    ya que panresponder se congela con lo primeor que entra
    */
    const trazosRef = useRef(trazos);//lista de trazos reciente
    trazosRef.current = trazos;
    const funciones = useRef({});//funciones mas recientes
    funciones.current = { onCambio, onTocar };

    //el panresponder actualizable
    const responder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true, //apollar el dedo: que el recuadro se quede con el gesto
        onPanResponderTerminationRequest: () => false, // que el ScrollView no robe el gesto
        onPanResponderGrant: (e) => { //con el dedo ya apoyado empieza un trazo nuebo
            funciones.current.onTocar?.(true);
            const { locationX: x, locationY: y } = e.nativeEvent;//cordenadas del toque
            //se crea un nuevo objeto porque react detecta cambios solo con obj nuevos
            trazosRef.current = [...trazosRef.current, [{ x, y }]];
            funciones.current.onCambio(trazosRef.current);//avisa que se creo un trazo nuevo
        },
        onPanResponderMove: (e) => {//al mover el dedo 
            const { locationX: x, locationY: y } = e.nativeEvent;
            //calculo de distancia ente puntos
            const actual = trazosRef.current[trazosRef.current.length - 1];//ultimo trazo
            const ultimo = actual[actual.length - 1]; //ultimo punto del trazo
            
            if (Math.hypot(x - ultimo.x, y - ultimo.y) < 3) return; //distancia menor a 3 pixeles
            //al ultimo tazo se le agrga el ultimo punto
            trazosRef.current = [...trazosRef.current.slice(0, -1), [...actual, { x, y }]];
            funciones.current.onCambio(trazosRef.current);//aviso de cambio
        },
        onPanResponderRelease: () => funciones.current.onTocar?.(false),//levantar el dedo
        onPanResponderTerminate: () => funciones.current.onTocar?.(false),//si el sista cancelo el movimiento
    })).current;

    return (
        <View {...(soloLectura ? {} : responder.panHandlers)} accessibilityLabel="Área para dibujar la firma"
            onLayout={(e) => onMedir?.(e.nativeEvent.layout)}//al teminar de dibujarse avisa el tamaño
            //se usa para generar el svg que se guarda en la bd
            style={{ height: ALTO_LIENZO, backgroundColor: "#FFFFFF", borderRadius: radio, borderWidth: 1,
                     borderColor: "#6C757D", overflow: "hidden" }}>
            <View pointerEvents="none" style={{ ...{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 } }}>
                {trazos.flatMap((t, i) => t.slice(1).map((p, j) => {
                    const a = t[j];
                    const dx = p.x - a.x, dy = p.y - a.y;
                    const largo = Math.hypot(dx, dy) + 1.5; // +1.5 para evitar huecos
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