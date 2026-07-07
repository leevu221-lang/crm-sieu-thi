import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

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
  console.log("Checking Firestore for collection 'store'...");
  const q = query(collection(db, 'store'));
  const snap = await getDocs(q);
  console.log(`Total documents found in 'store': ${snap.size}`);
  
  snap.docs.forEach(doc => {
    const data = doc.data();
    if (doc.id.includes('155A') || (data.ten_sieu_thi && data.ten_sieu_thi.includes('155A'))) {
      console.log(`ID: "${doc.id}"`);
      console.log(`ten_sieu_thi: "${data.ten_sieu_thi}"`);
      console.log(`warehouse_code: "${data.warehouse_code}"`);
      console.log(`tragop_nv length: ${data.tragop_nv ? data.tragop_nv.length : 'undefined'}`);
      if (data.tragop_nv) {
        console.log("tragop_nv content preview:");
        console.log(data.tragop_nv.substring(0, 300));
      }
      console.log("------------------------------------------");
    }
  });
}

check().catch(console.error);
