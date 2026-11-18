import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Share, TextInput, View, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { obtenerConvenio, obtenerDocumentos, obtenerObservaciones, agregarObservacion, subirDocumento } from "../servicios/api";
import { formatearFecha, formatearFechaHora } from "../utilidades";
import { radio } from "../tema";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import Insignia from "../componentes/atomos/Insignia";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";
import * as DocumentPicker from "expo-document-picker";

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

export default function PantallaDetalleConvenio({ route, navigation }) {
    const { id } = route.params;
    const { colores, escala } = useTema();
    const { estaConectado } = useConexion();
    const [convenio, setConvenio] = useState(null);
    const [documentos, setDocumentos] = useState([]);
    const [observaciones, setObservaciones] = useState([]);
    const [comentario, setComentario] = useState("");
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [subiendo, setSubiendo] = useState(false);
    const [mensajeSubida, setMensajeSubida] = useState(null);
    const { usuario } = useAutenticacion();
    const puedeFirmar = !!convenio && convenio.estado === "ACEPTADO" &&
    convenio.listaImplicados?.some((f) => f.usuarioId === usuario.id && !f.firmado);


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

    async function elegirYSubirPdf() {
        setMensajeSubida(null);
        // copyToCacheDirectory: sin esto Android entrega un content:// que uploadAsync no puede leer
        const r = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
        if (r.canceled) return;
        const archivo = r.assets[0];
        if (!archivo.name.toLowerCase().endsWith(".pdf")) {
            setMensajeSubida("Solo se pueden subir archivos PDF.");
            return;
        }
        setSubiendo(true);
        try {
            await subirDocumento(id, archivo.uri);
            setDocumentos(await obtenerDocumentos(id));
            setMensajeSubida("Documento subido. El servidor le agregó la marca de control.");
        } catch (e) {
            setMensajeSubida(e.message);
        }
        setSubiendo(false);
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
                    <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`Abrir ${d.nombre}`}
                        onPress={() => navigation.navigate("Visor", { documento: d, convenioId: id, codigo: convenio.codigo, puedeFirmar })}
                        style={({ pressed }) => ({ paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
                        <Texto style={{ fontWeight: "600", color: colores.acento }}>{d.nombre}</Texto>
                        <Texto variante="pequenio" color="textoSuave">
                            Subido por {d.subidoPorNombre} · {formatearFechaHora(d.fechaCarga)}
                        </Texto>
                        {d.sha256 ? <Texto variante="pequenio" color="textoSuave">SHA-256: {d.sha256.slice(0, 16)}…</Texto> : null}
                    </Pressable>
                )) : <Texto color="textoSuave">Sin documentos.</Texto>}
            
                <View style={{ marginTop: 8 }}>
                    <Boton texto={subiendo ? "Subiendo..." : "Subir documento (PDF)"} variante="secundario"
                        onPress={elegirYSubirPdf} deshabilitado={subiendo || !estaConectado} />
                </View>
                {mensajeSubida ? <Texto variante="pequenio" color="textoSuave">{mensajeSubida}</Texto> : null}
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