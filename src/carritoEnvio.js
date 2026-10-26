// Bloque de envío del carrito: región, courier, costo estimado y resumen para el pedido
import { totalLinea } from "./ofertas.js";
import { REGIONES, COURIERS, precioEnvio, cargarConfigEnvios, ENVIOS_DEFECTO } from "./envios.js";

let cfg = ENVIOS_DEFECTO;
const KEY = "envio3d";
const clp = (n) => Number(n || 0).toLocaleString("es-CL");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const leer = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const guardar = (e) => { try { localStorage.setItem(KEY, JSON.stringify(e)); } catch { /* sin almacenamiento */ } };
const carritoActual = () => { try { return JSON.parse(localStorage.getItem("carrito3d")) || []; } catch { return []; } };

const subtotalDe = (c) => c.reduce((t, i) => t + totalLinea(i.precio, i.cantidad, i.oferta), 0);
const pesoDe = (c) => c.reduce((t, i) =>
    t + (Number(i.peso) > 0 ? Number(i.peso) : cfg.pesoDefecto) * (Number(i.cantidad) || 0), 0);

function estado() {
    const e = leer();
    let modo = e.modo || "courier";
    if ((modo === "retiro" && !cfg.retiro) || (modo === "porpagar" && !cfg.porPagar)) modo = "courier";
    return { modo, region: e.region || "", courier: e.courier || "" };
}

function calcular() {
    const e = estado(), carrito = carritoActual();
    const sub = subtotalDe(carrito), kg = pesoDe(carrito);
    const zona = REGIONES.find(r => r.n === e.region)?.z;
    let costo = null;
    if (e.modo === "courier" && zona && e.courier) costo = precioEnvio(cfg, e.courier, zona, kg);
    return { ...e, sub, kg, zona, costo };
}

// Texto del envío para el mensaje del pedido (WhatsApp / correo)
export function resumenEnvio() {
    const r = calcular();
    const kg = r.kg.toFixed(1).replace(".", ",");
    if (r.modo === "retiro") return { linea: "RETIRO EN PERSONA (sin costo de envío)" };
    if (r.modo === "porpagar") {
        if (!r.courier) return { error: "Elige el courier para el envío por pagar." };
        return { linea: `ENVÍO POR PAGAR AL RECIBIR (${r.courier}${r.region ? ", " + r.region : ""}). No incluido en el total.` };
    }
    if (!r.region || !r.courier) return { error: "Selecciona tu región y el courier para el envío." };
    if (r.costo === null) return { linea: `ENVÍO (${r.courier}, ${r.region}): a cotizar, el pedido pesa unos ${kg} kg.` };
    return { linea: `ENVÍO ESTIMADO (${r.courier}, ${r.region}): $${clp(r.costo)}\nTOTAL CON ENVÍO: $${clp(r.sub + r.costo)}` };
}

function bloqueHTML() {
    const r = calcular();
    const opcionesCourier = COURIERS.map(c => {
        const p = r.zona && r.modo === "courier" ? precioEnvio(cfg, c, r.zona, r.kg) : null;
        return `<option value="${esc(c)}" ${c === r.courier ? "selected" : ""}>${esc(c)}${p ? " — $" + clp(p) : ""}</option>`;
    }).join("");

    let total = "Selecciona tu región y el courier para ver el costo del envío.";
    if (r.modo === "retiro") total = `Retiro en persona: sin costo · Total: <strong>$${clp(r.sub)}</strong>`;
    else if (r.modo === "porpagar") total = `El envío lo pagas al courier al recibir (no está en el total) · Productos: <strong>$${clp(r.sub)}</strong>`;
    else if (r.zona && r.courier) {
        total = r.costo === null
            ? `Pedido de unos ${r.kg.toFixed(1)} kg: el envío se cotiza aparte.`
            : `Envío estimado: <strong>$${clp(r.costo)}</strong> · Total con envío: <strong>$${clp(r.sub + r.costo)}</strong>`;
    }

    return `
    <div id="bloque-envio" class="bloque-envio">
        <h3>🚚 Envío</h3>
        <label>¿Cómo lo recibes?
            <select id="env-modo">
                <option value="courier" ${r.modo === "courier" ? "selected" : ""}>Despacho con courier (costo estimado)</option>
                ${cfg.porPagar ? `<option value="porpagar" ${r.modo === "porpagar" ? "selected" : ""}>Envío por pagar (pagas al recibir)</option>` : ""}
                ${cfg.retiro ? `<option value="retiro" ${r.modo === "retiro" ? "selected" : ""}>Retiro en persona (sin costo)</option>` : ""}
            </select>
        </label>
        ${r.modo !== "retiro" ? `
        <label>Región de destino
            <select id="env-region">
                <option value="">Selecciona tu región</option>
                ${REGIONES.map(x => `<option value="${esc(x.n)}" ${x.n === r.region ? "selected" : ""}>${esc(x.n)}</option>`).join("")}
            </select>
        </label>
        <label>Courier
            <select id="env-courier"><option value="">Selecciona un courier</option>${opcionesCourier}</select>
        </label>` : ""}
        <p class="env-total">${total}</p>
        <small>Peso estimado del pedido: ${r.kg.toFixed(1).replace(".", ",")} kg. Los valores son <strong>referenciales</strong> y se confirman al coordinar el pedido.</small>
    </div>`;
}

function ligar(contenedor) {
    const redibujar = () => {
        const actual = contenedor.querySelector("#bloque-envio");
        if (actual) actual.outerHTML = bloqueHTML();
        ligar(contenedor);
    };
    const campo = (id, clave) => contenedor.querySelector(id)?.addEventListener("change", (ev) => {
        guardar({ ...leer(), [clave]: ev.target.value });
        redibujar();
    });
    campo("#env-modo", "modo");
    campo("#env-region", "region");
    campo("#env-courier", "courier");
}

export async function pintarEnvio(contenedor) {
    cfg = await cargarConfigEnvios();
    contenedor.querySelector("#bloque-envio")?.remove();
    contenedor.insertAdjacentHTML("beforeend", bloqueHTML());
    ligar(contenedor);
}
