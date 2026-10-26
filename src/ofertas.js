// Ofertas: descuento %, precio oferta, llevas N pagas M (2x1, 3x2) y pack (3 por $X)
const clp = (n) => Number(n || 0).toLocaleString("es-CL");

function hoyLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ¿La oferta está activa hoy? (fechas "AAAA-MM-DD", ambas opcionales)
export function vigente(o) {
    if (!o || !o.tipo || o.activa === false) return false;
    const hoy = hoyLocal();
    if (o.desde && hoy < o.desde) return false;
    if (o.hasta && hoy > o.hasta) return false;
    return true;
}

export function etiquetaOferta(o) {
    switch (o?.tipo) {
        case "porcentaje": return `${o.valor}% OFF`;
        case "precio": return `Oferta $${clp(o.valor)}`;
        case "nxm": return `${o.n}x${o.m}`;
        case "pack": return `${o.n} x $${clp(o.valor)}`;
        default: return "";
    }
}

export function descripcionOferta(o) {
    let t = "";
    switch (o?.tipo) {
        case "porcentaje": t = `${o.valor}% de descuento`; break;
        case "precio": t = `Precio oferta: $${clp(o.valor)}`; break;
        case "nxm": t = `Llevas ${o.n} y pagas ${o.m}`; break;
        case "pack": t = `${o.n} unidades por $${clp(o.valor)}`; break;
    }
    if (t && o.hasta) {
        const [a, m, d] = o.hasta.split("-");
        t += ` · válido hasta el ${d}/${m}/${a}`;
    }
    return t;
}

// Total a pagar por una línea (precio unitario × cantidad) aplicando la oferta
export function totalLinea(precio, cantidad, o) {
    const p = Number(precio) || 0, c = Number(cantidad) || 0;
    const base = p * c;
    if (!vigente(o)) return base;
    let t = base;
    switch (o.tipo) {
        case "porcentaje": t = Math.round(p * (1 - Number(o.valor) / 100)) * c; break;
        case "precio": t = Number(o.valor) * c; break;
        case "nxm": {
            const n = Number(o.n), m = Number(o.m);
            if (n >= 2 && m >= 1 && m < n) t = (Math.floor(c / n) * m + (c % n)) * p;
            break;
        }
        case "pack": {
            const n = Number(o.n);
            if (n >= 2) t = Math.floor(c / n) * Number(o.valor) + (c % n) * p;
            break;
        }
    }
    return Math.min(base, Math.max(0, t));
}

// Precio unitario mostrado en la tarjeta (solo cambia en descuento % y precio oferta)
export function precioUnitario(p) {
    const o = p.oferta;
    if (vigente(o)) {
        if (o.tipo === "porcentaje") return Math.round(p.precio * (1 - Number(o.valor) / 100));
        if (o.tipo === "precio") return Math.min(p.precio, Number(o.valor));
    }
    return p.precio;
}

export function precioHTML(p) {
    const unit = precioUnitario(p);
    return unit < p.precio
        ? `<s class="precio-antes">$${clp(p.precio)}</s> <span class="precio-oferta">$${clp(unit)}</span>`
        : `$${clp(p.precio)}`;
}

export function badgeOferta(p) {
    return vigente(p.oferta) ? `<span class="badge-oferta">🏷️ ${etiquetaOferta(p.oferta)}</span>` : "";
}
