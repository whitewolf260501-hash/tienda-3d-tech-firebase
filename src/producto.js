// Página de detalle de un producto
import { obtenerProducto, obtenerProductos, categoriasDe, esc, precioCLP,
         agregarAlCarrito, actualizarContadorCarrito } from "./catalogo.js";
import { carruselHTML, activarCarrusel } from "./carrusel.js";
import { abrirSolicitudDiseno } from "./diseno.js";

document.addEventListener("DOMContentLoaded", async () => {
    actualizarContadorCarrito();
    const cont = document.getElementById("detalle-producto");
    const id = new URLSearchParams(location.search).get("id");
    const p = id && await obtenerProducto(id);

    if (!p) {
        cont.innerHTML = `<div class="sin-productos"><h2>Producto no encontrado</h2>
            <p><a href="index.html">Volver al catálogo</a></p></div>`;
        return;
    }

    const cats = categoriasDe(p);
    const VOLVER = { "3D": "index.html", TECNOLOGIA: "tecnologia.html", CARTAS: "cartas.html" };
    const tipoDiseno = cats.includes("3D") ? "3D" : (cats.includes("CARTAS") ? "CARTAS" : "");
    document.title = `${p.nombre} | Mi Tienda`;

    cont.innerHTML = `
        <a class="volver" href="${VOLVER[cats[0]] || "index.html"}">← Volver al catálogo</a>
        <div class="detalle-grid">
            <div class="detalle-galeria">${carruselHTML(p.imagenes, p.nombre)}</div>
            <div class="detalle-info">
                <span class="codigo-producto">Cód: ${esc(p.codigo || p.id)}</span>
                <h2>${esc(p.nombre)}</h2>
                <p class="precio">$${precioCLP(p.precio)}</p>
                <p>${esc(p.descripcionLarga)}</p>
                ${p.usos.length ? `<h3>¿Para qué puedes usarlo?</h3>
                    <ul>${p.usos.map(u => `<li>${esc(u)}</li>`).join("")}</ul>` : ""}
                ${p.recomendaciones ? `<h3>Recomendaciones de uso</h3><p>${esc(p.recomendaciones)}</p>` : ""}
                <button class="btn-comprar" id="btn-agregar" type="button">🛒 Añadir al carrito</button>
                ${tipoDiseno ? `<button class="btn-sec" id="btn-diseno" type="button">🎨 Pedir una versión personalizada</button>` : ""}
            </div>
        </div>
        <h3 class="relacionados-titulo">Otros productos que te pueden interesar</h3>
        <div class="relacionados" id="relacionados"></div>`;

    activarCarrusel(cont.querySelector(".carrusel-producto"));

    const btn = document.getElementById("btn-agregar");
    btn.addEventListener("click", () => {
        agregarAlCarrito(p);
        btn.textContent = "✓ Agregado";
        setTimeout(() => { btn.textContent = "🛒 Añadir al carrito"; }, 1200);
    });

    document.getElementById("btn-diseno")?.addEventListener("click",
        () => abrirSolicitudDiseno({ tipo: tipoDiseno, producto: p.nombre }));

    const otros = (await obtenerProductos())
        .filter(o => o.id !== p.id && categoriasDe(o).some(c => cats.includes(c)))
        .slice(0, 4);
    document.getElementById("relacionados").innerHTML = otros.map(o => `
        <a class="relacionado" href="producto.html?id=${encodeURIComponent(o.id)}">
            <img src="${esc(o.imagenes[0])}" alt="${esc(o.nombre)}" loading="lazy">
            <span>${esc(o.nombre)}</span><strong>$${precioCLP(o.precio)}</strong>
        </a>`).join("");
});
