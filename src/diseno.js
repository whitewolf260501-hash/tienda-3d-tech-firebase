// Solicitud de diseño propio (3D y Cartas): formulario → WhatsApp o correo
import emailjs from "@emailjs/browser";
import { WHATSAPP, EMAILJS } from "./config.js";
import { comprimir } from "./imagen.js";

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const TIPOS = {
    "3D": {
        titulo: "🎨 Pide tu diseño 3D personalizado",
        ayuda: "Cuéntanos qué objeto quieres imprimir, el tamaño aproximado y para qué lo usarás.",
        linkLabel: "Links de modelos o páginas (STL, Thingiverse, Printables, tiendas, ideas...) — opcional, uno por línea",
        ejemplo: "Ej: llavero con el logo de mi negocio, 5 cm, color azul"
    },
    CARTAS: {
        titulo: "🎨 Pide tu carta personalizada",
        ayuda: "Cuéntanos el personaje o tema, el estilo que te gusta y cuántas cartas quieres.",
        linkLabel: "Links de referencia (Pinterest, Drive, páginas web...) — opcional, uno por línea",
        ejemplo: "Ej: carta de mi mascota estilo fantasía, 3 copias"
    }
};

let dlg = null;
let contexto = { tipo: "3D", producto: "" };
const MAX_FOTOS = 3;
const MAX_LINKS = 5;
const MAX_MODELOS = 3;
const MAX_MB = 30;
const EXT_3D = ["stl", "3mf", "amf", "obj", "step", "stp", "ply", "zip"];
let modelos = [];    // { nombre, url } de archivos 3D ya subidos
let fotos = [];      // URLs de imágenes ya subidas
let subiendo = 0;

