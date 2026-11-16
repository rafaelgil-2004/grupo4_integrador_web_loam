import { View } from "react-native";
import TarjetaResumen from "../moleculas/TarjetaResumen";

export default function PanelResumen({ resumen, alTocar }) {
    return (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <TarjetaResumen valor={resumen.firmadosUltimoAnio} titulo="Firmados en el último año" onPress={() => alTocar({ estado: "FIRMADO" })} />
            <TarjetaResumen valor={resumen.vigentes} titulo="Vigentes" onPress={() => alTocar({ vigencia: "VIGENTE" })} />
            <TarjetaResumen valor={resumen.enTramite} titulo="En trámite" />
            <TarjetaResumen valor={resumen.porVencer} titulo="Por vencer" onPress={() => alTocar({ vigencia: "POR_VENCER" })} />
            <TarjetaResumen valor={resumen.vencidos} titulo="Vencidos" onPress={() => alTocar({ vigencia: "EXPIRADO" })} />
        </View>
    );
}