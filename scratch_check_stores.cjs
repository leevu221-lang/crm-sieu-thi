const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
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
  const q1 = query(collection(db, 'store'), where('warehouse_code', '==', '1841'));
  const snap1 = await getDocs(q1);
  console.log(`Documents with warehouse_code == '1841': ${snap1.size}`);
  snap1.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: "${doc.id}"`);
    console.log(`  ten_sieu_thi: "${data.ten_sieu_thi}"`);
    console.log(`  declared_stores:`, data.declared_stores);
  });

  const q2 = query(collection(db, 'store'), where('warehouse_code', '==', 1841));
  const snap2 = await getDocs(q2);
  console.log(`Documents with warehouse_code == 1841: ${snap2.size}`);
  snap2.docs.forEach(doc => {
    const data = doc.data();
    console.log(`ID: "${doc.id}"`);
    console.log(`  ten_sieu_thi: "${data.ten_sieu_thi}"`);
    console.log(`  declared_stores:`, data.declared_stores);
  });
}

check().catch(console.error);
