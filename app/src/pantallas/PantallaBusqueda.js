import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { buscarConvenios, obtenerArbol } from "../servicios/api";
import Texto from "../componentes/atomos/Texto";
import AvisoSinConexion from "../componentes/moleculas/AvisoSinConexion";
import ChipsFiltro from "../componentes/moleculas/ChipsFiltro";
import FilaConvenio from "../componentes/moleculas/FilaConvenio";
import NodoArbol from "../componentes/organismos/NodoArbol";
import GrupoFiltro from "../componentes/moleculas/GrupoFiltro";

const ESTADOS = [
    { valor: "BORRADOR", texto: "Borrador" }, { valor: "ACEPTADO", texto: "Aceptado" }, { valor: "FIRMADO", texto: "Firmado" },
    { valor: "RESCINDIDO", texto: "Rescindido" }, { valor: "ARCHIVADO", texto: "Archivado" },
];
const VIGENCIAS = [
    { valor: "VIGENTE", texto: "Vigente" }, { valor: "POR_VENCER", texto: "Por vencer" }, { valor: "EXPIRADO", texto: "Vencido" },
];
const MODOS = [{ valor: "lista", texto: "Lista" }, { valor: "arbol", texto: "Árbol" }];

export default function PantallaBusqueda({ route, navigation }) {
    const { colores } = useTema();
    const { estaConectado } = useConexion();
    const [filtros, setFiltros] = useState({ texto: "", estado: null, vigencia: null });
    const [modo, setModo] = useState("lista");
    const [resultados, setResultados] = useState([]);
    const [arbol, setArbol] = useState([]);
    const [pagina, setPagina] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    //si se abre con una busqueda ya echa
    useEffect(() => {
        const p = route.params;
        if (p?.momento) setFiltros({ texto: p.texto ?? "", estado: p.estado ?? null, vigencia: p.vigencia ?? null });
    }, [route.params?.momento]);

    //pedir los datos al servidor
    const cargar = useCallback(async (nuevaPagina = 0) => {
        if (!estaConectado) return;
        setCargando(true);
        setError(null);
        const f = { q: filtros.texto, estado: filtros.estado, vigencia: filtros.vigencia };
        try {
            if (modo === "arbol") {
                setArbol(await obtenerArbol(f));
            } else {
                const r = await buscarConvenios(f, nuevaPagina);
                setResultados((previos) => (nuevaPagina === 0 ? r.content : [...previos, ...r.content]));
                setPagina(r.page.number);
                setTotalPaginas(r.page.totalPages);
            }
        } catch (e) { setError(e.message); }
        finally { setCargando(false); }
    }, [filtros, modo, estaConectado]);

    //vuelve abuscar cuando se hace un cambio(conexion, filtro)
    useEffect(() => { cargar(0); }, [cargar]);

    const abrirConvenio = (c) => navigation.navigate("Detalle", { id: c.id });
    const abrirDocumento = (d, c) => navigation.navigate("Visor", { documento: d, convenioId: c.id, codigo: c.codigo, puedeFirmar: false });
    const cambiar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }));

    const activos = [filtros.estado, filtros.vigencia, filtros.texto].filter(Boolean).length;
    const limpiar = () => setFiltros({ texto: "", estado: null, vigencia: null });

    const controles = (
        <View style={{ padding: 16, gap: 12 }}>
            <AvisoSinConexion detalle="La búsqueda requiere conexión." />
    
            <GrupoFiltro titulo="Mostrar como">
                <ChipsFiltro opciones={MODOS} valor={modo} onCambio={setModo} permiteLimpiar={false} />
            </GrupoFiltro>
    
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                {activos > 0 && (
                    <Pressable onPress={limpiar} accessibilityRole="button" accessibilityLabel="Limpiar todos los filtros"
                        style={{ minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 8 }}>
                        <Texto style={{ color: colores.acento, fontWeight: "600" }}>Limpiar</Texto>
                    </Pressable>
                )}
            </View>
            
            {filtros.texto ? (
                <Pressable onPress={() => cambiar("texto")("")} accessibilityRole="button" accessibilityLabel="Quitar texto de búsqueda"
                    style={{ minHeight: 44, justifyContent: "center" }}>
                    <Texto color="textoSuave">Texto: “{filtros.texto}”  ✕</Texto>
                </Pressable>
            ) : null}
    
            <GrupoFiltro titulo="Estado" activo={!!filtros.estado}>
                <ChipsFiltro opciones={ESTADOS} valor={filtros.estado} onCambio={cambiar("estado")} />
            </GrupoFiltro>
        
            <GrupoFiltro titulo="Vigencia" activo={!!filtros.vigencia}>
                <ChipsFiltro opciones={VIGENCIAS} valor={filtros.vigencia} onCambio={cambiar("vigencia")} />
            </GrupoFiltro>
        
            {error && <Texto color="error" accessibilityLiveRegion="polite">{error}</Texto>}
        </View>
    );

    const vacio = !cargando && !error && (
        <Texto color="textoSuave" style={{ padding: 16 }}>No se encontraron convenios con esos filtros.</Texto>
    );

    if (modo === "arbol") {
        return (
            <ScrollView style={{ backgroundColor: colores.fondo }}>
                {controles}
                {cargando && <ActivityIndicator color={colores.primario} />}
                <View style={{ paddingHorizontal: 8 }}>
                    {arbol.map((n) => <NodoArbol key={n.id} nodo={n} alAbrirConvenio={abrirConvenio} alAbrirDocumento={abrirDocumento} />)}
                </View>
                {arbol.length === 0 && vacio}
            </ScrollView>
        );
    }

    return (
        <FlatList
            style={{ backgroundColor: colores.fondo }}
            contentContainerStyle={{ paddingBottom: 16 }}
            data={resultados}
            keyExtractor={(c) => String(c.id)}
            ListHeaderComponent={controles}
            ListEmptyComponent={vacio}
            ListFooterComponent={cargando ? <ActivityIndicator color={colores.primario} /> : null}
            renderItem={({ item }) => (
                <View style={{ paddingHorizontal: 16 }}>
                    <FilaConvenio convenio={item} onPress={() => abrirConvenio(item)} />
                </View>
            )}
            onEndReachedThreshold={0.4}
            onEndReached={() => { if (!cargando && pagina + 1 < totalPaginas) cargar(pagina + 1); }}
        />
    );
}