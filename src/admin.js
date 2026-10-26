// Panel de administración: login, listar, crear, editar y eliminar productos
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get, set, remove } from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, auth, storage } from "./firebase-admin.js";
import { productosData } from "./productos.js";
import { comprimir } from "./imagen.js";
import { esc, precioCLP, normalizarCategoria, categoriasDe, enriquecer, IMAGEN_DEFAULT } from "./catalogo.js";
import { crearTarjeta } from "./tarjeta.js";
import { vigente, etiquetaOferta, totalLinea } from "./ofertas.js";
import { idDeEnlace, urlDeArchivoDrive, convertirEnlaceDrive, listarImagenes, CARPETA_POR_DEFECTO } from "./drive.js";
import { COURIERS, TRAMOS, ZONAS, ENVIOS_DEFECTO, cargarConfigEnvios, limpiarCacheEnvios } from "./envios.js";

const $ = (id) => document.getElementById(id);
let productos = {};               // { id: producto } tal como está en Firebase
let editando = { id: null, imagenes: [] };

// ---------- Sesión ----------
onAuthStateChanged(auth, (usuario) => {
    // Los clientes que subieron fotos tienen sesión anónima: no son administradores
    const user = usuario && !usuario.isAnonymous ? usuario : null;
    $("login").hidden = !!user;
    $("panel").hidden = !user;
    $("btn-salir").hidden = !user;
    if (user) cargar();
});

$("btn-login").addEventListener("click", async () => {
    $("login-msg").textContent = "Ingresando...";
    try {
        await signInWithEmailAndPassword(auth, $("email").value.trim(), $("clave").value);
        $("login-msg").textContent = "";
    } catch {
        $("login-msg").textContent = "Correo o contraseña incorrectos.";
    }
});
$("clave").addEventListener("keydown", e => { if (e.key === "Enter") $("btn-login").click(); });
$("btn-salir").addEventListener("click", (e) => { e.preventDefault(); signOut(auth); });

// ---------- Lista ----------
async function cargar() {
    $("estado").textContent = "Cargando...";
    try {
        const snap = await get(ref(db, "productos"));
        productos = snap.val() || {};
        $("estado").textContent = Object.keys(productos).length ? "" :
            "Todavía no hay productos en Firebase. Usa «Importar catálogo inicial» o crea uno nuevo.";
    } catch (e) {
        $("estado").textContent = "No se pudo leer Firebase: " + e.message;
    }
    pintar();
}

let visiblesIds = [];
let vista = "lista";
try { vista = localStorage.getItem("adminVista") || "lista"; } catch { /* sin almacenamiento */ }

// Primera foto real del producto (vacía si solo tiene la imagen por defecto)
function fotoDe(id, p) {
    const f = enriquecer({ id, ...p }).imagenes[0];
    return f === IMAGEN_DEFAULT ? "" : f;
}

