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
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'travel-notebook-v1';