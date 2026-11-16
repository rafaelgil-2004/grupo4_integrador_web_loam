import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Share, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { obtenerConvenio, obtenerDocumentos, obtenerObservaciones, agregarObservacion } from "../servicios/api";
import { formatearFecha, formatearFechaHora } from "../utilidades";
import { radio } from "../tema";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import Insignia from "../componentes/atomos/Insignia";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";

function Seccion({ titulo, children }) {
    return (
        <View style={{ gap: 6 }}>
            <Texto variante="subtitulo">{titulo}</Texto>
            {children}
        </View>
    );
}

function Dato({ etiqueta, valor }) {
    if (!valor) return null;
    return <Texto><Texto color="textoSuave">{etiqueta}: </Texto>{valor}</Texto>;
}

export default function PantallaDetalleConvenio({ route }) {
    const { id } = route.params;
    const { colores, escala } = useTema();
    const { estaConectado } = useConexion();
    const [convenio, setConvenio] = useState(null);
    const [documentos, setDocumentos] = useState([]);
    const [observaciones, setObservaciones] = useState([]);
    const [comentario, setComentario] = useState("");
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);

    const cargar = useCallback(async () => {
        if (!estaConectado) return;
        setError(null);
        const [c, d, o] = await Promise.allSettled([obtenerConvenio(id), obtenerDocumentos(id), obtenerObservaciones(id)]);
        if (c.status === "fulfilled") setConvenio(c.value); else setError(c.reason.message);
        if (d.status === "fulfilled") setDocumentos(d.value);
        if (o.status === "fulfilled") setObservaciones(o.value);
    }, [id, estaConectado]);

    // Recarga al volver desde el visor/firma, así el estado de los firmantes queda al día
    useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

    async function comentar() {
        if (!comentario.trim()) return;
        setEnviando(true);
        try {
            await agregarObservacion(id, comentario.trim());
            setComentario("");
            setObservaciones(await obtenerObservaciones(id));
        } catch (e) { setError(e.message); }
        setEnviando(false);
    }

    // Comparte texto plano con el selector nativo (mail, WhatsApp, etc.)
    const compartir = () => Share.share({
        message: `Convenio ${convenio.codigo}: ${convenio.titulo}\nEstado: ${convenio.estado}`,
    });

    if (!convenio) {
        return (
            <View style={{ flex: 1, backgroundColor: colores.fondo, padding: 16 }}>
                <AvisoSinConexion detalle="El detalle del convenio requiere conexión." />
                {error ? <Texto color="error">{error}</Texto> : estaConectado ? <ActivityIndicator color={colores.primario} /> : null}
            </View>
        );
    }

    return (
        <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, gap: 20 }}
            keyboardShouldPersistTaps="handled">
            <AvisoSinConexion detalle="Los datos pueden estar desactualizados." />
            {error && <Texto color="error" accessibilityLiveRegion="polite">{error}</Texto>}

            <View style={{ gap: 6 }}>
                <Texto variante="titulo">{convenio.codigo}</Texto>
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <Insignia valor={convenio.estado} />
                    <Insignia valor={convenio.vigencia} />
                </View>
                <Texto>{convenio.titulo}</Texto>
            </View>

            <Seccion titulo="Datos">
                <Dato etiqueta="Tipo" valor={convenio.tipo} />
                <Dato etiqueta="Subtipo" valor={convenio.subtipo} />
                <Dato etiqueta="Unidad" valor={convenio.unidad?.nombre} />
                <Dato etiqueta="Organización" valor={convenio.organizacion} />
                <Dato etiqueta="Objeto" valor={convenio.objeto} />
                <Dato etiqueta="Resolución" valor={convenio.resolucion} />
                <Dato etiqueta="Expediente" valor={convenio.expediente} />
                <Dato etiqueta="Inicio" valor={convenio.fechaInicio && formatearFecha(convenio.fechaInicio)} />
                <Dato etiqueta="Vencimiento" valor={convenio.fechaVencimiento && formatearFecha(convenio.fechaVencimiento)} />
                <Dato etiqueta="Firma" valor={convenio.fechaFirma && formatearFecha(convenio.fechaFirma)} />
            </Seccion>

            <Seccion titulo="Firmantes">
                {convenio.listaImplicados?.length ? convenio.listaImplicados.map((f) => (
                    <View key={f.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                        <Texto style={{ flex: 1 }}>{f.usuarioNombre}</Texto>
                        <Texto color={f.firmado ? "exito" : "textoSuave"}>
                            {f.firmado ? `Firmó ${formatearFechaHora(f.fechaFirma)}` : "Pendiente"}
                        </Texto>
                    </View>
                )) : <Texto color="textoSuave">Sin firmantes asignados.</Texto>}
            </Seccion>

            <Seccion titulo="Documentos">
                {documentos.length ? documentos.map((d) => (
                    <View key={d.id} style={{ paddingVertical: 6 }}>
                        <Texto style={{ fontWeight: "600" }}>{d.nombre}</Texto>
                        <Texto variante="pequenio" color="textoSuave">
                            Subido por {d.subidoPorNombre} · {formatearFechaHora(d.fechaCarga)}
                        </Texto>
                        {/* El onPress que abre el visor PDF se agrega en el próximo paso */}
                    </View>
                )) : <Texto color="textoSuave">Sin documentos.</Texto>}
            </Seccion>

            <Seccion titulo="Comentarios">
                {observaciones.length ? observaciones.map((o, i) => (
                    <View key={o.id ?? i} style={{ backgroundColor: colores.superficie, borderRadius: radio, padding: 10 }}>
                        <Texto variante="pequenio" color="textoSuave">{o.usuarioNombre} · {formatearFechaHora(o.fechaHora)}</Texto>
                        <Texto>{o.texto}</Texto>
                    </View>
                )) : <Texto color="textoSuave">Todavía no hay comentarios.</Texto>}
                <TextInput value={comentario} onChangeText={setComentario} multiline placeholder="Escribí un comentario"
                    placeholderTextColor={colores.textoSuave} accessibilityLabel="Nuevo comentario"
                    style={{ minHeight: 70, textAlignVertical: "top", padding: 10, fontSize: 15 * escala, color: colores.texto,
                             backgroundColor: colores.superficie, borderRadius: radio, borderWidth: 1, borderColor: colores.borde }} />
                <Boton texto={enviando ? "Enviando..." : "Comentar"} onPress={comentar} deshabilitado={enviando || !estaConectado} />
            </Seccion>

            <Boton variante="enlace" texto="Compartir convenio" onPress={compartir} />
        </ScrollView>
    );
}