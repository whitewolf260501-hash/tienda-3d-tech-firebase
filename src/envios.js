// Envíos: tarifas referenciales por courier, peso y zona (editables desde el panel admin)
import { db } from "./firebase.js";
import { ref, get } from "firebase/database";

export const COURIERS = ["Correos de Chile", "Starken", "Blue Express", "Chilexpress"];
export const TRAMOS = [0.5, 1, 3, 10];   // kg: hasta 0,5 · hasta 1 · hasta 3 · hasta 10

export const ZONAS = {
    rm: "Región Metropolitana",
    centro: "Centro (Valparaíso a Maule)",
    norte: "Norte (Arica a Coquimbo)",
    sur: "Sur (Ñuble a Los Lagos)",
    extremo: "Extremo (Aysén y Magallanes)"
};

export const REGIONES = [
    { n: "Arica y Parinacota", z: "norte" }, { n: "Tarapacá", z: "norte" }, { n: "Antofagasta", z: "norte" },
    { n: "Atacama", z: "norte" }, { n: "Coquimbo", z: "norte" }, { n: "Valparaíso", z: "centro" },
    { n: "Metropolitana de Santiago", z: "rm" }, { n: "O'Higgins", z: "centro" }, { n: "Maule", z: "centro" },
    { n: "Ñuble", z: "sur" }, { n: "Biobío", z: "sur" }, { n: "La Araucanía", z: "sur" },
    { n: "Los Ríos", z: "sur" }, { n: "Los Lagos", z: "sur" }, { n: "Aysén", z: "extremo" },
    { n: "Magallanes", z: "extremo" }
];

// Valores REFERENCIALES (estimados): base = zona "Centro" (tipo Santiago → Valparaíso)
export const ENVIOS_DEFECTO = {
    pesoDefecto: 0.5,   // kg por unidad si el producto no tiene peso
    retiro: true,
    porPagar: true,
    base: {
        "Correos de Chile": [2800, 3200, 3800, 5500],
        "Starken": [3500, 4500, 5200, 6800],
        "Blue Express": [4200, 5000, 5600, 7500],
        "Chilexpress": [4500, 5200, 6500, 8500]
    },
    zonas: { rm: 0.85, centro: 1, norte: 1.8, sur: 1.7, extremo: 3 }
};

let cache = null;
export const limpiarCacheEnvios = () => { cache = null; };

function mezclar(c) {
    const d = ENVIOS_DEFECTO;
    return {
        pesoDefecto: Number(c?.pesoDefecto) > 0 ? Number(c.pesoDefecto) : d.pesoDefecto,
        retiro: c?.retiro ?? d.retiro,
        porPagar: c?.porPagar ?? d.porPagar,
        base: { ...d.base, ...(c?.base || {}) },
        zonas: { ...d.zonas, ...(c?.zonas || {}) }
    };
}

// Lee la configuración de Firebase (config/envios); si falla usa los valores de referencia
export async function cargarConfigEnvios(forzar = false) {
    if (cache && !forzar) return cache;
    let c = null;
    try {
        const snap = await Promise.race([
            get(ref(db, "config/envios")),
            new Promise((_, rej) => setTimeout(() => rej(new Error("tiempo agotado")), 4000))
        ]);
        c = snap.val();
    } catch { /* usa valores de referencia */ }
    cache = mezclar(c);
    return cache;
}

// Precio estimado (CLP, redondeado a $10) o null si el peso supera el último tramo
export function precioEnvio(cfg, courier, zona, kg) {
    const base = cfg.base?.[courier];
    const i = TRAMOS.findIndex(t => kg <= t);
    if (!base || i < 0) return null;
    return Math.round(Number(base[i]) * Number(cfg.zonas?.[zona] ?? 1) / 10) * 10;
}