function crearDialogo() {
    dlg = document.createElement("dialog");
    dlg.className = "dlg-diseno";
    dlg.innerHTML = `
    <form method="dialog" class="diseno-form" id="sd-form">
        <h2 id="sd-titulo"></h2>
        <p id="sd-ayuda" class="sd-ayuda"></p>
        <p id="sd-base" class="sd-base" hidden></p>

        <label>Nombre *<input id="sd-nombre" autocomplete="name"></label>
        <label>Teléfono *<input id="sd-telefono" type="tel" autocomplete="tel"></label>
        <label>Correo<input id="sd-correo" type="email" autocomplete="email"></label>
        <label>Describe tu idea *<textarea id="sd-idea" rows="4"></textarea></label>
        <label>Medidas o tamaño<input id="sd-medidas" placeholder="Ej: 10 cm de alto"></label>
        <label>Colores o material<input id="sd-colores" placeholder="Ej: negro con detalles dorados"></label>
        <label>Cantidad<input id="sd-cantidad" type="number" min="1" value="1"></label>
        <small class="sd-ayuda">Todo lo que sigue es opcional: si no tienes imágenes, archivos ni links, solo describe tu idea.</small>
        <label>Imágenes de referencia — opcional (hasta 3)
            <input id="sd-fotos" type="file" accept="image/*" multiple>
        </label>
        <div id="sd-fotos-lista" class="sd-fotos"></div>
        <div id="sd-modelos-caja" class="sd-campo">
            <label>Archivos 3D — opcional (STL, 3MF, OBJ, STEP... hasta 3 archivos de ${MAX_MB} MB)
                <input id="sd-modelos" type="file" accept=".stl,.3mf,.amf,.obj,.step,.stp,.ply,.zip" multiple>
            </label>
            <div id="sd-modelos-lista" class="sd-modelos"></div>
        </div>
        <label><span id="sd-link-label"></span>
            <textarea id="sd-links" rows="3" placeholder="https://www.thingiverse.com/...&#10;https://..."></textarea>
        </label>

        <p id="sd-msg" class="sd-msg"></p>
        <div class="sd-acciones">
            <button type="button" id="sd-wsp" class="btn-comprar">💬 Enviar por WhatsApp</button>
            <button type="button" id="sd-mail" class="btn-sec">✉️ Enviar por correo</button>
            <button type="button" id="sd-cerrar" class="btn-sec">Cancelar</button>
        </div>
    </form>`;
    document.body.appendChild(dlg);

    const $ = (id) => dlg.querySelector("#" + id);
    $("sd-cerrar").addEventListener("click", () => dlg.close());

    $("sd-fotos-lista").addEventListener("click", (e) => {
        const q = e.target.closest("[data-quitar]");
        if (q) { fotos.splice(Number(q.dataset.quitar), 1); pintarFotos($); }
    });

    $("sd-modelos-lista").addEventListener("click", (e) => {
        const q = e.target.closest("[data-quitar]");
        if (q) { modelos.splice(Number(q.dataset.quitar), 1); pintarModelos($); }
    });

    $("sd-modelos").addEventListener("change", async (e) => {
        const elegidos = [...e.target.files];
        e.target.value = "";
        const validos = [];
        let aviso = "";
        for (const f of elegidos.slice(0, MAX_MODELOS - modelos.length)) {
            const ext = f.name.split(".").pop().toLowerCase();
            if (!EXT_3D.includes(ext)) aviso = `«${f.name}» no es un formato permitido (${EXT_3D.join(", ").toUpperCase()}).`;
            else if (f.size > MAX_MB * 1024 * 1024) aviso = `«${f.name}» supera los ${MAX_MB} MB. Puedes pasar un link (Drive, Dropbox).`;
            else validos.push(f);
        }
        if (!validos.length) { $("sd-msg").textContent = aviso || `Máximo ${MAX_MODELOS} archivos.`; return; }
        try {
            const { auth, storage } = await import("./firebase-admin.js");
            const { signInAnonymously } = await import("firebase/auth");
            const { ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
            if (!auth.currentUser) await signInAnonymously(auth);
            for (const f of validos) {
                subiendo++;
                try {
                    const ext = f.name.split(".").pop().toLowerCase();
                    const base = f.name.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_").slice(0, 40) || "modelo";
                    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
                    const r = ref(storage, `solicitudes-modelos/${id}-${base}.${ext}`);
                    await new Promise((ok, fallo) => {
                        const t = uploadBytesResumable(r, f, { contentType: "application/octet-stream" });
                        t.on("state_changed", (sn) => {
                            $("sd-msg").textContent = `Subiendo ${f.name}: ${Math.round(100 * sn.bytesTransferred / sn.totalBytes)}%`;
                        }, fallo, ok);
                    });
                    modelos.push({ nombre: f.name, url: await getDownloadURL(r) });
                    pintarModelos($);
                } finally { subiendo--; }
            }
            $("sd-msg").textContent = aviso;
        } catch {
            $("sd-msg").textContent = "No se pudo subir el archivo. Puedes pasar un link (Drive, Dropbox) o enviarlo por WhatsApp.";
        }
    });

    $("sd-fotos").addEventListener("change", async (e) => {
        const archivos = [...e.target.files].slice(0, MAX_FOTOS - fotos.length);
        e.target.value = "";
        if (!archivos.length) { $("sd-msg").textContent = `Máximo ${MAX_FOTOS} imágenes.`; return; }
        try {
            // Se carga solo cuando el cliente sube una imagen (Firebase Auth + Storage)
            const { auth, storage } = await import("./firebase-admin.js");
            const { signInAnonymously } = await import("firebase/auth");
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            if (!auth.currentUser) await signInAnonymously(auth);
            for (const a of archivos) {
                subiendo++;
                $("sd-msg").textContent = "Subiendo imagen...";
                try {
                    const blob = await comprimir(a);
                    const id = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2));
                    const r = ref(storage, `solicitudes/${id}.jpg`);
                    await uploadBytes(r, blob, { contentType: "image/jpeg" });
                    fotos.push(await getDownloadURL(r));
                    pintarFotos($);
                } finally { subiendo--; }
            }
            $("sd-msg").textContent = "";
        } catch {
            $("sd-msg").textContent = "No se pudo subir la imagen. Puedes enviarla por WhatsApp después de abrir el chat.";
        }
    });
    $("sd-wsp").addEventListener("click", () => {
        const d = leer($); if (!d) return;
        window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(armarMensaje(d, true))}`, "_blank");
    });
    $("sd-mail").addEventListener("click", async (e) => {
        const d = leer($); if (!d) return;
        const b = e.currentTarget;
        b.disabled = true; b.textContent = "Enviando...";
        try {
            await emailjs.send(EMAILJS.SERVICE_ID, EMAILJS.TEMPLATE_ID, {
                cliente_nombre: d.nombre,
                cliente_telefono: d.telefono,
                cliente_correo: d.correo || "No indicado",
                cliente_direccion: "No aplica (solicitud de diseño)",
                mensaje_pedido: armarMensaje(d, false)
            }, EMAILJS.PUBLIC_KEY);
            alert("¡Solicitud enviada! Te contactaremos pronto.");
            dlg.close();
        } catch {
            $("sd-msg").textContent = "No se pudo enviar el correo. Prueba por WhatsApp.";
        } finally {
            b.disabled = false; b.textContent = "✉️ Enviar por correo";
        }
    });
}

function pintarFotos($) {
    $("sd-fotos-lista").innerHTML = fotos.map((u, i) => `
        <div class="sd-foto"><img src="${esc(u)}" alt=""><button type="button" data-quitar="${i}" aria-label="Quitar">✕</button></div>`).join("");
}

function pintarModelos($) {
    $("sd-modelos-lista").innerHTML = modelos.map((m, i) => `
        <div class="sd-modelo">📦 <span>${esc(m.nombre)}</span><button type="button" data-quitar="${i}" aria-label="Quitar">✕</button></div>`).join("");
}

function leer($) {
    if (subiendo > 0) { $("sd-msg").textContent = "Espera a que termine de subir la imagen."; return null; }
    const d = {
        nombre: $("sd-nombre").value.trim(),
        telefono: $("sd-telefono").value.trim(),
        correo: $("sd-correo").value.trim(),
        idea: $("sd-idea").value.trim(),
        medidas: $("sd-medidas").value.trim(),
        colores: $("sd-colores").value.trim(),
        cantidad: $("sd-cantidad").value || "1",
        links: $("sd-links").value.split("\n").map(l => l.trim()).filter(Boolean),
        fotos: [...fotos],
        modelos: [...modelos]
    };
    if (!d.nombre || !d.telefono || !d.idea) {
        $("sd-msg").textContent = "Completa tu nombre, teléfono y la descripción de tu idea.";
        return null;
    }
    // Acepta "www.sitio.com" sin http y valida cada link
    d.links = d.links.map(l => (/^https?:\/\//i.test(l) ? l : "https://" + l));
    if (d.links.length > MAX_LINKS) {
        $("sd-msg").textContent = `Máximo ${MAX_LINKS} links.`;
        return null;
    }
    if (d.links.some(l => !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(l))) {
        $("sd-msg").textContent = "Revisa los links: deben ser direcciones web válidas, una por línea.";
        return null;
    }
    $("sd-msg").textContent = "";
    return d;
}

function armarMensaje(d, whatsapp) {
    const b = (t) => (whatsapp ? `*${t}*` : t);
    const linea = (t, v) => (v ? `${b(t)}: ${v}\n` : "");
    return `Hola, quiero solicitar un diseño personalizado (${contexto.tipo === "CARTAS" ? "Cartas" : "Impresión 3D"}).\n\n` +
        linea("CLIENTE", d.nombre) + linea("TELÉFONO", d.telefono) + linea("CORREO", d.correo) +
        linea("PRODUCTO BASE", contexto.producto) + linea("IDEA", d.idea) +
        linea("MEDIDAS", d.medidas) + linea("COLORES/MATERIAL", d.colores) +
        linea("CANTIDAD", d.cantidad) + (d.links.length ? `${b("LINKS")}:\n${d.links.join("\n")}\n` : "") +
        (d.modelos.length ? `${b("ARCHIVOS 3D")}:\n${d.modelos.map(m => `${m.nombre}: ${m.url}`).join("\n")}\n` : "") +
        (d.fotos.length ? `${b("IMÁGENES")}:\n${d.fotos.join("\n")}\n` : "");
}

export function abrirSolicitudDiseno({ tipo = "3D", producto = "" } = {}) {
    if (!dlg) crearDialogo();
    contexto = { tipo: TIPOS[tipo] ? tipo : "3D", producto };
    const t = TIPOS[contexto.tipo];
    dlg.querySelector("#sd-titulo").textContent = t.titulo;
    dlg.querySelector("#sd-ayuda").textContent = t.ayuda;
    dlg.querySelector("#sd-idea").placeholder = t.ejemplo;
    const base = dlg.querySelector("#sd-base");
    base.hidden = !producto;
    base.textContent = producto ? `Basado en: ${producto}` : "";
    dlg.querySelector("#sd-link-label").textContent = t.linkLabel;
    dlg.querySelector("#sd-links").value = "";
    modelos = [];
    pintarModelos((id) => dlg.querySelector("#" + id));
    dlg.querySelector("#sd-modelos-caja").hidden = contexto.tipo !== "3D";
    fotos = [];
    pintarFotos((id) => dlg.querySelector("#" + id));
    dlg.querySelector("#sd-msg").textContent = "";
    dlg.showModal();
}

// Banner "¿Quieres un diseño propio?" en las páginas que tengan #banner-diseno
const banner = document.getElementById("banner-diseno");
if (banner) {
    const tipo = banner.dataset.tipo || "3D";
    banner.className = "banner-diseno";
    banner.innerHTML = `
        <div>
            <strong>🎨 ¿Quieres un diseño propio?</strong>
            <span>${esc(TIPOS[tipo]?.ayuda || "")}</span>
        </div>
        <button type="button" class="btn-comprar">Solicitar diseño</button>`;
    banner.querySelector("button").addEventListener("click", () => abrirSolicitudDiseno({ tipo }));
}
