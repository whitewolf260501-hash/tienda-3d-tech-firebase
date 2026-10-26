import emailjs from '@emailjs/browser';
import { totalLinea, vigente, etiquetaOferta } from "./ofertas.js";
import { pintarEnvio, resumenEnvio } from "./carritoEnvio.js";

const contenedorCarrito = document.getElementById("contenedor-carrito");
const seccionCheckout = document.getElementById("seccion-checkout");


// ============================================================
// CARGAR CARRITO
// ============================================================

function cargarCarrito() {

    let carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];

    if (carrito.length === 0) {

        contenedorCarrito.innerHTML = `
            <div style="
                padding: 30px;
                background: white;
                border-radius: 6px;
                border: 1px solid #ddd;
                text-align: center;
            ">
                <h3>🛒 Tu carrito está vacío</h3>

                <p style="margin-top: 10px; color: #666;">
                    Agrega productos desde nuestra tienda.
                </p>

                <a href="index.html"
                   style="
                       display: inline-block;
                       margin-top: 20px;
                       background: #ff684f;
                       color: white;
                       text-decoration: none;
                       padding: 10px 20px;
                       border-radius: 4px;
                       font-weight: bold;
                   ">
                    🛍️ Volver a la tienda
                </a>
            </div>
        `;

        if (seccionCheckout) {
            seccionCheckout.style.display = "none";
        }

        actualizarContadorCarrito();

        return;
    }


    if (seccionCheckout) {
        seccionCheckout.style.display = "block";
    }


    contenedorCarrito.innerHTML = "";


    let tablaHtml = `

        <div style="
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow-x: auto;
        ">

        <table style="
            width: 100%;
            border-collapse: collapse;
            min-width: 700px;
        ">

            <thead>

                <tr style="
                    background: #f4f4f4;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                ">

                    <th style="padding: 12px;">
                        Producto
                    </th>

                    <th style="padding: 12px;">
                        Precio
                    </th>

                    <th style="padding: 12px; text-align: center;">
                        Cantidad
                    </th>

                    <th style="padding: 12px;">
                        Subtotal
                    </th>

                    <th style="padding: 12px;">
                        Acción
                    </th>

                </tr>

            </thead>

            <tbody>
    `;


    let totalGeneral = 0;


    carrito.forEach((item, index) => {

        const cantidad = Number(item.cantidad) || 1;
        const precio = Number(item.precio) || 0;

        const subtotal = totalLinea(precio, cantidad, item.oferta);

        totalGeneral += subtotal;


        tablaHtml += `

            <tr style="
                border-bottom: 1px solid #eee;
            ">

                <!-- PRODUCTO -->

                <td style="padding: 12px;">

                    <strong>
                        ${item.nombre}
                    </strong>

                </td>


                <!-- PRECIO -->

                <td style="padding: 12px;">

                    $${precio.toLocaleString("es-CL")}
                    ${vigente(item.oferta) ? `<div style="color:#16a34a;font-size:.8rem;">🏷️ ${etiquetaOferta(item.oferta)}</div>` : ""}

                </td>


                <!-- CANTIDAD -->

                <td style="
                    padding: 12px;
                    text-align: center;
                ">

                    <div style="
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 5px;
                    ">

                        <!-- RESTAR -->

                        <button
                            class="btn-cantidad btn-restar"
                            data-index="${index}"
                            type="button"
                            style="
                                width: 34px;
                                height: 34px;
                                border: none;
                                border-radius: 4px;
                                background: #555;
                                color: white;
                                font-size: 20px;
                                font-weight: bold;
                                cursor: pointer;
                            "
                        >
                            −
                        </button>


                        <!-- INPUT -->

                        <input
                            class="input-cantidad"
                            data-index="${index}"
                            type="number"
                            min="1"
                            value="${cantidad}"
                            style="
                                width: 60px;
                                height: 34px;
                                text-align: center;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                                font-size: 16px;
                            "
                        >


                        <!-- SUMAR -->

                        <button
                            class="btn-cantidad btn-sumar"
                            data-index="${index}"
                            type="button"
                            style="
                                width: 34px;
                                height: 34px;
                                border: none;
                                border-radius: 4px;
                                background: #ff684f;
                                color: white;
                                font-size: 20px;
                                font-weight: bold;
                                cursor: pointer;
                            "
                        >
                            +
                        </button>

                    </div>

                </td>


                <!-- SUBTOTAL -->

                <td style="
                    padding: 12px;
                    font-weight: bold;
                ">

                    $${subtotal.toLocaleString("es-CL")}

                </td>


                <!-- ELIMINAR -->

                <td style="padding: 12px;">

                    <button
                        class="btn-eliminar"
                        data-index="${index}"
                        type="button"
                        style="
                            background: #e74c3c;
                            color: white;
                            border: none;
                            padding: 7px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                        "
                    >
                        🗑️ Eliminar
                    </button>

                </td>

            </tr>
        `;
    });


    tablaHtml += `

            </tbody>

        </table>

        </div>


        <!-- TOTAL -->

        <div style="
            text-align: right;
            margin-top: 20px;
            padding: 18px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 1.3rem;
            font-weight: bold;
        ">

            Total a Pagar:

            <span style="
                color: #27ae60;
                margin-left: 8px;
            ">

                $${totalGeneral.toLocaleString("es-CL")}

            </span>

        </div>

    `;


    contenedorCarrito.innerHTML = tablaHtml;

    pintarEnvio(contenedorCarrito);


    activarBotonesCantidad();

    activarBotonesEliminar();

    actualizarContadorCarrito();
}


