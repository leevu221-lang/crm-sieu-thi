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
    console.log(`lk_nh_sieu_thi length: ${data.lk_nh_sieu_thi ? data.lk_nh_sieu_thi.length : 0}`);
    console.log(`lk_bi_tong_quan length: ${data.lk_bi_tong_quan ? data.lk_bi_tong_quan.length : 0}`);
    console.log(`category_targets length: ${data.category_targets ? data.category_targets.length : 0}`);
    console.log('--------------------');
  });
}
run().catch(console.error);