function pintar() {
    const q = $("buscar").value.trim().toLowerCase();
    const cat = $("filtro-cat").value;
    const filas = Object.entries(productos)
        .filter(([, p]) => !cat || categoriasDe(p).includes(cat))
        .filter(([, p]) => !q || `${p.nombre} ${p.codigo}`.toLowerCase().includes(q))
        .sort((a, b) => String(a[1].codigo).localeCompare(String(b[1].codigo), undefined, { numeric: true }));

    const cont = $("lista");
    visiblesIds = filas.map(([id]) => id);
    cont.className = { lista: "admin-lista", iconos: "admin-iconos", tienda: "grid-productos" }[vista] || "admin-lista";
    document.querySelectorAll("[data-vista]").forEach(b => b.classList.toggle("activa", b.dataset.vista === vista));

    // Vista tienda: las mismas tarjetas que ve el cliente (carrusel y ventana flotante incluidos)
    if (vista === "tienda") {
        cont.innerHTML = "";
        filas.forEach(([id, p]) => cont.appendChild(crearTarjeta(enriquecer({ id, ...p }), {
            admin: true,
            alClic: () => abrirForm(id),
            onEditar: () => abrirForm(id),
            onOferta: () => abrirOferta([id]),
            onBorrar: () => borrar(id)
        })));
        return;
    }

    if (vista === "iconos") {
        cont.innerHTML = filas.map(([id, p]) => {
            const f = fotoDe(id, p);
            return `
            <div class="admin-icono">
                <button class="admin-icono-img" data-editar="${esc(id)}" aria-label="Editar">
                    ${f ? `<img src="${esc(f)}" alt="">` : "📷"}
                </button>
                <strong>${esc(p.nombre)}</strong>
                <small>${esc(p.codigo)} · $${precioCLP(p.precio)}${vigente(p.oferta) ? " · 🏷️ " + esc(etiquetaOferta(p.oferta)) : ""}</small>
                <div class="admin-icono-btns">
                    <button class="btn-sec" data-editar="${esc(id)}">✏️</button>
                    <button class="btn-sec" data-oferta="${esc(id)}" title="Oferta">🏷️</button>
            <button class="btn-peligro" data-borrar="${esc(id)}">🗑️</button>
                </div>
            </div>`;
        }).join("");
        return;
    }

    cont.innerHTML = filas.map(([id, p]) => {
        const f = fotoDe(id, p);
        return `
        <div class="admin-fila">
            ${f ? `<img src="${esc(f)}" alt="">` : `<div class="admin-sinfoto">📷</div>`}
            <div class="admin-datos">
                <strong>${esc(p.nombre)}</strong>
                <small>${esc(p.codigo)} · ${esc(categoriasDe(p).join(" + "))} · $${precioCLP(p.precio)}${vigente(p.oferta) ? " · 🏷️ " + esc(etiquetaOferta(p.oferta)) : ""}</small>
            </div>
            <button class="btn-sec" data-editar="${esc(id)}">✏️ Editar</button>
            <button class="btn-sec" data-oferta="${esc(id)}" title="Oferta">🏷️</button>
            <button class="btn-peligro" data-borrar="${esc(id)}">🗑️</button>
        </div>`;
    }).join("");
}

document.querySelectorAll("[data-vista]").forEach(b => b.addEventListener("click", () => {
    vista = b.dataset.vista;
    try { localStorage.setItem("adminVista", vista); } catch { /* sin almacenamiento */ }
    pintar();
}));

$("buscar").addEventListener("input", pintar);
$("filtro-cat").addEventListener("change", pintar);
$("lista").addEventListener("click", (e) => {
    const ed = e.target.closest("[data-editar]");
    const bo = e.target.closest("[data-borrar]");
    const of = e.target.closest("[data-oferta]");
    if (of) abrirOferta([of.dataset.oferta]);
    if (ed) abrirForm(ed.dataset.editar);
    if (bo) borrar(bo.dataset.borrar);
});

// ---------- Códigos e IDs autoincrementales ----------
const PREFIJOS = { "3D": "3D", TECNOLOGIA: "TECH", CARTAS: "CARTA" };

const categoriasMarcadas = () => [...document.querySelectorAll(".f-cat:checked")].map(c => c.value);

function siguienteCodigo(cat) {
    const pre = PREFIJOS[cat] || cat;
    const re = new RegExp(`^${pre}-(\\d+)$`);
    const max = Object.values(productos).reduce((m, p) => {
        const r = re.exec(String(p.codigo || ""));
        return r ? Math.max(m, Number(r[1])) : m;
    }, 0);
    return `${pre}-${String(max + 1).padStart(3, "0")}`;
}

function siguienteId() {
    const max = Object.keys(productos).reduce((m, k) => {
        const r = /^prod_(\d+)$/.exec(k);
        return r ? Math.max(m, Number(r[1])) : m;
    }, 0);
    return `prod_${max + 1}`;
}

$("f-codigo-auto").addEventListener("click", () => {
    $("f-codigo").value = siguienteCodigo(categoriasMarcadas()[0] || "3D");
});

// ---------- Formulario ----------
function abrirForm(id) {
    const p = id ? productos[id] : {};
    editando = { id: id || null, imagenes: Array.isArray(p.imagenes) ? [...p.imagenes] : (p.urlImagen ? [p.urlImagen] : []) };
    $("form-titulo").textContent = id ? "Editar producto" : "Nuevo producto";
    $("f-codigo").value = p.codigo || "";
    $("f-nombre").value = p.nombre || "";
    const cats = id ? categoriasDe(p) : ["3D"];
    document.querySelectorAll(".f-cat").forEach(c => { c.checked = cats.includes(c.value); });
    $("f-precio").value = p.precio ?? "";
    $("f-desc").value = p.descripcion || "";
    $("f-peso").value = p.peso || "";
    $("f-desc-larga").value = p.descripcionLarga || "";
    $("f-usos").value = (p.usos || []).join("\n");
    $("f-reco").value = p.recomendaciones || "";
    $("f-msg").textContent = id && !editando.imagenes.length
        ? "Este producto aún no tiene fotos propias: se muestran las de la carpeta del sitio, si existen." : "";
    pintarFotos();
    $("dlg").showModal();
}