// ============================================================
// BOTONES + Y -
// ============================================================

function activarBotonesCantidad() {

    // ========================================================
    // BOTÓN SUMAR
    // ========================================================

    document.querySelectorAll(".btn-sumar").forEach(btn => {

        btn.addEventListener("click", () => {

            const index = Number(btn.dataset.index);

            let carrito =
                JSON.parse(localStorage.getItem("carrito3d")) || [];

            carrito[index].cantidad =
                (Number(carrito[index].cantidad) || 0) + 1;

            localStorage.setItem(
                "carrito3d",
                JSON.stringify(carrito)
            );

            cargarCarrito();
        });
    });


    // ========================================================
    // BOTÓN RESTAR
    // ========================================================

    document.querySelectorAll(".btn-restar").forEach(btn => {

        btn.addEventListener("click", () => {

            const index = Number(btn.dataset.index);

            let carrito =
                JSON.parse(localStorage.getItem("carrito3d")) || [];

            carrito[index].cantidad =
                (Number(carrito[index].cantidad) || 1) - 1;


            // Si llega a 0, eliminamos el producto

            if (carrito[index].cantidad <= 0) {

                carrito.splice(index, 1);

            }


            localStorage.setItem(
                "carrito3d",
                JSON.stringify(carrito)
            );

            cargarCarrito();
        });
    });


    // ========================================================
    // INPUT MANUAL
    // ========================================================

    document.querySelectorAll(".input-cantidad").forEach(input => {

        input.addEventListener("change", () => {

            const index = Number(input.dataset.index);

            let nuevaCantidad = parseInt(input.value);


            if (isNaN(nuevaCantidad)) {
                nuevaCantidad = 1;
            }


            let carrito =
                JSON.parse(localStorage.getItem("carrito3d")) || [];


            // Si ponen 0 o menos, eliminar

            if (nuevaCantidad <= 0) {

                carrito.splice(index, 1);

            } else {

                carrito[index].cantidad = nuevaCantidad;

            }


            localStorage.setItem(
                "carrito3d",
                JSON.stringify(carrito)
            );

            cargarCarrito();
        });
    });
}


// ============================================================
// ELIMINAR PRODUCTO
// ============================================================

function activarBotonesEliminar() {

    document.querySelectorAll(".btn-eliminar").forEach(btn => {

        btn.addEventListener("click", () => {

            const index = Number(btn.dataset.index);

            let carrito =
                JSON.parse(localStorage.getItem("carrito3d")) || [];


            carrito.splice(index, 1);


            localStorage.setItem(
                "carrito3d",
                JSON.stringify(carrito)
            );


            cargarCarrito();
        });
    });
}


// ============================================================
// CONTADOR DEL CARRITO
// ============================================================

