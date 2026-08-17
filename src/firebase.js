import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyCExv1d6jRrV-YEnhFwnAj5XEAdFnueZBk",
    authDomain: "tienda-3d-tech.firebaseapp.com",
    databaseURL: "https://tienda-3d-tech-default-rtdb.firebaseio.com", // <--- ¡Asegúrate de agregar esta línea!
    projectId: "tienda-3d-tech",
    storageBucket: "tienda-3d-tech.firebasestorage.app",
    messagingSenderId: "1082813239787",
    appId: "1:1082813239787:web:891d3e1e55317c4e63c9ae"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);