import { db } from "./firebase.js";
import { ref, onValue } from "firebase/database";
import { productosData } from "./productos.js"; // Importamos el respaldo local

const contenedorProductos = document.getElementById("contenedor-productos");
let productosGlobales = [];
let firebaseRespondio = false;

function renderizarProductos(data) {
    contenedorProductos.innerHTML = "";
    productosGlobales = [];
    let contadorEncontrados = 0;

    Object.entries(data).forEach(([id, producto]) => {
        if (producto.categoria && producto.categoria.toLowerCase() === "tecnologia") {
            contadorEncontrados++;
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
        }
    });

    if (contadorEncontrados === 0) {
        contenedorProductos.innerHTML = "<p style='padding: 20px;'>No hay productos con la categoría 'tecnologia'.</p>";
        return;
    }
    activarBotonesAgregar();
}

function cargarTecnologiaTiempoReal() {
    contenedorProductos.innerHTML = "<p style='padding: 20px;'>Cargando tecnología...</p>";
    const productosRef = ref(db, "productos");

    // Temporizador de seguridad: si Firebase falla o tarda, usa el respaldo local
    const timeoutRespaldo = setTimeout(() => {
        if (!firebaseRespondio) {
            console.warn("Firebase tardó en responder. Usando catálogo local de respaldo.");
            // Filtramos solo los de tecnología del archivo local
            const techLocales = {};
            Object.entries(productosData).forEach(([id, p]) => {
                if (p.categoria && p.categoria.toLowerCase() === "tecnologia") {
                    techLocales[id] = p;
                }
            });
            renderizarProductos(techLocales);
        }
    }, 2500);

    onValue(productosRef, (snapshot) => {
        firebaseRespondio = true;
        clearTimeout(timeoutRespaldo);
        const data = snapshot.val();

        if (!data) {
            renderizarProductos(productosData); // Respaldo si está vacío
            return;
        }
        renderizarProductos(data);
    }, (error) => {
        console.warn("Error de Firebase, usando respaldo local: ", error);
        firebaseRespondio = true;
        clearTimeout(timeoutRespaldo);
        renderizarProductos(productosData);
    });
}

// Funciones de herramientas y carrito (Iguales a las tuyas)
function generarEtiquetasImpresion() {
    if (productosGlobales.length === 0) { alert("No hay productos."); return; }
    let ventanaEtiquetas = window.open('', '_blank', 'width=800,height=600');
    let htmlEtiquetas = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Etiquetas Tech</title><style>body{font-family:Arial;padding:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.et{border:2px dashed #333;padding:15px;text-align:center;border-radius:6px}@media print{.no-print{display:none}}</style></head><body><div class="no-print" style="margin-bottom:20px"><button onclick="window.print()" style="padding:10px 20px;background:#2980b9;color:#fff;border:none;border-radius:4px;cursor:pointer">Imprimir</button></div><div class="grid">`;
    productosGlobales.forEach(p => {
        htmlEtiquetas += `<div class="et"><div style="font-size:0.8rem;background:#f0f0f0;padding:2px;font-weight:bold;">${p.codigo || p.id}</div><h4>${p.nombre}</h4><div style="font-size:1.2rem;font-weight:bold;color:#27ae60;">$${p.precio}</div></div>`;
    });
    htmlEtiquetas += `</div></body></html>`;
    ventanaEtiquetas.document.write(htmlEtiquetas);
    ventanaEtiquetas.document.close();
}

function exportarAExcel() {
    if (productosGlobales.length === 0) return;
    let csv = "data:text/csv;charset=utf-8,Codigo,Nombre,Categoria,Precio,Descripcion\n";
    productosGlobales.forEach(p => {
        csv += `${p.codigo || p.id},"${p.nombre}","${p.categoria}",${p.precio},"${p.descripcion}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "inventario_tecnologia.csv";
    link.click();
}

function crearBotonesHerramientas() {
    const mainEl = document.querySelector("main");
    if (document.getElementById("barra-herramientas-tech")) return;
    const barra = document.createElement("div");
    barra.id = "barra-herramientas-tech";
    barra.style.cssText = "margin-bottom: 20px; display: flex; gap: 10px;";
    
    const btnExcel = document.createElement("button");
    btnExcel.textContent = "📊 Descargar Excel Tech";
    btnExcel.style.cssText = "background: #27ae60; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;";
    btnExcel.onclick = exportarAExcel;

    const btnEtq = document.createElement("button");
    btnEtq.textContent = "🏷️ Generar Etiquetas Tech";
    btnEtq.style.cssText = "background: #e67e22; color: white; border: none; padding: 10px 15px; border-radius: 4px; cursor: pointer; font-weight: bold;";
    btnEtq.onclick = generarEtiquetasImpresion;

    barra.appendChild(btnExcel);
    barra.appendChild(btnEtq);
    mainEl.insertBefore(barra, contenedorProductos);
}

function activarBotonesAgregar() {
    document.querySelectorAll(".btn-comprar").forEach(btn => {
        btn.onclick = (e) => {
            const { id, nombre, precio } = e.target.dataset;
            let carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
            const idx = carrito.findIndex(i => i.id === id);
            if (idx > -1) carrito[idx].cantidad++;
            else carrito.push({ id, nombre, precio: parseFloat(precio), cantidad: 1 });
            localStorage.setItem("carrito3d", JSON.stringify(carrito));
            
            const contador = document.getElementById("contador-carrito");
            if(contador) contador.textContent = carrito.reduce((a, c) => a + c.cantidad, 0);
            alert(`¡${nombre} agregado al carrito!`);
        };
    });
}

document.addEventListener("DOMContentLoaded", () => {
    crearBotonesHerramientas();
    cargarTecnologiaTiempoReal();
    const carrito = JSON.parse(localStorage.getItem("carrito3d")) || [];
    const contador = document.getElementById("contador-carrito");
    if(contador) contador.textContent = carrito.reduce((a, c) => a + c.cantidad, 0);
});