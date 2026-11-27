//completar con ceros a la izquierda
const dos = (n) => String(n).padStart(2, "0");

//correccion de la fecha
//"2026-11-18" (solo fecha) se interpretaría como UTC y mostraría el día anterior en Argentina
function aFecha(valor) {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [anio, mes, dia] = valor.split("-").map(Number);
        return new Date(anio, mes - 1, dia);
    }
    return new Date(valor);
}

export function formatearFecha(valor) {
    if (!valor) return "—";
    const f = aFecha(valor);
    return `${dos(f.getDate())}/${dos(f.getMonth() + 1)}/${f.getFullYear()}`;
}

export function formatearFechaHora(valor) {
    if (!valor) return "—";
    const f = aFecha(valor);
    return `${formatearFecha(valor)} ${dos(f.getHours())}:${dos(f.getMinutes())}`;
}

//validacion de mail
export const validarMail = (mail) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());

//conversor de lo dibujado a svg
export function trazosASvg(trazos, ancho, alto) {
    const camino = trazos
        .filter((t) => t.length >= 2)
        .map((t) => "M" + t.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("L"))
        .join(" ");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">` +
        `<rect width="100%" height="100%" fill="white"/>` +
        `<path d="${camino}" stroke="black" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}

//perfil
const ROLES = { ADMINISTRACION: "Administración", GESTION: "Gestión", ESTUDIANTE: "Estudiante", PROFESOR: "Profesor", DECANO: "Decano" };
export const nombreRol = (rol) => ROLES[rol] ?? rol;