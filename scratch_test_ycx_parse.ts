import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import { parseYcxData, parseYcxRankData, CONVERSION_RATES } from './src/pages/RTST/utils';

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

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("ycx_data length:", data.ycx_data?.length);
  
  try {
    const staff = parseYcxData(data.ycx_data || '', CONVERSION_RATES);
    console.log("parseYcxData count:", staff.length);
  } catch (err) {
    console.error("parseYcxData error:", err);
  }

  try {
    const rank = parseYcxRankData(data.ycx_data || '', CONVERSION_RATES);
    console.log("parseYcxRankData count:", rank.length);
  } catch (err) {
    console.error("parseYcxRankData error:", err);
  }
}

test().catch(console.error);
