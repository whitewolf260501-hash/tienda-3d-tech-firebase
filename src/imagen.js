// Reduce una foto a 1200 px máx. y la convierte en JPG (~200 KB)
export function comprimir(archivo) {
    return new Promise((ok, fallo) => {
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, 1200 / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * k);
            c.height = Math.round(img.height * k);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            c.toBlob(b => b ? ok(b) : fallo(new Error("No se pudo comprimir")), "image/jpeg", 0.8);
            URL.revokeObjectURL(img.src);
        };
        img.onerror = () => fallo(new Error("Imagen no válida"));
        img.src = URL.createObjectURL(archivo);
    });
}
