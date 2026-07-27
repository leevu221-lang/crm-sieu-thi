import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const getEnvVar = (name: string) => {
  const envObj = (import.meta as any).env || {};
  const viteVar = envObj[`VITE_${name}`];
  const directVar = envObj[name];
  const processVar = typeof process !== 'undefined' ? process.env[`VITE_${name}`] || process.env[name] : undefined;
  
  return (viteVar || directVar || processVar || '').trim();
};

const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('FIREBASE_APP_ID')
};

// Check if configuration is valid
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== "YOUR_API_KEY"
);

// Initialize Firebase
const app = initializeApp(
  isFirebaseConfigured 
    ? firebaseConfig 
    : {
        apiKey: "placeholder",
        authDomain: "placeholder",
        projectId: "placeholder-id",
        storageBucket: "placeholder",
        messagingSenderId: "placeholder",
        appId: "placeholder"
      }
);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
