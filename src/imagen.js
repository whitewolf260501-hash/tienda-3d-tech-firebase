// Reduce una foto a 1200 px máx. y la convierte en JPG (~200 KB). Rápido incluso con fotos de 15-20 MB.
export async function comprimir(archivo, max = 1200, calidad = 0.8) {
    const url = URL.createObjectURL(archivo);
    try {
        const img = await new Promise((ok, fallo) => {
            const i = new Image();
            i.onload = () => ok(i);
            i.onerror = () => fallo(new Error("Imagen no válida"));
            i.src = url;
        });
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k));
        const h = Math.max(1, Math.round(img.naturalHeight * k));

        // createImageBitmap decodifica ya reducida (mucho más rápido); si no existe, usa la imagen normal
        let fuente = img;
        try {
            if (typeof createImageBitmap === "function") {
                fuente = await createImageBitmap(archivo, { resizeWidth: w, resizeHeight: h, resizeQuality: "medium" });
            }
        } catch { fuente = img; }

        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(fuente, 0, 0, w, h);
        fuente.close?.();
        return await new Promise((ok, fallo) =>
            c.toBlob(b => (b ? ok(b) : fallo(new Error("No se pudo comprimir"))), "image/jpeg", calidad));
    } finally {
        URL.revokeObjectURL(url);
    }
}
