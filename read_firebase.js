import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

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
    console.log(`Document ID: ${doc.id}`);
    const data = doc.data();
    console.log(`ten_sieu_thi: ${data.ten_sieu_thi}`);
    console.log(`tragop_matran: ${data.tragop_matran ? data.tragop_matran.substring(0, 100) + '...' : 'none'}`);
    console.log(`tragop_nv: ${data.tragop_nv ? data.tragop_nv.substring(0, 100) + '...' : 'none'}`);
    console.log(`tragop_matran_full_length: ${data.tragop_matran ? data.tragop_matran.length : 0}`);
    console.log('--------------------');
  });
}
run().catch(console.error);
