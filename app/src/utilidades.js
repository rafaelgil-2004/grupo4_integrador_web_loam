const dos = (n) => String(n).padStart(2, "0");

// "2026-11-18" (solo fecha) se interpretaría como UTC y mostraría el día anterior en Argentina
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

export const validarMail = (mail) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());