// ============================================================
// app.js
// CATÁLOGO PÚBLICO
//
// NO UTILIZA FIREBASE.
//
// Los productos se almacenan localmente mediante:
//
// localStorage
//
// Además utiliza productos.js como catálogo inicial.
// ============================================================


import { productosData } from "./productos.js";


// ============================================================
// ELEMENTOS
// ============================================================

const contenedorProductos =
    document.getElementById(
        "contenedor-productos"
    );


// ============================================================
// CATEGORÍA DE LA PÁGINA
// ============================================================
//
// index.html
//
// <body data-categoria="3D">
//
//
// tecnologia.html
//
// <body data-categoria="TECNOLOGIA">
// ============================================================

const categoriaPagina =
    normalizarCategoria(
        document.body.dataset.categoria
    );


// ============================================================
// NORMALIZAR CATEGORÍA
// ============================================================

function normalizarCategoria(categoria) {

    if (!categoria) {
        return "";
    }


    return String(categoria)
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}


// ============================================================
// OBTENER INVENTARIO
// ============================================================

function obtenerInventario() {

    try {

        const datos =
            localStorage.getItem(
                "inventario"
            );


        // ====================================================
        // SI YA EXISTE INVENTARIO LOCAL
        // ====================================================

        if (datos) {

            const inventario =
                JSON.parse(datos);


            if (Array.isArray(inventario)) {

                return inventario;

            }

        }


        // ====================================================
        // PRIMERA EJECUCIÓN
        //
        // Convertimos productosData:
        //
        // {
        //    prod_1: {...},
        //    prod_2: {...}
        // }
        //
        // en:
        //
        // [
        //    {...},
        //    {...}
        // ]
        // ====================================================

        const inventarioInicial =
            Object.entries(
                productosData
            ).map(
                ([id, producto]) => {

                    return {

                        id,

                        ...producto,

                        // Compatibilidad
                        // con el inventario nuevo

                        precioVenta:
                            producto.precio,

                        imagen:
                            producto.urlImagen || ""

                    };

                }
            );


        // Guardar catálogo inicial

        localStorage.setItem(
            "inventario",
            JSON.stringify(
                inventarioInicial
            )
        );


        return inventarioInicial;

    } catch (error) {

        console.error(
            "Error al cargar inventario:",
            error
        );

        return [];

    }

}


// ============================================================
// OBTENER PRECIO
// ============================================================

function obtenerPrecio(producto) {

    return Number(
        producto.precioVenta ??
        producto.precio ??
        0
    );

}


// ============================================================
// OBTENER IMAGEN
// ============================================================

function obtenerImagen(producto) {

    return (
        producto.imagen ||
        producto.urlImagen ||
        "assets/imagen no encontrada.jpg"
    );

}


// ============================================================
// ESCAPAR HTML
//
// Evita problemas si un nombre o descripción
// contiene caracteres especiales.
// ============================================================