function pintarFotos() {
    $("f-fotos").innerHTML = editando.imagenes.map((src, i) => `
        <div class="admin-foto">
            <img src="${esc(src)}" alt="">
            <div>
                <button type="button" data-mover="${i}:-1" ${i === 0 ? "disabled" : ""}>↑</button>
                <button type="button" data-mover="${i}:1" ${i === editando.imagenes.length - 1 ? "disabled" : ""}>↓</button>
                <button type="button" data-quitar="${i}">✕</button>
            </div>
        </div>`).join("");
}

$("f-fotos").addEventListener("click", (e) => {
    const m = e.target.closest("[data-mover]"), q = e.target.closest("[data-quitar]");
    if (m) {
        const [i, d] = m.dataset.mover.split(":").map(Number);
        const arr = editando.imagenes;
        [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
    }
    if (q) editando.imagenes.splice(Number(q.dataset.quitar), 1);
    pintarFotos();
});

$("f-url-add").addEventListener("click", () => {
    const u = $("f-url").value.trim();
    if (!u) return;
    editando.imagenes.push(convertirEnlaceDrive(u));
    $("f-url").value = "";
    pintarFotos();
});

$("f-archivos").addEventListener("change", async (e) => {
    const archivos = [...e.target.files];
    const carpeta = ($("f-codigo").value.trim() || "sin-codigo").replace(/[^\w-]/g, "_");
    for (const [n, a] of archivos.entries()) {
        $("f-msg").textContent = `Subiendo foto ${n + 1} de ${archivos.length}...`;
        try {
            const blob = await comprimir(a);
            const r = sRef(storage, `productos/${carpeta}/${Date.now()}_${n}.jpg`);
            await uploadBytes(r, blob, { contentType: "image/jpeg" });
            editando.imagenes.push(await getDownloadURL(r));
            pintarFotos();
        } catch (err) {
            $("f-msg").textContent = "No se pudo subir la foto (" + err.message +
                "). Revisa Storage y sus reglas, o pega una URL.";
            e.target.value = "";
            return;
        }
    }
    $("f-msg").textContent = "Fotos subidas. Recuerda pulsar Guardar.";
    e.target.value = "";
});

$("f-cancelar").addEventListener("click", () => $("dlg").close());

$("f-guardar").addEventListener("click", async () => {
    if (!$("f-codigo").value.trim()) $("f-codigo").value = siguienteCodigo(categoriasMarcadas()[0] || "3D");
    const codigo = $("f-codigo").value.trim(), nombre = $("f-nombre").value.trim();
    const precio = Number($("f-precio").value);
    const categorias = categoriasMarcadas();
    if (!categorias.length) { $("f-msg").textContent = "Marca al menos una categoría."; return; }
    if (!nombre || $("f-precio").value === "" || precio < 0) {
        $("f-msg").textContent = "Completa el nombre y un precio válido.";
        return;
    }
    const id = editando.id || siguienteId();
    const datos = {
        codigo, nombre, precio,
        categoria: categorias[0],
        categorias,
        descripcion: $("f-desc").value.trim(),
        peso: Math.max(0, Number($("f-peso").value) || 0),
        descripcionLarga: $("f-desc-larga").value.trim(),
        usos: $("f-usos").value.split("\n").map(s => s.trim()).filter(Boolean),
        recomendaciones: $("f-reco").value.trim(),
        imagenes: editando.imagenes,
        urlImagen: editando.imagenes[0] || ""
    };
    // Conserva la oferta del producto al editarlo
    if (editando.id && productos[editando.id]?.oferta) datos.oferta = productos[editando.id].oferta;
    $("f-msg").textContent = "Guardando...";
    try {
        await set(ref(db, `productos/${id}`), datos);
        productos[id] = datos;
        $("dlg").close();
        pintar();
    } catch (e) {
        $("f-msg").textContent = e.code === "PERMISSION_DENIED" || /permission/i.test(e.message)
            ? "Sin permiso: revisa que el UID de las reglas sea el tuyo."
            : "Error al guardar: " + e.message;
    }
});

// ---------- Eliminar ----------
async function borrar(id) {
    const p = productos[id];
    if (!confirm(`¿Eliminar «${p.nombre}»? Esta acción no se puede deshacer.`)) return;
    try {
        await remove(ref(db, `productos/${id}`));
        // Borra también sus fotos subidas a Storage (si las hay)
        for (const url of p.imagenes || []) {
            if (url.includes("firebasestorage")) {
                try { await deleteObject(sRef(storage, url)); } catch { /* ya no existe */ }
            }
        }
        delete productos[id];
        pintar();
    } catch (e) {
        alert("No se pudo eliminar: " + e.message);
    }
}

// ---------- Importar catálogo inicial ----------
$("btn-nuevo").addEventListener("click", () => abrirForm(null));

$("btn-importar").addEventListener("click", async () => {
    if (Object.keys(productos).length &&
        !confirm("Ya hay productos. Importar sobrescribirá los que tengan el mismo ID (prod_1, prod_2...). ¿Continuar?")) return;
    try {
        for (const [id, p] of Object.entries(productosData)) {
            await set(ref(db, `productos/${id}`), { ...p, categoria: normalizarCategoria(p.categoria), categorias: [normalizarCategoria(p.categoria)] });
        }
        await cargar();
    } catch (e) {
        $("estado").textContent = "No se pudo importar: " + e.message;
    }
});


// ---------- Ofertas rápidas ----------
let ofertaIds = [];
const CON_VALOR = ["porcentaje", "precio", "pack"];

function camposOferta() {
    const t = $("o-tipo").value;
    $("o-valor-caja").hidden = !CON_VALOR.includes(t);
    $("o-n-caja").hidden = !["nxm", "pack"].includes(t);
    $("o-m-caja").hidden = t !== "nxm";
    $("o-valor-label").textContent = { porcentaje: "Descuento (%)", precio: "Precio oferta (CLP)", pack: "Precio del pack (CLP)" }[t] || "";
    vistaPreviaOferta();
}

function leerOferta() {
    const t = $("o-tipo").value;
    const o = { tipo: t, activa: true };
    if (CON_VALOR.includes(t)) o.valor = Number($("o-valor").value);
    if (t === "nxm" || t === "pack") o.n = Number($("o-n").value);
    if (t === "nxm") o.m = Number($("o-m").value);
    if ($("o-desde").value) o.desde = $("o-desde").value;
    if ($("o-hasta").value) o.hasta = $("o-hasta").value;
    return o;
}

function errorOferta(o) {
    if (o.tipo === "porcentaje" && !(o.valor >= 1 && o.valor <= 99)) return "El descuento debe estar entre 1 y 99 %.";
    if ((o.tipo === "precio" || o.tipo === "pack") && !(o.valor > 0)) return "Escribe un precio mayor que 0.";
    if (o.tipo === "nxm" && !(Number.isInteger(o.n) && Number.isInteger(o.m) && o.n >= 2 && o.m >= 1 && o.m < o.n)) return "Debe ser N ≥ 2 y M menor que N (ej. 2x1, 3x2).";
    if (o.tipo === "pack" && !(Number.isInteger(o.n) && o.n >= 2)) return "El pack debe ser de 2 unidades o más.";
    if (o.desde && o.hasta && o.hasta < o.desde) return "La fecha «hasta» no puede ser anterior a «desde».";
    return "";
}

function vistaPreviaOferta() {
    const o = leerOferta(), err = errorOferta(o);
    const p = productos[ofertaIds[0]];
    if (err) { $("o-prev").textContent = err; return; }
    if (!p) { $("o-prev").textContent = ""; return; }
    const sinFechas = { ...o, desde: undefined, hasta: undefined };
    $("o-prev").textContent = `Con «${p.nombre}» ($${precioCLP(p.precio)} c/u): ` +
        [1, 2, 3, 4].map(c => `${c} u = $${precioCLP(totalLinea(p.precio, c, sinFechas))}`).join(" · ");
}

function abrirOferta(ids) {
    ofertaIds = ids;
    const p = productos[ids[0]] || {};
    const o = (ids.length === 1 && p.oferta) || { tipo: "porcentaje", valor: 20 };
    $("o-titulo").textContent = ids.length === 1 ? p.nombre : "";
    $("o-tipo").value = o.tipo;
    $("o-valor").value = o.valor ?? "";
    $("o-n").value = o.n ?? 2;
    $("o-m").value = o.m ?? 1;
    $("o-desde").value = o.desde || "";
    $("o-hasta").value = o.hasta || "";
    $("o-todos").checked = false;
    $("o-todos-txt").textContent = `Aplicar a los ${visiblesIds.length} productos que se ven ahora en la lista`;
    camposOferta();
    $("dlg-oferta").showModal();
}

function idsObjetivo() { return $("o-todos").checked ? visiblesIds : ofertaIds; }

["o-tipo", "o-valor", "o-n", "o-m", "o-desde", "o-hasta"].forEach(id => {
    $(id).addEventListener(id === "o-tipo" ? "change" : "input", camposOferta);
});

document.querySelectorAll("[data-preset]").forEach(b => b.addEventListener("click", () => {
    const o = JSON.parse(b.dataset.preset);
    $("o-tipo").value = o.tipo;
    if (o.valor !== undefined) $("o-valor").value = o.valor;
    if (o.n !== undefined) $("o-n").value = o.n;
    if (o.m !== undefined) $("o-m").value = o.m;
    camposOferta();
}));

$("o-cancelar").addEventListener("click", () => $("dlg-oferta").close());

$("o-guardar").addEventListener("click", async () => {
    const o = leerOferta(), err = errorOferta(o);
    if (err) { $("o-prev").textContent = err; return; }
    const ids = idsObjetivo();
    if (ids.length > 1 && !confirm(`¿Aplicar esta oferta a ${ids.length} productos?`)) return;
    try {
        for (const id of ids) {
            await set(ref(db, `productos/${id}/oferta`), o);
            productos[id].oferta = o;
        }
        $("dlg-oferta").close();
        pintar();
    } catch (e) {
        $("o-prev").textContent = "No se pudo guardar: " + e.message;
    }
});

$("o-quitar").addEventListener("click", async () => {
    const ids = idsObjetivo();
    if (ids.length > 1 && !confirm(`¿Quitar la oferta de ${ids.length} productos?`)) return;
    try {
        for (const id of ids) {
            await remove(ref(db, `productos/${id}/oferta`));
            delete productos[id].oferta;
        }
        $("dlg-oferta").close();
        pintar();
    } catch (e) {
        $("o-prev").textContent = "No se pudo quitar: " + e.message;
    }
});


// ---------- Envíos ----------
function pintarEnvios(cfg) {
    $("e-tabla").innerHTML = `<table class="admin-tabla"><thead><tr><th>Courier</th>${TRAMOS.map(t => `<th>hasta ${t} kg</th>`).join("")}</tr></thead><tbody>
        ${COURIERS.map((c, ci) => `<tr><td>${esc(c)}</td>${TRAMOS.map((t, ti) =>
            `<td><input type="number" min="0" step="10" id="e-b-${ci}-${ti}" value="${Number(cfg.base[c]?.[ti] || 0)}"></td>`).join("")}</tr>`).join("")}
        </tbody></table>`;
    $("e-zonas").innerHTML = Object.entries(ZONAS).map(([k, n]) =>
        `<label>${esc(n)} ×<input type="number" min="0.1" step="0.05" id="e-z-${k}" value="${Number(cfg.zonas[k] ?? 1)}"></label>`).join("");
    $("e-peso").value = cfg.pesoDefecto;
    $("e-retiro").checked = cfg.retiro !== false;
    $("e-porpagar").checked = cfg.porPagar !== false;
}

function leerEnvios() {
    const base = {};
    COURIERS.forEach((c, ci) => { base[c] = TRAMOS.map((t, ti) => Math.max(0, Number($(`e-b-${ci}-${ti}`).value) || 0)); });
    const zonas = {};
    Object.keys(ZONAS).forEach(k => { zonas[k] = Math.max(0.1, Number($(`e-z-${k}`).value) || 1); });
    return {
        pesoDefecto: Math.max(0.05, Number($("e-peso").value) || 0.5),
        retiro: $("e-retiro").checked,
        porPagar: $("e-porpagar").checked,
        base, zonas
    };
}

$("btn-envios").addEventListener("click", async () => {
    $("e-msg").textContent = "Cargando...";
    pintarEnvios(await cargarConfigEnvios(true));
    $("e-msg").textContent = "";
    $("dlg-envios").showModal();
});
$("e-restaurar").addEventListener("click", () => {
    pintarEnvios(ENVIOS_DEFECTO);
    $("e-msg").textContent = "Valores de referencia cargados. Pulsa Guardar para aplicarlos.";
});
$("e-cancelar").addEventListener("click", () => $("dlg-envios").close());
$("e-guardar").addEventListener("click", async () => {
    try {
        await set(ref(db, "config/envios"), leerEnvios());
        limpiarCacheEnvios();
        $("e-msg").textContent = "Guardado.";
    } catch (e) {
        $("e-msg").textContent = /permission/i.test(e.message)
            ? "Sin permiso: publica las reglas nuevas de Realtime Database (incluyen «config»)."
            : "No se pudo guardar: " + e.message;
    }
});


// ---------- Google Drive (biblioteca de fotos) ----------
let driveCfg = {};
let driveFotos = [];
const driveSel = new Set();

async function cargarCfgDrive() {
    try { driveCfg = (await get(ref(db, "config/drive"))).val() || {}; } catch { driveCfg = {}; }
    return driveCfg;
}

function pintarDrive() {
    const q = $("d-buscar").value.trim().toLowerCase();
    const lista = driveFotos.filter(f => !q || f.name.toLowerCase().includes(q));
    $("d-grid").innerHTML = lista.map(f => `
        <label class="drive-item">
            <input type="checkbox" data-id="${esc(f.id)}" ${driveSel.has(f.id) ? "checked" : ""}>
            <img src="${esc(urlDeArchivoDrive(f.id, 240))}" alt="" loading="lazy">
            <span>${esc(f.name)}</span>
        </label>`).join("");
    $("d-agregar").textContent = driveSel.size ? `Agregar ${driveSel.size} seleccionada(s)` : "Agregar seleccionadas";
}

async function refrescarDrive() {
    const key = $("d-key").value.trim(), carpeta = idDeEnlace($("d-carpeta").value);
    if (!key || !carpeta) { $("d-msg").textContent = "Completa la clave de API y la carpeta en «Configuración»."; return; }
    $("d-msg").textContent = "Leyendo la carpeta de Drive...";
    try {
        driveFotos = await listarImagenes(key, carpeta);
        $("d-msg").textContent = driveFotos.length ? `${driveFotos.length} imágenes en la carpeta.` : "No hay imágenes en esa carpeta (o no está compartida con «cualquiera con el enlace»).";
        pintarDrive();
    } catch (e) {
        $("d-msg").textContent = "No se pudo leer Drive: " + e.message;
    }
}

$("f-drive").addEventListener("click", async () => {
    driveSel.clear();
    $("dlg-drive").showModal();
    $("d-msg").textContent = "Cargando...";
    const c = await cargarCfgDrive();
    $("d-key").value = c.apiKey || "";
    $("d-carpeta").value = c.carpetaId || CARPETA_POR_DEFECTO;
    if (c.apiKey) await refrescarDrive();
    else {
        $("d-msg").textContent = "Primero guarda tu clave de API en «Configuración».";
        document.querySelector("#dlg-drive details").open = true;
    }
});

$("d-guardar").addEventListener("click", async () => {
    const cfg = { apiKey: $("d-key").value.trim(), carpetaId: idDeEnlace($("d-carpeta").value) || CARPETA_POR_DEFECTO };
    try {
        await set(ref(db, "config/drive"), cfg);
        driveCfg = cfg;
        await refrescarDrive();
    } catch (e) {
        $("d-msg").textContent = "No se pudo guardar: " + e.message;
    }
});

$("d-actualizar").addEventListener("click", refrescarDrive);
$("d-buscar").addEventListener("input", pintarDrive);
$("d-grid").addEventListener("change", (e) => {
    const id = e.target.dataset?.id;
    if (!id) return;
    e.target.checked ? driveSel.add(id) : driveSel.delete(id);
    pintarDrive();
});
$("d-cerrar").addEventListener("click", () => $("dlg-drive").close());
$("d-agregar").addEventListener("click", () => {
    driveSel.forEach(id => editando.imagenes.push(urlDeArchivoDrive(id, 1000)));
    driveSel.clear();
    pintarFotos();
    $("f-msg").textContent = "Fotos de Drive agregadas. Recuerda pulsar Guardar.";
    $("dlg-drive").close();
});
