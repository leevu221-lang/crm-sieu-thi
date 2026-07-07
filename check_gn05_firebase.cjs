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
  console.log("Checking Firestore for collection 'store'...");
  const snap = await getDocs(collection(db, 'store'));
  
  let targetDoc = null;
  snap.docs.forEach(d => {
    const data = d.data();
    if (d.id === '1841' || (data.warehouse_code && String(data.warehouse_code).includes('1841')) || (data.ten_sieu_thi && String(data.ten_sieu_thi).includes('1841'))) {
      targetDoc = d;
    }
  });

  if (!targetDoc) {
    console.log("No document found for store 1841");
    return;
  }

  console.log("Document ID:", targetDoc.id);
  const data = targetDoc.data();
  console.log("ten_sieu_thi:", data.ten_sieu_thi);
  console.log("warehouse_code:", data.warehouse_code);
  
  if (!data.ycx_data) {
    console.log("No ycx_data found in document!");
    return;
  }

  const lines = data.ycx_data.split('\n').filter(l => l.trim());
  if (lines.length === 0) {
    console.log("ycx_data is empty!");
    return;
  }

  const headers = lines[0].split('\t');
  console.log("Headers:");
  headers.forEach((h, i) => {
    console.log(`  ${i}: "${h}"`);
  });

  console.log("\nMatching rows for 'GN-05':");
  lines.forEach((line, idx) => {
    if (line.includes('GN-05')) {
      const cells = line.split('\t');
      console.log(`Row ${idx}:`);
      cells.forEach((cell, i) => {
        console.log(`  ${headers[i] || i}: "${cell}"`);
      });
    }
  });
}

check().catch(console.error);
