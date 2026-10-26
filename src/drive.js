// Google Drive como biblioteca de fotos: listar una carpeta pública y usar sus imágenes
export const CARPETA_POR_DEFECTO = "1kRUMYe11c_yf0qgAhawJyiTtWAXcfTlE";

// Saca el ID de un enlace de Drive (carpeta o archivo) o acepta el ID directamente
export function idDeEnlace(texto) {
    const t = String(texto || "").trim();
    const m = t.match(/\/folders\/([\w-]{10,})/) || t.match(/\/file\/d\/([\w-]{10,})/) || t.match(/[?&]id=([\w-]{10,})/);
    if (m) return m[1];
    return /^[\w-]{20,}$/.test(t) ? t : "";
}

// Imagen redimensionada por Google (las fotos de 15-20 MB se sirven livianas)
export const urlDeArchivoDrive = (id, ancho = 1000) =>
    `https://drive.google.com/thumbnail?id=${id}&sz=w${ancho}`;

// Si pegan un enlace de ARCHIVO de Drive, lo convierte en URL de imagen; otros enlaces quedan igual
export function convertirEnlaceDrive(url) {
    if (/drive\.google\.com\/(file\/d\/|open\?|uc\?|thumbnail\?)/.test(url)) {
        const id = idDeEnlace(url);
        if (id) return urlDeArchivoDrive(id);
    }
    return url;
}

// Lista las imágenes de una carpeta compartida ("cualquiera con el enlace") usando una clave de API
export async function listarImagenes(apiKey, carpetaId, bearer = "") {
    const out = [];
    let token = "";
    do {
        const q = encodeURIComponent(`'${carpetaId}' in parents and mimeType contains 'image/' and trashed=false`);
        const campos = encodeURIComponent("nextPageToken,files(id,name,mimeType)");
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${campos}&pageSize=200&orderBy=name${bearer ? "" : `&key=${encodeURIComponent(apiKey)}`}` +
            (token ? `&pageToken=${encodeURIComponent(token)}` : "");
        const r = await fetch(url, bearer ? { headers: { Authorization: `Bearer ${bearer}` } } : undefined);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error?.message || "Error al leer Drive");
        out.push(...(j.files || []));
        token = j.nextPageToken || "";
    } while (token && out.length < 1000);
    return out;
}

// ---------- Conexión con tu cuenta de Google (para subir fotos a Drive) ----------
let token = "";
let expira = 0;

export const tokenDrive = () => (token && Date.now() < expira - 60000 ? token : "");

export function cargarGIS() {
    return new Promise((ok, fallo) => {
        if (window.google?.accounts?.oauth2) return ok();
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.onload = () => ok();
        s.onerror = () => fallo(new Error("No se pudo cargar el inicio de sesión de Google"));
        document.head.appendChild(s);
    });
}

// Abre la ventana de Google (debe llamarse desde un clic). El permiso dura cerca de 1 hora.
export async function conectarDrive(clientId) {
    if (tokenDrive()) return token;
    await cargarGIS();
    return new Promise((ok, fallo) => {
        const cliente = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: "https://www.googleapis.com/auth/drive",
            callback: (r) => {
                if (r.error) return fallo(new Error(r.error_description || r.error));
                token = r.access_token;
                expira = Date.now() + Number(r.expires_in || 3600) * 1000;
                ok(token);
            },
            error_callback: (e) => fallo(new Error(e?.type === "popup_closed" ? "Cerraste la ventana de Google" : (e?.message || e?.type || "No se pudo conectar")))
        });
        cliente.requestAccessToken({ prompt: "" });
    });
}

// Sube un archivo a la carpeta y devuelve su ID (hereda el acceso público de la carpeta)
export async function subirADrive(carpetaId, blob, nombre) {
    const t = tokenDrive();
    if (!t) throw new Error("Sesión de Google vencida: vuelve a conectar");
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: nombre, parents: [carpetaId] })], { type: "application/json" }));
    form.append("file", blob);
    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST", headers: { Authorization: `Bearer ${t}` }, body: form
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || "Error al subir a Drive");
    // Por seguridad, deja el archivo visible con enlace (si la carpeta ya es pública no cambia nada)
    try {
        await fetch(`https://www.googleapis.com/drive/v3/files/${j.id}/permissions`, {
            method: "POST",
            headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
            body: JSON.stringify({ role: "reader", type: "anyone" })
        });
    } catch { /* ya hereda el acceso de la carpeta */ }
    return j.id;
}
