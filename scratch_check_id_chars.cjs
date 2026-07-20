const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');
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
  const colRef = collection(db, 'store');
  const snap = await getDocs(colRef);
  snap.forEach(doc => {
    const id = doc.id;
    if (id.includes('NGUYỄN TẤT THÀNH') || id.includes('155A')) {
      console.log("Found ID:", JSON.stringify(id));
      const chars = [];
      for (let i = 0; i < id.length; i++) {
        chars.push({ char: id[i], code: id.charCodeAt(i) });
      }
      console.log("ID chars:", chars);
    }
  });
}

check().catch(console.error);
