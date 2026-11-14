import { exigirSesion, obtenerUsuario } from "../sesion.js";
import { obtenerResumen, obtenerMovimientos, listarConvenios } from "../api.js";
import { dibujarLayout, mostrarAlerta, badgeEstado, nombreEstado, ORDEN_ESTADOS } from "../ui.js";
import { formatearFecha, formatearFechaHora, crearElemento } from "../utils.js";

const alertas = document.getElementById("alertas");

function pintarResumen(r) {
    document.getElementById("num-firmados").textContent = r.firmadosUltimoAnio;
    document.getElementById("num-vigentes").textContent = r.vigentes;
    document.getElementById("num-tramite").textContent = r.enTramite;
    document.getElementById("num-porVencer").textContent = r.porVencer;
    document.getElementById("num-vencidos").textContent = r.vencidos;

    // La API solo informa los estados que tienen convenios: se completan con 0
    const contenedor = document.getElementById("porEstado");
    contenedor.replaceChildren();
    for (const estado of ORDEN_ESTADOS) {
        const fila = crearElemento("a", "list-group-item list-group-item-action d-flex justify-content-between align-items-center");
        fila.href = `convenios.html?estado=${estado}`;
        fila.append(crearElemento("span", "", nombreEstado(estado)),
                    crearElemento("span", "badge text-bg-light border", String(r.porEstado?.[estado] ?? 0)));
        contenedor.append(fila);
    }
}

function pintarMovimientos(lista) {
    const contenedor = document.getElementById("movimientos");
    contenedor.replaceChildren();
    if (lista.length === 0) {
        contenedor.append(crearElemento("div", "list-group-item text-body-secondary", "Todavía no hay movimientos."));
        return;
    }
    for (const c of lista) {
        const fila = crearElemento("a", "list-group-item list-group-item-action");
        fila.href = `convenio.html?id=${c.id}`;
        const cabecera = crearElemento("div", "d-flex justify-content-between align-items-start gap-2");
        cabecera.append(crearElemento("strong", "", c.codigo), badgeEstado(c.estado));
        fila.append(cabecera,
                    crearElemento("div", "", c.titulo),
                    crearElemento("small", "text-body-secondary", `Actualizado: ${formatearFechaHora(c.fechaActualizacion)}`));
        contenedor.append(fila);
    }
}

function pintarPorVencer(pagina) {
    const contenedor = document.getElementById("porVencer");
    contenedor.replaceChildren();
    if (pagina.content.length === 0) {
        contenedor.append(crearElemento("div", "list-group-item text-body-secondary", "No hay convenios próximos a vencer."));
        return;
    }
    for (const c of pagina.content) {
        const fila = crearElemento("a", "list-group-item list-group-item-action");
        fila.href = `convenio.html?id=${c.id}`;
        fila.append(crearElemento("strong", "d-block", `${c.codigo} · ${c.titulo}`),
                    crearElemento("small", "text-body-secondary", `Vence el ${formatearFecha(c.fechaVencimiento)}`));
        contenedor.append(fila);
    }
    if (pagina.page.totalElements > pagina.content.length) {
        const verTodos = crearElemento("a", "list-group-item list-group-item-action text-center",
            `Ver los ${pagina.page.totalElements} convenios`);
        verTodos.href = "convenios.html?vigencia=POR_VENCER";
        contenedor.append(verTodos);
    }
}

async function iniciar() {
    const usuario = obtenerUsuario();
    dibujarLayout("inicio");
    document.getElementById("saludo").textContent =
        `Bienvenido/a, ${usuario.nombre}.` + (usuario.unidadNombre ? ` Unidad: ${usuario.unidadNombre}.` : "");

    // allSettled espera a las tres consultas (en paralelo) y no se corta si una falla:
    // si falla una, las otras secciones se muestran igual
    const [resumen, movimientos, porVencer] = await Promise.allSettled([
        obtenerResumen(),
        obtenerMovimientos(10),
        listarConvenios({ vigencia: "POR_VENCER", tamanio: 5 }),
    ]);

    if (resumen.status === "fulfilled") pintarResumen(resumen.value);
    if (movimientos.status === "fulfilled") pintarMovimientos(movimientos.value);
    if (porVencer.status === "fulfilled") pintarPorVencer(porVencer.value);

    const fallo = [resumen, movimientos, porVencer].find((r) => r.status === "rejected");
    if (fallo) mostrarAlerta(alertas, `No se pudo cargar parte de la información: ${fallo.reason.message}`);
}

if (exigirSesion()) iniciar();