function actualizarContadorCarrito() {

    const carrito =
        JSON.parse(localStorage.getItem("carrito3d")) || [];


    const totalItems = carrito.reduce(
        (acc, item) =>
            acc + (Number(item.cantidad) || 0),
        0
    );


    const contadorEl =
        document.getElementById("contador-carrito");


    if (contadorEl) {

        contadorEl.textContent = totalItems;

    }
}


// ============================================================
// OBTENER DATOS DEL CLIENTE
// ============================================================

function obtenerDatosYDetalle() {

    let carrito =
        JSON.parse(localStorage.getItem("carrito3d")) || [];


    const nombre =
        document.getElementById("cliente-nombre").value.trim();

    const telefono =
        document.getElementById("cliente-telefono").value.trim();

    const correo =
        document.getElementById("cliente-correo").value.trim();

    const direccion =
        document.getElementById("cliente-direccion").value.trim();


    if (
        !nombre ||
        !telefono ||
        !correo ||
        !direccion
    ) {

        alert(
            "Por favor completa todos tus datos de contacto."
        );

        return null;
    }


    let detalle = "";

    let total = 0;


    carrito.forEach(item => {

        const precio =
            Number(item.precio) || 0;

        const cantidad =
            Number(item.cantidad) || 0;

        const sub =
            totalLinea(precio, cantidad, item.oferta);


        total += sub;


        detalle +=
            `- ${item.nombre} (x${cantidad})${vigente(item.oferta) ? ` [Oferta ${etiquetaOferta(item.oferta)}]` : ""} - Subtotal: $${sub.toLocaleString("es-CL")}\n`;
    });


    detalle +=
        `\nTOTAL PRODUCTOS: $${total.toLocaleString("es-CL")}`;

    const envio = resumenEnvio();

    if (envio.error) {
        alert(envio.error);
        return null;
    }

    detalle += `\n${envio.linea}`;


    return {
        nombre,
        telefono,
        correo,
        direccion,
        detalle
    };
}


// ============================================================
// WHATSAPP Y CORREO
// ============================================================

setTimeout(() => {

    const btnWpp =
        document.getElementById("btn-whatsapp");


    if (btnWpp) {

        btnWpp.onclick = () => {

            const datos =
                obtenerDatosYDetalle();


            if (!datos) return;


            const mensaje = `
Hola, quiero realizar el siguiente pedido:

*CLIENTE:* ${datos.nombre}

*TELÉFONO:* ${datos.telefono}

*CORREO:* ${datos.correo}

*DIRECCIÓN:* ${datos.direccion}

*PRODUCTOS:*

${datos.detalle}
            `;


            const tuNumeroWhatsApp =
                "56964180557";


            window.open(
                `https://wa.me/${tuNumeroWhatsApp}?text=${encodeURIComponent(mensaje)}`,
                "_blank"
            );
        };
    }


    const btnMail =
        document.getElementById("btn-correo");


    if (btnMail) {

        btnMail.onclick = () => {

            const datos =
                obtenerDatosYDetalle();


            if (!datos) return;


            const parametrosEmail = {

                cliente_nombre:
                    datos.nombre,

                cliente_telefono:
                    datos.telefono,

                cliente_correo:
                    datos.correo,

                cliente_direccion:
                    datos.direccion,

                mensaje_pedido:
                    datos.detalle
            };


            const SERVICE_ID =
                "service_cx8cy3c";

            const TEMPLATE_ID =
                "template_yy9jwfe";

            const PUBLIC_KEY =
                "ChVI-0ApXbvafygHC";


            btnMail.textContent =
                "Enviando correo...";

            btnMail.disabled = true;


            emailjs.send(
                SERVICE_ID,
                TEMPLATE_ID,
                parametrosEmail,
                PUBLIC_KEY
            )

            .then(() => {

                alert(
                    "¡Pedido enviado con éxito a tu correo!"
                );


                localStorage.removeItem(
                    "carrito3d"
                );


                window.location.href =
                    "index.html";

            })

            .catch((error) => {

                console.error(
                    "Error al enviar email:",
                    error
                );


                alert(
                    "Hubo un error al enviar el correo. Inténtalo de nuevo."
                );


                btnMail.textContent =
                    "📧 Enviar por Correo";

                btnMail.disabled = false;
            });
        };
    }

}, 500);


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarCarrito();

    }
);