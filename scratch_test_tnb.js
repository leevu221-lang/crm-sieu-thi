import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
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
  console.log("Starting Firebase diagnostic for tnb_data...");
  const warehouseCode = "10528";
  
  // Test 1: Write to 10528_rt_st
  try {
    console.log("Test 1: Writing to tnb_data with ID '10528_rt_st'...");
    const docRef = doc(db, "tnb_data", `${warehouseCode}_rt_st`);
    await setDoc(docRef, {
      warehouse_code: warehouseCode,
      ten_sieu_thi: "Test Supermarket",
      value: "Test Value",
      updated_at: new Date().toISOString()
    });
    console.log("Test 1 SUCCESS!");
  } catch (err) {
    console.error("Test 1 FAILED:", err);
  }

  // Test 2: Write to 10528
  try {
    console.log("Test 2: Writing to tnb_data with ID '10528'...");
    const docRef = doc(db, "tnb_data", warehouseCode);
    await setDoc(docRef, {
      warehouse_code: warehouseCode,
      ten_sieu_thi: "Test Supermarket",
      value: "Test Value",
      updated_at: new Date().toISOString()
    });
    console.log("Test 2 SUCCESS!");
  } catch (err) {
    console.error("Test 2 FAILED:", err);
  }
}

run().catch(console.error);
