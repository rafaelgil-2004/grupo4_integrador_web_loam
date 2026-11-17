import { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Texto from "../componentes/atomos/Texto";
import Boton from "../componentes/atomos/Boton";
import CampoTexto from "../componentes/atomos/CampoTexto";
import SelectorServidor from "../componentes/organismos/SelectorServidor";
import { useTema } from "../contexto/ContextoTema";
import { useConexion } from "../contexto/ContextoConexion";
import { useAutenticacion } from "../contexto/ContextoAutenticacion";
import { login } from "../servicios/api";
import { guardarCredenciales, leerCredenciales, borrarCredenciales } from "../servicios/almacenamiento";
import { hayBiometria, autenticarConHuella, mostrarNotificacion } from "../servicios/dispositivo";
import { validarMail } from "../utilidades";

export default function PantallaLogin() {
    const { colores } = useTema();
    const { estaConectado } = useConexion();
    const { confirmarSesion } = useAutenticacion();

    const [mail, setMail] = useState("");
    const [password, setPassword] = useState("");
    const [errores, setErrores] = useState({});
    const [mensaje, setMensaje] = useState(null);
    const [cargando, setCargando] = useState(false);
    const [pendiente, setPendiente] = useState(null); // respuesta del login a la espera del código
    const [codigoEsperado, setCodigoEsperado] = useState("");
    const [codigo, setCodigo] = useState("");
    const [huellaLista, setHuellaLista] = useState(false);

    useEffect(() => {
        Promise.all([hayBiometria(), leerCredenciales()])
            .then(([hay, credenciales]) => setHuellaLista(hay && credenciales !== null));
    }, []);

    function validar() {
        const nuevos = {};
        if (!validarMail(mail)) nuevos.mail = "Ingrese un correo válido.";
        if (!password) nuevos.password = "Ingrese su contraseña.";
        setErrores(nuevos);
        return Object.keys(nuevos).length === 0;
    }

    async function enviarCodigo() {
        const nuevo = String(Math.floor(100000 + Math.random() * 900000));
        setCodigoEsperado(nuevo);
        setCodigo("");
        // Mail/SMS simulados: el código llega como notificación local
        const entregado = await mostrarNotificacion("Código de verificación", `Su código es ${nuevo}`);
        if (!entregado) Alert.alert("Código de verificación (simulado)", `Su código es ${nuevo}`);
    }

    async function ingresar() {
        setMensaje(null);
        if (!estaConectado) { setMensaje("Sin conexión. Necesita internet para iniciar sesión."); return; }
        if (!validar()) return;
        setCargando(true);
        try {
            setPendiente(await login(mail.trim(), password)); // primer paso: la clave
            await enviarCodigo();                              // segundo paso: el código
        } catch (error) {
            setMensaje(error.message);
        } finally {
            setCargando(false);
        }
    }

    // Solo si el equipo tiene huella y todavía no se guardaron las credenciales
    async function ofrecerHuella() {
        if (!(await hayBiometria()) || (await leerCredenciales())) return;
        await new Promise((resolver) => {
            Alert.alert("Ingreso con huella", "¿Desea usar su huella para ingresar la próxima vez?", [
                { text: "Ahora no", style: "cancel", onPress: resolver },
                { text: "Activar", onPress: async () => { await guardarCredenciales(mail.trim(), password); resolver(); } },
            ], { cancelable: false });
        });
    }

    async function verificarCodigo() {
        if (codigo !== codigoEsperado) { setErrores({ codigo: "El código no coincide." }); return; }
        setCargando(true);
        try {
            await ofrecerHuella();
            await confirmarSesion(pendiente); // desde acá NavegadorRaiz cambia de pantalla
        } finally {
            setCargando(false);
        }
    }

    async function ingresarConHuella() {
        setMensaje(null);
        if (!estaConectado) { setMensaje("Sin conexión. Necesita internet para iniciar sesión."); return; }
        if (!(await autenticarConHuella("Confirme su identidad para ingresar"))) return;
        const credenciales = await leerCredenciales();
        if (!credenciales) return;
        setCargando(true);
        try {
            await confirmarSesion(await login(credenciales.mail, credenciales.password));
        } catch (error) {
            if (error.estado === 401) {
                await borrarCredenciales();
                setHuellaLista(false);
                setMensaje("La contraseña guardada ya no es válida. Ingrese con su correo y contraseña.");
            } else {
                setMensaje(error.message);
            }
        } finally {
            setCargando(false);
        }
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
                <View style={{ alignItems: "center", marginBottom: 32 }}>
                    <Texto variante="titulo">Convenios UNLPam</Texto>
                    <Texto color="textoSuave">Universidad Nacional de La Pampa</Texto>
                </View>

                {!estaConectado && <Texto color="error" style={{ marginBottom: 16 }}>Sin conexión.</Texto>}
                {mensaje && <Texto color="error" accessibilityLiveRegion="polite" style={{ marginBottom: 16 }}>{mensaje}</Texto>}

                {pendiente ? (
                    <>
                        <Texto variante="subtitulo" style={{ marginBottom: 8 }}>Verificación en dos pasos</Texto>
                        <Texto color="textoSuave" style={{ marginBottom: 16 }}>
                            Ingrese el código de 6 dígitos que le enviamos (simulado: llega como notificación).
                        </Texto>
                        <CampoTexto etiqueta="Código" value={codigo} keyboardType="number-pad" maxLength={6}
                            onChangeText={(t) => { setCodigo(t.replace(/\D/g, "")); setErrores({}); }} error={errores.codigo} />
                        <Boton texto="Verificar" onPress={verificarCodigo} cargando={cargando} deshabilitado={codigo.length !== 6} />
                        <Boton texto="Reenviar código" variante="secundario" onPress={enviarCodigo} style={{ marginTop: 8 }} />
                        <Boton texto="Volver" variante="enlace" style={{ marginTop: 8 }}
                            onPress={() => { setPendiente(null); setErrores({}); setPassword(""); }} />
                    </>
                ) : (
                    <>
                        <CampoTexto etiqueta="Correo electrónico" value={mail} onChangeText={setMail} error={errores.mail}
                            keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                        <CampoTexto etiqueta="Contraseña" value={password} onChangeText={setPassword} error={errores.password}
                            secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" />
                        <Boton texto="Ingresar" onPress={ingresar} cargando={cargando} />
                        {huellaLista && (
                            <Boton texto="Ingresar con huella" variante="secundario" onPress={ingresarConHuella}
                                deshabilitado={cargando} style={{ marginTop: 8 }} />
                        )}
                    </>
                )}

                {/* La IP de la PC cambia según la red: servidores guardados y prueba de conexión, sin recompilar */}
                <SelectorServidor />
            </ScrollView>
        </SafeAreaView>
    );
}