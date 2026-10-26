// Acceso discreto al panel de administración (sin botones visibles para los clientes)
//  · 5 toques seguidos sobre el título "Impresiones 3D & Tech"
//  · Tuerca ⚙ casi transparente en la esquina inferior izquierda
const DESTINO = "admin.html";

function repetido(el, veces, ventanaMs, alCumplir) {
    let n = 0, t = null;
    el.addEventListener("click", () => {
        n++;
        clearTimeout(t);
        t = setTimeout(() => { n = 0; }, ventanaMs);
        if (n >= veces) { n = 0; alCumplir(); }
    });
}

const ir = () => { location.href = DESTINO; };

const titulo = document.querySelector("header h1");
if (titulo) repetido(titulo, 5, 2500, ir);

// Tuerca ⚙ casi transparente en la esquina inferior izquierda
const tuerca = document.createElement("a");
tuerca.href = DESTINO;
tuerca.className = "acceso-tuerca";
tuerca.textContent = "⚙";
tuerca.setAttribute("aria-label", "Administración");
document.body.appendChild(tuerca);
