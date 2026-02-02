import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyBS8lgDE-FGahGyvP8ycCz7QDsM6kv87M8",
  authDomain: "travel-notebook-eb1e5.firebaseapp.com",
  projectId: "travel-notebook-eb1e5",
  storageBucket: "travel-notebook-eb1e5.firebasestorage.app",
  messagingSenderId: "263641719156",
  appId: "1:263641719156:web:d353ce5f3ff05eea374c21",
  measurementId: "G-ZFG257YFXQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appId = "my-travel-notebook-v1"; 