// Catálogo compartido: productos + fotos + detalles + carrito
import { productosData } from "./productos.js";
import { detalles, detallesCategoria } from "./detalles.js";
import { db } from "./firebase.js";
import { ref, get } from "firebase/database";

export const IMAGEN_DEFAULT = new URL("../assets/imagen no encontrada.jpg", import.meta.url).href;

// Fotos en assets/productos/<CODIGO>/1.jpg, 2.jpg, ... (jpg, png, webp o svg)
const fotos = import.meta.glob("/assets/productos/*/*.{jpg,jpeg,png,webp,svg}", {
    eager: true, query: "?url", import: "default"
});
// Imagen genérica por categoría (assets/categorias/cartas.svg, ...) cuando el producto no tiene fotos
const fotosCategoria = import.meta.glob("/assets/categorias/*.svg", {
    eager: true, query: "?url", import: "default"
});
const porCategoria = {};
Object.entries(fotosCategoria).forEach(([ruta, url]) => {
    porCategoria[ruta.split("/").pop().replace(".svg", "").toUpperCase()] = url;
});

const fotosPorCodigo = {};
Object.keys(fotos)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach(ruta => {
        const codigo = ruta.split("/").slice(-2, -1)[0];
        (fotosPorCodigo[codigo] ||= []).push(fotos[ruta]);
    });

export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const precioCLP = (p) => Number(p || 0).toLocaleString("es-CL");

export const normalizarCategoria = (c) =>
    String(c || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Un producto puede estar en varias categorías (p.categorias); p.categoria es la principal
export function categoriasDe(p) {
    const lista = [p.categoria, ...Object.values(p.categorias || {})].map(normalizarCategoria).filter(Boolean);
    return [...new Set(lista)];
}
export const perteneceA = (p, cat) => categoriasDe(p).includes(cat);

export function enriquecer(p) {
    const d = detalles[p.codigo] || detallesCategoria[categoriasDe(p)[0]] || {};
    const propias = [...(Array.isArray(p.imagenes) ? p.imagenes : []), p.urlImagen]
        .filter(i => i && String(i).trim());
    // Fotos del administrador primero; si no hay, las de assets/productos/<CODIGO>/
    const deCategoria = categoriasDe(p).map(c => porCategoria[c]).filter(Boolean).slice(0, 1);
    const imagenes = propias.length ? [...new Set(propias)]
        : (fotosPorCodigo[p.codigo]?.length ? fotosPorCodigo[p.codigo] : deCategoria);
    const usos = Array.isArray(p.usos) && p.usos.length ? p.usos : (d.usos || []);
    return {
        ...p,
        imagenes: imagenes.length ? imagenes : [IMAGEN_DEFAULT],
        descripcionLarga: p.descripcionLarga || d.descripcionLarga || p.descripcion || "",
        usos,
        recomendaciones: p.recomendaciones || d.recomendaciones || ""
    };
}

let cache = null;

// Lee los productos de Firebase; si falla o está vacío, usa el catálogo inicial
export async function obtenerProductos() {
    if (cache) return cache;
    let base = null;
    try {
        const snap = await Promise.race([
            get(ref(db, "productos")),
            new Promise((_, rej) => setTimeout(() => rej(new Error("tiempo agotado")), 6000))
        ]);
        const v = snap.val();
        if (v && typeof v === "object") base = Object.entries(v).map(([id, p]) => ({ id, ...p }));
    } catch (e) {
        console.warn("Firebase no disponible, se usa el catálogo inicial:", e);
    }
    base ||= Object.entries(productosData).map(([id, p]) => ({ id, ...p }));
    // Orden natural por código (3D-002 antes que 3D-010)
    cache = base.map(enriquecer).sort((a, b) =>
        String(a.codigo || a.id).localeCompare(String(b.codigo || b.id), undefined, { numeric: true }));
    return cache;
}

export async function obtenerProducto(id) {
    return (await obtenerProductos()).find(p => p.id === id);
}

export function agregarAlCarrito(p) {
    const carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
    const existente = carrito.find(i => i.id === p.id);
    if (existente) existente.cantidad++;
    else carrito.push({ id: p.id, nombre: p.nombre, precio: Number(p.precio), imagen: p.imagenes[0], cantidad: 1 });
    localStorage.setItem("carrito3d", JSON.stringify(carrito));
    actualizarContadorCarrito();
}

export function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
    const el = document.getElementById("contador-carrito");
    if (el) el.textContent = carrito.reduce((t, i) => t + Number(i.cantidad || 0), 0);
}
