import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        tecnologia: resolve(__dirname, "tecnologia.html"),
        carrito: resolve(__dirname, "carrito.html"),
      },
    },
  },
});
