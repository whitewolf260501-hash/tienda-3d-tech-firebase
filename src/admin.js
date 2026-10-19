// Panel de administración: login, listar, crear, editar y eliminar productos
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ref, get, set, remove } from "firebase/database";
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, auth, storage } from "./firebase-admin.js";
import { productosData } from "./productos.js";
import { comprimir } from "./imagen.js";
import { esc, precioCLP, normalizarCategoria, categoriasDe, enriquecer, IMAGEN_DEFAULT } from "./catalogo.js";
import { crearTarjeta } from "./tarjeta.js";

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
    cont.className = { lista: "admin-lista", iconos: "admin-iconos", tienda: "grid-productos" }[vista] || "admin-lista";
    document.querySelectorAll("[data-vista]").forEach(b => b.classList.toggle("activa", b.dataset.vista === vista));

    // Vista tienda: las mismas tarjetas que ve el cliente (carrusel y ventana flotante incluidos)
    if (vista === "tienda") {
        cont.innerHTML = "";
        filas.forEach(([id, p]) => cont.appendChild(crearTarjeta(enriquecer({ id, ...p }), {
            admin: true,
            alClic: () => abrirForm(id),
            onEditar: () => abrirForm(id),
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
                <small>${esc(p.codigo)} · $${precioCLP(p.precio)}</small>
                <div class="admin-icono-btns">
                    <button class="btn-sec" data-editar="${esc(id)}">✏️</button>
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
                <small>${esc(p.codigo)} · ${esc(categoriasDe(p).join(" + "))} · $${precioCLP(p.precio)}</small>
            </div>
            <button class="btn-sec" data-editar="${esc(id)}">✏️ Editar</button>
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
    editando.imagenes.push(u);
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
        descripcionLarga: $("f-desc-larga").value.trim(),
        usos: $("f-usos").value.split("\n").map(s => s.trim()).filter(Boolean),
        recomendaciones: $("f-reco").value.trim(),
        imagenes: editando.imagenes,
        urlImagen: editando.imagenes[0] || ""
    };
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
