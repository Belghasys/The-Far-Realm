import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDDHz82zx8oRtQJzlpCP8dPvBJEgJNBkNc",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mydndadventure.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mydndadventure",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mydndadventure.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "128819294466",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:128819294466:web:898ac7ac7556c96d3d921b",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-7NPTDN2SHP"
};

const app = initializeApp(firebaseConfig);
// Exporté pour getFunctions(app, region) — proxy média (runwareImageService).
export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

