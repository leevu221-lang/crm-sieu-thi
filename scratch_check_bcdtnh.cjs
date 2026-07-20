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

async function check() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("bcdtnh_this_month_filename:", data.bcdtnh_this_month_filename);
  console.log("bcdtnh_this_month_data length:", data.bcdtnh_this_month_data ? data.bcdtnh_this_month_data.length : 0);
  console.log("bcdtnh_last_month_filename:", data.bcdtnh_last_month_filename);
  console.log("bcdtnh_last_month_data length:", data.bcdtnh_last_month_data ? data.bcdtnh_last_month_data.length : 0);
  
  if (data.bcdtnh_this_month_data) {
    console.log("Sample this month data:", JSON.stringify(data.bcdtnh_this_month_data.substring(0, 500)));
  }
}

check().catch(console.error);
