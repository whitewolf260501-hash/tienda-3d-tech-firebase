// Carrusel reutilizable: flechas, puntos, swipe táctil y autoplay opcional
import { esc, IMAGEN_DEFAULT } from "./catalogo.js";

export function carruselHTML(imagenes, alt) {
    const varias = imagenes.length > 1;
    return `
    <div class="carrusel-producto">
        <div class="imagenes-carrusel">
            ${imagenes.map((src, i) => `<img src="${esc(src)}" class="imagen-carrusel ${i === 0 ? "activa" : ""}"
                alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='${IMAGEN_DEFAULT}'">`).join("")}
        </div>
        ${varias ? `
        <button class="carrusel-btn anterior" type="button" aria-label="Imagen anterior">❮</button>
        <button class="carrusel-btn siguiente" type="button" aria-label="Imagen siguiente">❯</button>
        <div class="indicadores-carrusel">
            ${imagenes.map((_, i) => `<span class="indicador ${i === 0 ? "activo" : ""}" data-index="${i}"></span>`).join("")}
        </div>` : ""}
    </div>`;
}

// Devuelve una función detener() por si hay autoplay
export function activarCarrusel(raiz, autoMs = 0) {
    const imgs = raiz.querySelectorAll(".imagen-carrusel");
    const dots = raiz.querySelectorAll(".indicador");
    if (imgs.length <= 1) return () => {};
    let actual = 0, timer = null;

    const ir = (n) => {
        actual = (n + imgs.length) % imgs.length;
        imgs.forEach((im, i) => im.classList.toggle("activa", i === actual));
        dots.forEach((d, i) => d.classList.toggle("activo", i === actual));
    };
    const parar = () => { clearInterval(timer); timer = null; };
    const iniciar = () => { if (autoMs && !timer) timer = setInterval(() => ir(actual + 1), autoMs); };

    raiz.querySelector(".anterior")?.addEventListener("click", e => { e.stopPropagation(); ir(actual - 1); });
    raiz.querySelector(".siguiente")?.addEventListener("click", e => { e.stopPropagation(); ir(actual + 1); });
    dots.forEach(d => d.addEventListener("click", e => { e.stopPropagation(); ir(Number(d.dataset.index)); }));

    let x0 = null;
    raiz.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
    raiz.addEventListener("touchend", e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) ir(actual + (dx < 0 ? 1 : -1));
        x0 = null;
    });

    iniciar();
    return parar;
}
