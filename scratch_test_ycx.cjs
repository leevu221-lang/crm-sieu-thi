const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Simple stub for normalize, conversionRates, etc.
const CONVERSION_RATES = {};

// We can just import parseYcxData and parseYcxRankData from utils if possible, or replicate them.
// But wait, let's write a script that loads them from the file or check if they throw.
// Since we have the absolute path, we can try to require or run a node command with tsx.

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("ycx_data length:", data.ycx_data ? data.ycx_data.length : 'none');
  
  // Let's run a TS script via npx tsx to import the real utils functions and test them!
}

test().catch(console.error);