function escaparHTML(valor) {

    if (valor === null ||
        valor === undefined) {

        return "";

    }


    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ============================================================
// MOSTRAR PRODUCTOS
// ============================================================

function cargarProductos() {

    if (!contenedorProductos) {

        console.error(
            "No existe el contenedor de productos."
        );

        return;

    }


    const inventario =
        obtenerInventario();


    // ========================================================
    // FILTRAR POR CATEGORÍA
    // ========================================================

    const productos =
        inventario.filter(
            producto => {

                return (
                    normalizarCategoria(
                        producto.categoria
                    ) ===
                    categoriaPagina
                );

            }
        );


    console.log(
        "Categoría actual:",
        categoriaPagina
    );


    console.log(
        "Productos encontrados:",
        productos.length
    );


    // Limpiar

    contenedorProductos.innerHTML = "";


    // ========================================================
    // SIN PRODUCTOS
    // ========================================================

    if (productos.length === 0) {

        contenedorProductos.innerHTML = `

            <div class="sin-productos">

                <div class="icono-vacio">
                    📦
                </div>

                <h3>
                    No hay productos disponibles
                </h3>

                <p>
                    Actualmente no existen productos
                    publicados en esta categoría.
                </p>

            </div>

        `;

        return;

    }


    // ========================================================
    // CREAR TARJETAS
    // ========================================================

    productos.forEach(
        producto => {


            const id =
                producto.id ||
                producto.codigo ||
                producto.nombre;


            const nombre =
                escaparHTML(
                    producto.nombre ||
                    "Producto"
                );


            const codigo =
                escaparHTML(
                    producto.codigo ||
                    id
                );


            const descripcion =
                escaparHTML(
                    producto.descripcion ||
                    ""
                );


            const precio =
                obtenerPrecio(
                    producto
                );


            const imagen =
                escaparHTML(
                    obtenerImagen(
                        producto
                    )
                );


            // =================================================
            // TARJETA
            // =================================================

            const tarjeta =
                document.createElement(
                    "article"
                );


            tarjeta.className =
                "tarjeta-producto";


            tarjeta.innerHTML = `

                <div class="producto-contenido">


                    <span class="codigo-producto">

                        Cód: ${codigo}

                    </span>


                    <h3>

                        ${nombre}

                    </h3>


                    <div class="contenedor-imagen">

                        <img
                            src="${imagen}"
                            alt="${nombre}"
                            loading="lazy"
                            onerror="
                                this.src='assets/imagen no encontrada.jpg'
                            "
                        >

                    </div>


                    <p class="descripcion-producto">

                        ${descripcion}

                    </p>


                </div>


                <div class="producto-footer">


                    <p class="precio">

                        $${precio.toLocaleString(
                            "es-CL"
                        )}

                    </p>


                    <button
                        class="btn-comprar"
                        data-id="${id}"
                    >

                        🛒 AÑADIR AL CARRITO

                    </button>


                </div>

            `;


            contenedorProductos.appendChild(
                tarjeta
            );

        }
    );


    // Activar botones

    activarBotonesAgregar();

}


// ============================================================
// ACTIVAR BOTONES
// ============================================================

function activarBotonesAgregar() {

    const botones =
        document.querySelectorAll(
            ".btn-comprar"
        );


    botones.forEach(
        boton => {

            boton.addEventListener(
                "click",
                () => {

                    const id =
                        boton.dataset.id;


                    agregarAlCarrito(
                        id
                    );

                }
            );

        }
    );

}


// ============================================================
// AGREGAR AL CARRITO
// ============================================================

function agregarAlCarrito(id) {

    const inventario =
        obtenerInventario();


    const producto =
        inventario.find(
            p =>
                String(
                    p.id ||
                    p.codigo ||
                    p.nombre
                ) ===
                String(id)
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
            item =>
                String(item.id) ===
                String(id)
        );


    // ========================================================
    // YA EXISTE
    // ========================================================

    if (existente) {

        existente.cantidad =
            Number(
                existente.cantidad || 0
            ) + 1;

    }


    // ========================================================
    // PRODUCTO NUEVO
    // ========================================================

    else {

        carrito.push({

            id,

            nombre:
                producto.nombre,

            precio:
                obtenerPrecio(
                    producto
                ),

            imagen:
                obtenerImagen(
                    producto
                ),

            categoria:
                producto.categoria,

            cantidad: 1

        });

    }


    // Guardar

    localStorage.setItem(
        "carrito3d",
        JSON.stringify(
            carrito
        )
    );


    actualizarContadorCarrito();


    alert(
        `¡${producto.nombre} agregado al carrito!`
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


    const total =
        carrito.reduce(
            (acumulado, producto) => {

                return acumulado +
                    Number(
                        producto.cantidad || 0
                    );

            },
            0
        );


    const contador =
        document.getElementById(
            "contador-carrito"
        );


    if (contador) {

        contador.textContent =
            total;

    }

}


// ============================================================
// INICIAR
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarProductos();

        actualizarContadorCarrito();

    }
);