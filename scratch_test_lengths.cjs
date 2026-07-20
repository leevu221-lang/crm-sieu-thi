const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
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

// We will read useRealtimeData and utils to run them
// But wait, to be safe, let's write a script that loads the data and executes the parsers
// Let's copy the parser functions from src/pages/RTST/utils.ts

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("rt_bi_tong_quan length:", data.rt_bi_tong_quan ? data.rt_bi_tong_quan.length : 0);
  console.log("rt_nh_cum length:", data.rt_nh_cum ? data.rt_nh_cum.length : 0);
  console.log("lk_bi_tong_quan length:", data.lk_bi_tong_quan ? data.lk_bi_tong_quan.length : 0);
  console.log("ycx_data length:", data.ycx_data ? data.ycx_data.length : 0);
}

test().catch(console.error);
