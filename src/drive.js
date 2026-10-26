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
export async function listarImagenes(apiKey, carpetaId) {
    const out = [];
    let token = "";
    do {
        const q = encodeURIComponent(`'${carpetaId}' in parents and mimeType contains 'image/' and trashed=false`);
        const campos = encodeURIComponent("nextPageToken,files(id,name,mimeType)");
        const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${campos}&pageSize=200&orderBy=name&key=${encodeURIComponent(apiKey)}` +
            (token ? `&pageToken=${encodeURIComponent(token)}` : "");
        const r = await fetch(url);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error?.message || "Error al leer Drive");
        out.push(...(j.files || []));
        token = j.nextPageToken || "";
    } while (token && out.length < 1000);
    return out;
}
