// ============================================================
// app.js
// Catálogo público de la tienda
// ============================================================

import { productosData } from "./productos.js";

// ------------------------------------------------------------
// CONFIGURACIÓN
// ------------------------------------------------------------

// Imagen provisional para todos los productos
const IMAGEN_DEFAULT = "assets/imagen no encontrada.jpg";

// Contenedor del catálogo
const contenedorProductos = document.getElementById("contenedor-productos");

// Productos actualmente cargados
let productosGlobales = [];


// ============================================================
// INICIALIZAR CATÁLOGO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    cargarProductos();

    actualizarContadorCarrito();

});


// ============================================================
// CARGAR PRODUCTOS
// ============================================================

function cargarProductos() {

    if (!contenedorProductos) {
        console.error("No existe #contenedor-productos");
        return;
    }

    contenedorProductos.innerHTML = "";

    // --------------------------------------------------------
    // IMPORTANTE
    // Por ahora usamos productosData.
    // No dependemos de Firebase.
    // --------------------------------------------------------

    const productos = Object.entries(productosData);

    productosGlobales = productos.map(([id, producto]) => ({
        id,
        ...producto
    }));


    // Si no existen productos
    if (productosGlobales.length === 0) {

        contenedorProductos.innerHTML = `
            <div class="sin-productos">
                <h2>📦 No hay productos disponibles</h2>
                <p>Pronto agregaremos nuevos productos.</p>
            </div>
        `;

        return;
    }


    // --------------------------------------------------------
    // GENERAR TARJETAS
    // --------------------------------------------------------

    productosGlobales.forEach((producto) => {

        const tarjeta = crearTarjetaProducto(producto);

        contenedorProductos.appendChild(tarjeta);

    });


    activarCarruseles();

    activarBotonesComprar();

}


// ============================================================
// CREAR TARJETA
// ============================================================

function crearTarjetaProducto(producto) {

    const tarjeta = document.createElement("article");

    tarjeta.className = "tarjeta-producto";


    // --------------------------------------------------------
    // IMÁGENES
    // --------------------------------------------------------

    let imagenes = [];

    // Si el producto tiene múltiples imágenes
    if (Array.isArray(producto.imagenes)) {

        imagenes = producto.imagenes.filter(
            imagen => imagen && imagen.trim() !== ""
        );

    }

    // Si tiene una sola URL antigua
    if (
        imagenes.length === 0 &&
        producto.urlImagen &&
        producto.urlImagen.trim() !== ""
    ) {

        imagenes.push(producto.urlImagen);

    }


    // --------------------------------------------------------
    // SI NO TIENE IMAGEN
    // --------------------------------------------------------

    if (imagenes.length === 0) {

        imagenes = [IMAGEN_DEFAULT];

    }


    // --------------------------------------------------------
    // GENERAR IMÁGENES DEL CARRUSEL
    // --------------------------------------------------------

    const imagenesHTML = imagenes.map((imagen, index) => {

        return `
            <img
                src="${imagen}"
                class="imagen-carrusel ${index === 0 ? "activa" : ""}"
                data-index="${index}"
                alt="${producto.nombre}"
                loading="lazy"
                onerror="this.src='${IMAGEN_DEFAULT}'"
            >
        `;

    }).join("");


    // --------------------------------------------------------
    // CONTROLES DEL CARRUSEL
    // --------------------------------------------------------

    const controlesHTML = imagenes.length > 1
        ? `
            <button
                class="carrusel-btn anterior"
                type="button"
                aria-label="Imagen anterior"
            >
                ❮
            </button>

            <button
                class="carrusel-btn siguiente"
                type="button"
                aria-label="Imagen siguiente"
            >
                ❯
            </button>

            <div class="indicadores-carrusel">
                ${imagenes.map((_, index) => `
                    <span
                        class="indicador ${index === 0 ? "activo" : ""}"
                        data-index="${index}">
                    </span>
                `).join("")}
            </div>
        `
        : "";


    // --------------------------------------------------------
    // HTML DE LA TARJETA
    // --------------------------------------------------------

    tarjeta.innerHTML = `

        <div class="producto-contenido">

            <span class="codigo-producto">
                Cód: ${producto.codigo || producto.id}
            </span>


            <h3 class="nombre-producto">
                ${producto.nombre}
            </h3>


            <div class="contenedor-imagen">

                <div class="carrusel-producto">

                    <div class="imagenes-carrusel">

                        ${imagenesHTML}

                    </div>

                    ${controlesHTML}

                </div>

            </div>


            <p class="descripcion-producto">
                ${producto.descripcion || ""}
            </p>

        </div>


        <div class="producto-footer">

            <p class="precio">
                $${formatearPrecio(producto.precio)}
            </p>

            <button
                class="btn-comprar"
                data-id="${producto.id}"
                data-nombre="${producto.nombre}"
                data-precio="${producto.precio}"
            >
                🛒 Añadir al carrito
            </button>

        </div>

    `;


    return tarjeta;

}


