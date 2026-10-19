// ============================================================
// cartas.js
// Catálogo exclusivo de CARTAS
// ============================================================

import { db } from "./firebase.js";
import { ref, onValue } from "firebase/database";
import { productosData } from "./productos.js";

const contenedorProductos =
    document.getElementById("contenedor-productos");

const IMAGEN_DEFAULT =
    "assets/imagen no encontrada.jpg";

let productosGlobales = [];


// ============================================================
// NORMALIZAR CATEGORÍA
// ============================================================

function normalizarCategoria(categoria) {

    return String(categoria || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


// ============================================================
// COMBINAR PRODUCTOS LOCALES + FIREBASE
// ============================================================

function combinarProductos(firebaseData) {

    const productos = {
        ...productosData
    };

    // Firebase tiene prioridad si existe el mismo ID
    if (firebaseData && typeof firebaseData === "object") {

        Object.entries(firebaseData).forEach(
            ([id, producto]) => {

                productos[id] = {
                    ...productos[id],
                    ...producto
                };

            }
        );

    }

    return productos;

}


// ============================================================
// OBTENER SOLO CARTAS
// ============================================================

function obtenerCartas(data) {

    return Object.entries(data).filter(
        ([id, producto]) => {

            return (
                [producto.categoria, ...Object.values(producto.categorias || {})]
                    .some(c => normalizarCategoria(c) === "CARTAS")
            );

        }
    );

}


// ============================================================
// RENDERIZAR CARTAS
// ============================================================

function renderizarCartas(data) {

    contenedorProductos.innerHTML = "";

    productosGlobales = [];

    const cartas = obtenerCartas(data);


    console.log(
        "🃏 Cartas encontradas:",
        cartas.length
    );


    console.log(
        "📦 Productos de cartas:",
        cartas
    );


    if (cartas.length === 0) {

        contenedorProductos.innerHTML = `

            <div class="sin-productos">

                <h2>
                    🃏 No hay cartas disponibles
                </h2>

                <p>
                    Pronto agregaremos nuevas cartas
                    coleccionables.
                </p>

            </div>

        `;

        return;
    }


    cartas.forEach(([id, producto]) => {

        productosGlobales.push({
            id,
            ...producto
        });


        const imagen =
            producto.urlImagen &&
            producto.urlImagen.trim() !== ""
                ? producto.urlImagen
                : IMAGEN_DEFAULT;


        const tarjeta =
            document.createElement("div");

        tarjeta.className =
            "tarjeta-producto";


        tarjeta.innerHTML = `

            <div class="producto-contenido">

                <span class="codigo-producto">

                    ${producto.codigo || id}

                </span>


                <h3 class="nombre-producto">

                    ${producto.nombre || "Carta"}

                </h3>


                <div class="contenedor-imagen">

                    <img
                        src="${imagen}"
                        alt="${producto.nombre || "Carta"}"
                        loading="lazy"
                        onerror="this.src='${IMAGEN_DEFAULT}'"
                    >

                </div>


                <p class="descripcion-producto">

                    ${producto.descripcion || ""}

                </p>

            </div>


            <div class="producto-footer">

                <p class="precio">

                    $${Number(
                        producto.precio || 0
                    ).toLocaleString("es-CL")}

                </p>


                <button
                    class="btn-comprar"
                    data-id="${id}"
                    data-nombre="${producto.nombre || "Carta"}"
                    data-precio="${producto.precio || 0}"
                >

                    🛒 Añadir al carrito

                </button>

            </div>

        `;


        contenedorProductos.appendChild(tarjeta);

    });


    activarBotonesAgregar();

}


// ============================================================
// CARGAR CARTAS
// ============================================================

function cargarCartas() {

    contenedorProductos.innerHTML = `

        <p class="cargando">

            🃏 Cargando cartas...

        </p>

    `;


    const productosRef =
        ref(db, "productos");


    onValue(

        productosRef,

        (snapshot) => {

            const firebaseData =
                snapshot.val() || {};


            console.log(
                "🔥 Datos recibidos de Firebase:",
                firebaseData
            );


            // Combinar Firebase con catálogo local
            const productosCombinados =
                combinarProductos(firebaseData);


            // Mostrar únicamente CARTAS
            renderizarCartas(
                productosCombinados
            );

        },


        (error) => {

            console.warn(
                "⚠️ Firebase no disponible.",
                error
            );


            // Si Firebase falla usamos catálogo local
            renderizarCartas(
                productosData
            );

        }

    );

}


// ============================================================
// AGREGAR AL CARRITO
// ============================================================

function activarBotonesAgregar() {

    document
        .querySelectorAll(".btn-comprar")
        .forEach((boton) => {

            boton.addEventListener(
                "click",
                () => {

                    const id =
                        boton.dataset.id;

                    const nombre =
                        boton.dataset.nombre;

                    const precio =
                        parseFloat(
                            boton.dataset.precio
                        );


                    let carrito =
                        JSON.parse(
                            localStorage.getItem(
                                "carrito3d"
                            )
                        ) || [];


                    const productoExistente =
                        carrito.find(
                            item =>
                                item.id === id
                        );


                    if (productoExistente) {

                        productoExistente.cantidad += 1;

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


                    alert(
                        `¡${nombre} agregado al carrito!`
                    );

                }
            );

        });

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


    const total =
        carrito.reduce(
            (acumulado, producto) => {

                return (
                    acumulado +
                    Number(
                        producto.cantidad || 0
                    )
                );

            },
            0
        );


    const contador =
        document.getElementById(
            "contador-carrito"
        );


    if (contador) {

        contador.textContent = total;

    }

}


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🃏 Iniciando catálogo de cartas..."
        );


        cargarCartas();


        actualizarContadorCarrito();

    }
);