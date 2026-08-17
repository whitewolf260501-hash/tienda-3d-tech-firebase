import { db } from "./firebase.js";
import { ref, onValue } from "firebase/database";
import { productosData } from "./productos.js"; // Respaldo local

const contenedorProductos = document.getElementById("contenedor-productos");
let productosGlobales = [];
let firebaseRespondio = false;

function renderizarInventario(data) {
    contenedorProductos.innerHTML = "";
    productosGlobales = [];

    Object.entries(data).forEach(([id, producto]) => {
        productosGlobales.push({ id, ...producto });

        const imagenSrc = producto.urlImagen && producto.urlImagen.trim() !== "" 
            ? producto.urlImagen 
            : "assets/imagen no encontrada.jpg";

        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-producto");

        tarjeta.innerHTML = `
            <div>
                <span style="font-size: 0.7rem; background: #eee; padding: 2px 6px; border-radius: 4px; color: #555;">Cód: ${producto.codigo || id}</span>
                <h3>${producto.nombre}</h3>
                <div class="contenedor-imagen">
                    <img src="${imagenSrc}" alt="${producto.nombre}">
                </div>
                <p style="font-size: 0.8rem; color: #666; margin-bottom: 10px;">${producto.descripcion || ''}</p>
            </div>
            <div>
                <p class="precio">$${producto.precio}</p>
                <button class="btn-comprar" data-id="${id}" data-nombre="${producto.nombre}" data-precio="${producto.precio}">
                    Añadir al carrito
                </button>
            </div>
        `;
        contenedorProductos.appendChild(tarjeta);
    });

    activarBotonesAgregar();
}

function cargarProductosTiempoReal() {
    contenedorProductos.innerHTML = "<p style='padding: 20px;'>Cargando inventario...</p>";
    const productosRef = ref(db, "productos");

    const timeoutRespaldo = setTimeout(() => {
        if (!firebaseRespondio) {
            console.warn("Firebase tardó en responder. Usando catálogo local de respaldo.");
            renderizarInventario(productosData);
        }
    }, 2500);

    onValue(productosRef, (snapshot) => {
        firebaseRespondio = true;
        clearTimeout(timeoutRespaldo);
        const data = snapshot.val();

        if (!data) {
            renderizarInventario(productosData);
            return;
        }
        renderizarInventario(data);
    }, (error) => {
        console.warn("Error de Firebase, usando respaldo local: ", error);
        firebaseRespondio = true;
        clearTimeout(timeoutRespaldo);
        renderizarInventario(productosData);
    });
}

function generarExcelEtiquetas() {
    if (productosGlobales.length === 0) { alert("No hay productos."); return; }
    let csvContent = "data:text/csv;charset=utf-8,Codigo,Nombre,Precio\n";
    productosGlobales.forEach(p => {
        csvContent += `${p.codigo || p.id},"${(p.nombre || "").replace(/"/g, '""')}",${p.precio || 0}\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "etiquetas_productos.csv";
    link.click();
}

function exportarAExcel() {
    if (productosGlobales.length === 0) return;
    let csvContent = "data:text/csv;charset=utf-8,Codigo,Nombre,Categoria,Precio,Descripcion\n";
    productosGlobales.forEach(p => {
        csvContent += `${p.codigo || p.id},"${(p.nombre || "").replace(/"/g, '""')}","${(p.categoria || "").replace(/"/g, '""')}",${p.precio || 0},"${(p.descripcion || "").replace(/"/g, '""')}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "inventario_tienda_3d_tech.csv";
    link.click();
}

function crearBotonesHerramientas() {
    const mainEl = document.querySelector("main");
    if (document.getElementById("barra-herramientas-admin")) return;
    const barra = document.createElement("div");
    barra.id = "barra-herramientas-admin";
    barra.style.cssText = "margin-bottom: 20px; display: flex; gap: 10px; flex-wrap: wrap;";

    const btnExportar = document.createElement("button");
    btnExportar.textContent = "📊 Descargar Inventario (Excel)";
    btnExportar.style.cssText = "background: #27ae60; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;";
    btnExportar.onclick = exportarAExcel;

    const btnEtiquetas = document.createElement("button");
    btnEtiquetas.textContent = "🏷️ Descargar Excel para Etiquetas";
    btnEtiquetas.style.cssText = "background: #e67e22; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;";
    btnEtiquetas.onclick = generarExcelEtiquetas;

    barra.appendChild(btnExportar);
    barra.appendChild(btnEtiquetas);
    mainEl.insertBefore(barra, contenedorProductos);
}

function activarBotonesAgregar() {
    document.querySelectorAll(".btn-comprar").forEach(boton => {
        boton.onclick = (e) => {
            const id = e.target.dataset.id;
            const nombre = e.target.dataset.nombre;
            const precio = parseFloat(e.target.dataset.precio);

            let carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
            const index = carrito.findIndex(item => item.id === id);
            if (index > -1) carrito[index].cantidad += 1;
            else carrito.push({ id, nombre, precio, cantidad: 1 });

            localStorage.setItem("carrito3d", JSON.stringify(carrito));
            actualizarContadorCarrito();
            alert(`¡${nombre} agregado al carrito!`);
        };
    });
}

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
    const totalItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
    const contadorEl = document.getElementById("contador-carrito");
    if (contadorEl) contadorEl.textContent = totalItems;
}

document.addEventListener("DOMContentLoaded", () => {
    crearBotonesHerramientas();
    cargarProductosTiempoReal();
    actualizarContadorCarrito();
});