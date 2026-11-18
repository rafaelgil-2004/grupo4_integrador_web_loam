// Textos del manual y de la ayuda de cada pantalla. Para sumar una captura a un paso:
//   { texto: "...", imagen: require("../assets/ayuda/firmar-1.png") }
export const MANUAL = [
    { icono: "log-in-outline", titulo: "Iniciar sesión", pasos: [
        { texto: "Ingrese su correo y su contraseña." },
        { texto: "Llegará una notificación con un código de verificación de 6 dígitos. Escríbalo en la pantalla." },
        { texto: "Si su celular tiene huella digital, la app le ofrece activarla para entrar más rápido la próxima vez." },
    ] },
    { icono: "finger-print-outline", titulo: "Registrar su identidad", pasos: [
        { texto: "Vaya a Perfil y toque “Mi identidad”." },
        { texto: "Firma: toque “Registrar firma”, dibújela con el dedo y toque “Guardar”." },
        { texto: "Huella: se activa al iniciar sesión con su clave y aceptar la opción de huella. Puede comprobarla con “Probar huella”." },
        { texto: "Rostro: toque “Registrar rostro” y tómese una selfie. Para verificar, tome otra foto y confirme si coincide. Es una comparación visual, no automática." },
    ] },
    { icono: "create-outline", titulo: "Firmar un convenio", pasos: [
        { texto: "Entre a la pestaña Pendientes y toque el convenio que debe firmar." },
        { texto: "Toque el documento para abrirlo. Puede acercar con dos dedos o con doble toque." },
        { texto: "Lea hasta la última página: recién ahí se habilita el botón “Firmar convenio”." },
        { texto: "Dibuje su firma o toque “Usar mi firma registrada”, y luego “Confirmar firma”." },
        { texto: "Confirme con su huella y permita el acceso a la ubicación (se usa una sola vez)." },
        { texto: "Verá el comprobante con la fecha, la hora y la ubicación de su firma. Para firmar necesita conexión." },
    ] },
    { icono: "search-outline", titulo: "Buscar convenios", pasos: [
        { texto: "Escriba en el buscador de la parte superior, o entre a la pestaña Buscar." },
        { texto: "Elija si quiere ver una Lista o un Árbol (convenios con sus adendas y documentos)." },
        { texto: "Los filtros de Estado y de Vigencia se pueden combinar: por ejemplo, Firmado y Vigente." },
        { texto: "Toque “Limpiar” para quitar todos los filtros. En el Árbol, toque la flecha para ver los documentos." },
    ] },
    { icono: "chatbubble-outline", titulo: "Comentar un convenio", pasos: [
        { texto: "Abra el convenio, vaya a la sección Comentarios, escriba su mensaje y toque “Comentar”." },
        { texto: "Para adjuntar documentación, abra el convenio y pulse «Subir documento (PDF)». Solo se admiten archivos PDF; el sistema les agrega una marca de control con fecha, usuario y huella digital." }
    ] },
    { icono: "cloud-offline-outline", titulo: "Sin conexión", pasos: [
        { texto: "Sin internet aparece un aviso rojo. Puede ver los convenios pendientes de firma guardados la última vez." },
        { texto: "Buscar, comentar y firmar requieren conexión." },
    ] },
    { icono: "notifications-outline", titulo: "Notificaciones", pasos: [
        { texto: "Si sale de la app y tiene convenios por firmar, recibirá recordatorios. Se cancelan al volver." },
        { texto: "Si no llegan, revise que las notificaciones estén permitidas en los ajustes del celular." },
    ] },
    { icono: "color-palette-outline", titulo: "Accesibilidad", pasos: [
        { texto: "En Perfil puede activar el modo oscuro y elegir el tamaño de letra: chica, mediana o grande." },
    ] },
];

// Ayuda breve que muestra el botón “?” según el nombre de la pantalla
export const AYUDAS = {
    Inicio: "Resumen de sus convenios, sus pendientes de firma y los últimos movimientos. Toque una tarjeta para ver esos convenios. Deslice hacia abajo para actualizar.",
    Pendientes: "Convenios aceptados que todavía no firmó. Toque uno para ver su detalle y firmarlo.",
    Buscar: "Busque por texto y combine los filtros de Estado y Vigencia. Cambie entre Lista y Árbol con los botones de arriba.",
    Perfil: "Sus datos, foto, modo oscuro y tamaño de letra. Desde acá registra su identidad y puede cerrar sesión.",
    Detalle: "Datos del convenio, firmantes, documentos y comentarios. Toque un documento para leerlo; si debe firmar, se habilita al llegar a la última página.",
    Visor: "Acerque con dos dedos o con doble toque. El botón Firmar se habilita al llegar a la última página.",
    Firma: "Dibuje su firma, confirme con su huella y permita la ubicación. Se registran fecha, hora y lugar.",
    Identidad: "Registre su firma, su huella y su rostro. Cada tarjeta indica si ya está registrado.",
};