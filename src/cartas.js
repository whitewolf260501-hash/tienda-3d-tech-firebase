// Catálogo público: Cartas (mismo diseño que 3D y Tecnología)
import { obtenerProductos, perteneceA, actualizarContadorCarrito } from "./catalogo.js";
import { pintarCatalogo } from "./tarjeta.js";

document.addEventListener("DOMContentLoaded", async () => {
    const cont = document.getElementById("contenedor-productos");
    const productos = (await obtenerProductos()).filter(p => perteneceA(p, "CARTAS"));
    pintarCatalogo(cont, productos,
        `<div class="sin-productos"><h2>🃏 No hay cartas disponibles</h2><p>Pronto agregaremos nuevas cartas.</p></div>`);
    actualizarContadorCarrito();
});