// ============================================================
// ACTIVAR CARRUSELES
// ============================================================

function activarCarruseles() {

    document
        .querySelectorAll(".carrusel-producto")
        .forEach(carrusel => {

            const imagenes = carrusel.querySelectorAll(
                ".imagen-carrusel"
            );

            const indicadores = carrusel.querySelectorAll(
                ".indicador"
            );

            const anterior = carrusel.querySelector(
                ".anterior"
            );

            const siguiente = carrusel.querySelector(
                ".siguiente"
            );


            // Si solamente existe una imagen
            if (imagenes.length <= 1) {
                return;
            }


            let indiceActual = 0;


            function mostrarImagen(indice) {

                if (indice < 0) {
                    indice = imagenes.length - 1;
                }

                if (indice >= imagenes.length) {
                    indice = 0;
                }


                imagenes.forEach((imagen, i) => {

                    imagen.classList.toggle(
                        "activa",
                        i === indice
                    );

                });


                indicadores.forEach((indicador, i) => {

                    indicador.classList.toggle(
                        "activo",
                        i === indice
                    );

                });


                indiceActual = indice;

            }


            // Botón anterior
            if (anterior) {

                anterior.addEventListener("click", (e) => {

                    e.stopPropagation();

                    mostrarImagen(indiceActual - 1);

                });

            }


            // Botón siguiente
            if (siguiente) {

                siguiente.addEventListener("click", (e) => {

                    e.stopPropagation();

                    mostrarImagen(indiceActual + 1);

                });

            }


            // Indicadores
            indicadores.forEach(indicador => {

                indicador.addEventListener("click", (e) => {

                    e.stopPropagation();

                    const indice = Number(
                        indicador.dataset.index
                    );

                    mostrarImagen(indice);

                });

            });

        });

}


// ============================================================
// BOTONES DE COMPRA
// ============================================================

function activarBotonesComprar() {

    document
        .querySelectorAll(".btn-comprar")
        .forEach(boton => {

            boton.addEventListener("click", () => {

                const id = boton.dataset.id;
                const nombre = boton.dataset.nombre;
                const precio = Number(
                    boton.dataset.precio
                );


                let carrito = JSON.parse(
                    localStorage.getItem("carrito3d")
                ) || [];


                const productoExistente =
                    carrito.find(item => item.id === id);


                if (productoExistente) {

                    productoExistente.cantidad++;

                } else {

                    carrito.push({

                        id: id,

                        nombre: nombre,

                        precio: precio,

                        cantidad: 1

                    });

                }


                localStorage.setItem(
                    "carrito3d",
                    JSON.stringify(carrito)
                );


                actualizarContadorCarrito();


                boton.textContent = "✓ Agregado";

                setTimeout(() => {

                    boton.textContent =
                        "🛒 Añadir al carrito";

                }, 1000);

            });

        });

}


// ============================================================
// CONTADOR DEL CARRITO
// ============================================================

function actualizarContadorCarrito() {

    const carrito = JSON.parse(
        localStorage.getItem("carrito3d")
    ) || [];


    const totalItems = carrito.reduce(
        (total, producto) =>
            total + Number(producto.cantidad || 0),
        0
    );


    const contador =
        document.getElementById("contador-carrito");


    if (contador) {

        contador.textContent = totalItems;

    }

}


// ============================================================
// FORMATO DE PRECIO
// ============================================================

function formatearPrecio(precio) {

    return Number(precio || 0).toLocaleString(
        "es-CL"
    );

}