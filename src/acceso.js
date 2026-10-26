// Acceso discreto al panel de administración (sin botones visibles para los clientes)
//  · 5 toques seguidos sobre el título "Impresiones 3D & Tech"
//  · 3 toques seguidos en la esquina inferior izquierda (zona invisible)
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

const zona = document.createElement("button");
zona.type = "button";
zona.className = "acceso-discreto";
zona.setAttribute("aria-hidden", "true");
zona.tabIndex = -1;
document.body.appendChild(zona);
repetido(zona, 3, 1500, ir);
