import emailjs from '@emailjs/browser';

const contenedorCarrito = document.getElementById("contenedor-carrito");
const seccionCheckout = document.getElementById("seccion-checkout");

function cargarCarrito() {
    let carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];

    if (carrito.length === 0) {
        contenedorCarrito.innerHTML = "<p style='padding: 20px; background: white; border-radius: 4px;'>Tu carrito está vacío.</p>";
        if (seccionCheckout) seccionCheckout.style.display = "none";
        actualizarContadorCarrito();
        return;
    }

    if (seccionCheckout) seccionCheckout.style.display = "block";
    contenedorCarrito.innerHTML = "";

    let tablaHtml = `
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden; border: 1px solid #ddd;">
            <thead>
                <tr style="background: #f4f4f4; text-align: left; border-bottom: 1px solid #ddd;">
                    <th style="padding: 12px;">Producto</th>
                    <th style="padding: 12px;">Precio</th>
                    <th style="padding: 12px;">Cantidad</th>
                    <th style="padding: 12px;">Subtotal</th>
                    <th style="padding: 12px;">Acción</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalGeneral = 0;

    carrito.forEach((item, index) => {
        let subtotal = item.precio * item.cantidad;
        totalGeneral += subtotal;

        tablaHtml += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px;">${item.nombre}</td>
                <td style="padding: 12px;">$${item.precio}</td>
                <td style="padding: 12px;">${item.cantidad}</td>
                <td style="padding: 12px; font-weight: bold;">$${subtotal}</td>
                <td style="padding: 12px;">
                    <button class="btn-eliminar" data-index="${index}" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Eliminar</button>
                </td>
            </tr>
        `;
    });

    tablaHtml += `
            </tbody>
        </table>
        <div style="text-align: right; margin-top: 15px; font-size: 1.2rem; font-weight: bold;">
            Total a Pagar: <span style="color: #27ae60;">$${totalGeneral}</span>
        </div>
    `;

    contenedorCarrito.innerHTML = tablaHtml;
    activarBotonesEliminar();
    actualizarContadorCarrito();
}

function activarBotonesEliminar() {
    document.querySelectorAll(".btn-eliminar").forEach(btn => {
        btn.onclick = (e) => {
            const index = e.target.dataset.index;
            let carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
            carrito.splice(index, 1);
            localStorage.setItem("carrito3d", JSON.stringify(carrito));
            cargarCarrito();
        };
    });
}

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    const contadorEl = document.getElementById("contador-carrito");
    if (contadorEl) contadorEl.textContent = totalItems;
}

function obtenerDatosYDetalle() {
    let carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
    const nombre = document.getElementById("cliente-nombre").value.trim();
    const telefono = document.getElementById("cliente-telefono").value.trim();
    const correo = document.getElementById("cliente-correo").value.trim();
    const direccion = document.getElementById("cliente-direccion").value.trim();

    if (!nombre || !telefono || !correo || !direccion) {
        alert("Por favor completa todos tus datos de contacto.");
        return null;
    }

    let detalle = "";
    let total = 0;
    carrito.forEach(item => {
        let sub = item.precio * item.cantidad;
        total += sub;
        detalle += `- ${item.nombre} (x${item.cantidad}) - Subtotal: $${sub}\n`;
    });
    detalle += `\nTOTAL GENERAL: $${total}`;

    return { nombre, telefono, correo, direccion, detalle };
}

// Configurar Botón WhatsApp y Correo con EmailJS
setTimeout(() => {
    const btnWpp = document.getElementById("btn-whatsapp");
    if (btnWpp) {
        btnWpp.onclick = () => {
            const datos = obtenerDatosYDetalle();
            if (!datos) return;

            let mensaje = `Hola, quiero realizar el siguiente pedido:\n\n*CLIENTE:* ${datos.nombre}\n*TELÉFONO:* ${datos.telefono}\n*CORREO:* ${datos.correo}\n*DIRECCIÓN:* ${datos.direccion}\n\n*PRODUCTOS:* \n${datos.detalle}`;
            
            const tuNumeroWhatsApp = "56964180557"; // Reemplaza con tu número real con código de país
            window.open(`https://wa.me/${tuNumeroWhatsApp}?text=${encodeURIComponent(mensaje)}`, '_blank');
        };
    }

    const btnMail = document.getElementById("btn-correo");
    if (btnMail) {
        btnMail.onclick = () => {
            const datos = obtenerDatosYDetalle();
            if (!datos) return;

            const parametrosEmail = {
                cliente_nombre: datos.nombre,
                cliente_telefono: datos.telefono,
                cliente_correo: datos.correo,
                cliente_direccion: datos.direccion,
                mensaje_pedido: datos.detalle
            };

            const SERVICE_ID = "service_cx8cy3c";
            const TEMPLATE_ID = "template_yy9jwfe";
            const PUBLIC_KEY = "ChVI-0ApXbvafygHC";

            btnMail.textContent = "Enviando correo...";
            btnMail.disabled = true;

            emailjs.send(SERVICE_ID, TEMPLATE_ID, parametrosEmail, PUBLIC_KEY)
                .then(() => {
                    alert("¡Pedido enviado con éxito a tu correo!");
                    localStorage.removeItem("carrito3d");
                    window.location.href = "index.html";
                }, (error) => {
                    console.error("Error al enviar email:", error);
                    alert("Hubo un error al enviar el correo. Inténtalo de nuevo.");
                    btnMail.textContent = "📧 Enviar por Correo";
                    btnMail.disabled = false;
                });
        };
    }
}, 500);

document.addEventListener("DOMContentLoaded", () => {
    cargarCarrito();
});