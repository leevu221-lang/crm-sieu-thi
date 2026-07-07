const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");
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

async function run() {
  const querySnapshot = await getDocs(collection(db, "store"));
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.tragop_nv) {
      console.log(`=== STORE ID: ${doc.id} (ten_sieu_thi: ${data.ten_sieu_thi}) ===`);
      console.log(data.tragop_nv);
      console.log(`=========================================\n`);
    }
  });
}
run().catch(console.error);
