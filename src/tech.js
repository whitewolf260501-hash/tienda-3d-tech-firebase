// ============================================================
// tech.js
// ============================================================
// CATÁLOGO PÚBLICO - TECNOLOGÍA
//
// Este archivo muestra SOLO productos cuya categoría sea
// TECNOLOGIA.
//
// NO utiliza Firebase.
// Todo funciona con LocalStorage.
// ============================================================

import { productosData } from "./productos.js";

const contenedorProductos = document.getElementById(
    "contenedor-productos"
);


// ============================================================
// INICIALIZAR INVENTARIO
// ============================================================

function inicializarProductos() {

    const inventarioActual =
        localStorage.getItem("inventario");


    // Si todavía no existe inventario
    if (!inventarioActual) {

        const productosIniciales =
            Object.entries(productosData).map(
                ([id, producto]) => ({
                    id,
                    ...producto
                })
            );


        localStorage.setItem(
            "inventario",
            JSON.stringify(productosIniciales)
        );


        return productosIniciales;

    }


    try {

        const productos =
            JSON.parse(inventarioActual);


        if (Array.isArray(productos)) {

            return productos;

        }

    } catch (error) {

        console.error(
            "Error leyendo inventario:",
            error
        );

    }


    return [];

}


// ============================================================
// NORMALIZAR CATEGORÍA
// ============================================================

function normalizarCategoria(categoria) {

    if (!categoria) {
        return "";
    }


    return categoria
        .toString()
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


// ============================================================
// OBTENER PRODUCTOS DE TECNOLOGÍA
// ============================================================

function obtenerProductosTecnologia() {

    const productos =
        inicializarProductos();


    return productos.filter(producto => {

        const categoria =
            normalizarCategoria(
                producto.categoria
            );


        return categoria === "TECNOLOGIA";

    });

}


// ============================================================
// MOSTRAR PRODUCTOS
// ============================================================

function mostrarProductos() {

    if (!contenedorProductos) {

        console.error(
            "No existe #contenedor-productos"
        );

        return;

    }


    const productos =
        obtenerProductosTecnologia();


    contenedorProductos.innerHTML = "";


    if (productos.length === 0) {

        contenedorProductos.innerHTML = `

            <div class="sin-productos">

                <h2>
                    💻 No hay productos tecnológicos
                </h2>

                <p>
                    Pronto agregaremos nuevos productos.
                </p>

            </div>

        `;

        return;

    }


    productos.forEach(producto => {

        const tarjeta =
            document.createElement("article");


        tarjeta.className =
            "tarjeta-producto";


        let imagen =
            producto.urlImagen;


        if (!imagen ||
            imagen.trim() === "") {

            imagen =
                "assets/imagen no encontrada.jpg";

        }


        tarjeta.innerHTML = `

            <div class="codigo-producto">
                Cód:
                ${producto.codigo || producto.id}
            </div>


            <h3>
                ${producto.nombre}
            </h3>


            <div class="contenedor-imagen">

                <img
                    src="${imagen}"
                    alt="${producto.nombre}"
                    loading="lazy"
                >

            </div>


            <p class="descripcion-producto">
                ${producto.descripcion || ""}
            </p>


            <p class="precio">
                $${formatearPrecio(producto.precio)}
            </p>


            <button
                class="btn-comprar"
                data-id="${producto.id}"
            >
                🛒 Añadir al carrito
            </button>

        `;


        contenedorProductos.appendChild(
            tarjeta
        );

    });


    activarBotonesCompra();

}


// ============================================================
// FORMATEAR PRECIO
// ============================================================

function formatearPrecio(precio) {

    return Number(
        precio || 0
    ).toLocaleString("es-CL");

}


// ============================================================
// BOTONES DE COMPRA
// ============================================================

function activarBotonesCompra() {

    document
        .querySelectorAll(".btn-comprar")
        .forEach(boton => {

            boton.addEventListener(
                "click",
                () => {

                    agregarAlCarrito(
                        boton.dataset.id
                    );

                }
            );

        });

}


// ============================================================
// AGREGAR AL CARRITO
// ============================================================

function agregarAlCarrito(id) {

    const productos =
        inicializarProductos();


    const producto =
        productos.find(
            p => p.id === id
        );


    if (!producto) {

        alert(
            "No se encontró el producto."
        );

        return;

    }


    let carrito =
        JSON.parse(
            localStorage.getItem(
                "carrito3d"
            )
        ) || [];


    const existente =
        carrito.find(
            item => item.id === id
        );


    if (existente) {

        existente.cantidad += 1;

    } else {

        carrito.push({

            id: producto.id,

            nombre: producto.nombre,

            precio: Number(
                producto.precio
            ),

            imagen:
                producto.urlImagen || "",

            cantidad: 1

        });

    }


    localStorage.setItem(
        "carrito3d",
        JSON.stringify(carrito)
    );


    actualizarContadorCarrito();


    alert(
        `✅ ${producto.nombre} fue agregado al carrito.`
    );

}


// ============================================================
// CONTADOR DEL CARRITO
// ============================================================

function actualizarContadorCarrito() {

    const carrito =
        JSON.parse(
            localStorage.getItem(
                "carrito3d"
            )
        ) || [];


    const cantidad =
        carrito.reduce(
            (total, producto) =>
                total +
                Number(
                    producto.cantidad || 0
                ),
            0
        );


    const contador =
        document.getElementById(
            "contador-carrito"
        );


    if (contador) {

        contador.textContent =
            cantidad;

    }

}


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        mostrarProductos();

        actualizarContadorCarrito();

    }
);