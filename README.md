# Tienda 3D & Tech

Catálogo estático con Vite + JavaScript, Firebase Realtime Database, carrito con `localStorage`, WhatsApp y EmailJS.

## Desarrollo local

```bash
npm install
npm run dev
```

## Producción

```bash
npm run build
npm run preview
```

## GitHub Pages

El workflow de `.github/workflows/deploy.yml` construye las tres páginas:

- `index.html`
- `tecnologia.html`
- `carrito.html`

y las publica automáticamente en GitHub Pages cada vez que haces push a `main`.

Repositorio configurado en el proyecto original:

`https://github.com/whitewolf260501-hash/tienda-3d-tech`

URL esperada:

`https://whitewolf260501-hash.github.io/tienda-3d-tech/`

## Firebase

La aplicación usa Firebase Realtime Database en la ruta:

`productos`

Cada producto puede tener:

- `codigo`
- `nombre`
- `descripcion`
- `precio`
- `categoria`
- `urlImagen`

Ejemplo:

```json
{
  "productos": {
    "prod_1": {
      "codigo": "3D-001",
      "nombre": "Llavero 3D Personalizado",
      "descripcion": "Llavero impreso en PLA de alta resistencia.",
      "precio": 2500,
      "categoria": "3d",
      "urlImagen": ""
    }
  }
}
```

El archivo `firebase-database.rules.json` deja la lectura pública y bloquea escrituras desde el navegador. Esto es apropiado para un catálogo donde los productos se administran desde Firebase Console.

> La configuración web de Firebase contiene una API key pública; la seguridad real está en las reglas de Firebase, no en ocultar esa configuración.

## Administración (`admin.html`)

Panel para crear, editar y eliminar productos, precios, descripciones y fotos. Guarda en Firebase, así que los cambios los ven todos los clientes.

Configuración (una sola vez), en [Firebase Console](https://console.firebase.google.com):

1. **Authentication → Sign-in method:** activa *Correo electrónico/contraseña*.
2. **Authentication → Users:** crea tu usuario y copia su **UID**.
3. Pega ese UID en `firebase-database.rules.json` y `storage.rules` (reemplaza `PEGA_AQUI_TU_UID`) y publícalos en *Realtime Database → Reglas* y *Storage → Reglas*.
4. **Storage:** actívalo (Firebase puede pedir el plan Blaze). Sin Storage también funciona pegando URLs de imágenes.
5. Entra a `admin.html`, inicia sesión y usa **Importar catálogo inicial** una vez.

### Imágenes en "diseño propio"

Los clientes pueden subir hasta 3 imágenes de referencia (se guardan en `solicitudes/` de Storage y llegan como links en el WhatsApp o el correo). Para activarlo:

1. **Authentication → Sign-in method:** activa el proveedor *Anónimo*.
2. Publica `storage.rules` con tu UID (ya incluye las reglas de `solicitudes/`).
3. Los archivos 3D (STL, 3MF, OBJ, STEP, PLY, AMF o ZIP, hasta 30 MB) quedan en `solicitudes-modelos/`.
4. De vez en cuando borra los archivos viejos de `solicitudes/` y `solicitudes-modelos/` desde Storage.
