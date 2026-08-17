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
