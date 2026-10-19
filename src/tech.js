// Catálogo público: Tecnología
import { obtenerProductos, perteneceA, actualizarContadorCarrito } from "./catalogo.js";
import { pintarCatalogo } from "./tarjeta.js";

document.addEventListener("DOMContentLoaded", async () => {
    const cont = document.getElementById("contenedor-productos");
    const productos = (await obtenerProductos()).filter(p => perteneceA(p, "TECNOLOGIA"));
    pintarCatalogo(cont, productos,
        `<div class="sin-productos"><h2>💻 No hay productos tecnológicos</h2><p>Pronto agregaremos nuevos productos.</p></div>`);
    actualizarContadorCarrito();
});
