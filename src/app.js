// Catálogo público: Impresiones 3D
import { obtenerProductos, perteneceA, actualizarContadorCarrito } from "./catalogo.js";
import { pintarCatalogo } from "./tarjeta.js";

document.addEventListener("DOMContentLoaded", async () => {
    const cont = document.getElementById("contenedor-productos");
    const productos = (await obtenerProductos()).filter(p => perteneceA(p, "3D"));
    pintarCatalogo(cont, productos,
        `<div class="sin-productos"><h2>📦 No hay productos disponibles</h2><p>Pronto agregaremos nuevos productos.</p></div>`);
    actualizarContadorCarrito();
});
