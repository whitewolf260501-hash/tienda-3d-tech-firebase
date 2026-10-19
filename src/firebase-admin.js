// Servicios que solo usa el panel de administración
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { app, db } from "./firebase.js";

export { db };
export const auth = getAuth(app);
export const storage = getStorage(app);
