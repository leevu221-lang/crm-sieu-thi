const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function check() {
  const snap = await getDocs(collection(db, 'store'));
  snap.docs.forEach(doc => {
    if (doc.id.includes('155A')) {
      const dbId = doc.id;
      const nfcId = dbId.normalize('NFC');
      const nfdId = dbId.normalize('NFD');
      
      console.log(`DB Doc ID: "${dbId}"`);
      console.log(`Length: DB=${dbId.length}, NFC=${nfcId.length}, NFD=${nfdId.length}`);
      
      // Print char codes
      const dbCodes = Array.from(dbId).map(c => c.charCodeAt(0));
      const nfcCodes = Array.from(nfcId).map(c => c.charCodeAt(0));
      const nfdCodes = Array.from(nfdId).map(c => c.charCodeAt(0));
      
      console.log("DB Codes :", dbCodes.slice(-15));
      console.log("NFC Codes:", nfcCodes.slice(-15));
      console.log("NFD Codes:", nfdCodes.slice(-15));
      
      console.log("Is DB ID equal to NFC ID?", dbId === nfcId);
      console.log("Is DB ID equal to NFD ID?", dbId === nfdId);
    }
  });
}

check().catch(console.error);
