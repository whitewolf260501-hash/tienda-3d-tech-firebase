// Tarjeta de producto: carrusel + ventana flotante (hover) + clic a la página del producto
import { esc, precioCLP, agregarAlCarrito } from "./catalogo.js";
import { carruselHTML, activarCarrusel } from "./carrusel.js";
import { precioHTML, badgeOferta } from "./ofertas.js";

const hayHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
let popup = null, detenerPopup = null, timerAbrir = null;

function obtenerPopup() {
    if (!popup) {
        popup = document.createElement("div");
        popup.className = "popup-producto";
        document.body.appendChild(popup);
    }
    return popup;
}

function mostrarPopup(producto, tarjeta, esAdmin) {
    const p = obtenerPopup();
    p.innerHTML = `
        ${carruselHTML(producto.imagenes, producto.nombre)}
        <h4>${esc(producto.nombre)}</h4>
        <p>${esc(producto.descripcionLarga)}</p>
        <strong>${precioHTML(producto)}</strong> ${badgeOferta(producto)}
        <small>${esAdmin ? "Haz clic para editar" : "Haz clic para ver más detalles"}</small>`;
    detenerPopup?.();
    detenerPopup = activarCarrusel(p, 1800);

    p.style.display = "block";
    const r = tarjeta.getBoundingClientRect();
    const ancho = p.offsetWidth, alto = p.offsetHeight;
    let left = r.right + 12;
    if (left + ancho > window.innerWidth - 8) left = Math.max(8, r.left - ancho - 12);
    const top = Math.min(Math.max(8, r.top), window.innerHeight - alto - 8);
    p.style.left = `${left}px`;
    p.style.top = `${Math.max(8, top)}px`;
}

function ocultarPopup() {
    clearTimeout(timerAbrir);
    detenerPopup?.();
    detenerPopup = null;
    if (popup) popup.style.display = "none";
}

// opciones.admin = true muestra Editar/Eliminar y el clic llama a opciones.alClic
export function crearTarjeta(producto, opciones = {}) {
    const t = document.createElement("article");
    t.className = "tarjeta-producto tarjeta-clicable";
    t.innerHTML = `
        ${badgeOferta(producto)}
        <div class="producto-contenido">
            <span class="codigo-producto">Cód: ${esc(producto.codigo || producto.id)}</span>
            <h3 class="nombre-producto">${esc(producto.nombre)}</h3>
            <div class="contenedor-imagen">${carruselHTML(producto.imagenes, producto.nombre)}</div>
            <p class="descripcion-producto">${esc(producto.descripcion)}</p>
        </div>
        <div class="producto-footer">
            <p class="precio">${precioHTML(producto)}</p>
            ${opciones.admin
                ? `<div class="acciones-admin">
                       <button class="btn-sec" type="button" data-accion="editar">✏️ Editar</button>
                       <button class="btn-sec" type="button" data-accion="oferta">🏷️ Oferta</button>
                       <button class="btn-peligro" type="button" data-accion="borrar">🗑️ Eliminar</button>
                   </div>`
                : `<button class="btn-comprar" type="button">🛒 Añadir al carrito</button>`}
        </div>`;

    activarCarrusel(t.querySelector(".carrusel-producto"));

    t.querySelector('[data-accion="editar"]')?.addEventListener("click", (e) => {
        e.stopPropagation(); ocultarPopup(); opciones.onEditar?.();
    });
    t.querySelector('[data-accion="oferta"]')?.addEventListener("click", (e) => {
        e.stopPropagation(); ocultarPopup(); opciones.onOferta?.();
    });
    t.querySelector('[data-accion="borrar"]')?.addEventListener("click", (e) => {
        e.stopPropagation(); ocultarPopup(); opciones.onBorrar?.();
    });

    t.querySelector(".btn-comprar")?.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarAlCarrito(producto);
        const b = e.currentTarget;
        b.textContent = "✓ Agregado";
        setTimeout(() => { b.textContent = "🛒 Añadir al carrito"; }, 1000);
    });

    t.addEventListener("click", (e) => {
        if (e.target.closest("button, .indicador")) return;
        ocultarPopup();
        if (opciones.alClic) { opciones.alClic(); return; }
        location.href = `producto.html?id=${encodeURIComponent(producto.id)}`;
    });

    if (hayHover) {
        t.addEventListener("mouseenter", () => {
            clearTimeout(timerAbrir);
            timerAbrir = setTimeout(() => mostrarPopup(producto, t, opciones.admin), 250);
        });
        t.addEventListener("mouseleave", ocultarPopup);
    }
    return t;
}

export function pintarCatalogo(contenedor, productos, vacioHTML) {
    contenedor.innerHTML = "";
    if (!productos.length) { contenedor.innerHTML = vacioHTML; return; }
    productos.forEach(p => contenedor.appendChild(crearTarjeta(p)));
}
