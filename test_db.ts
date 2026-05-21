import { db } from './src/firebase.ts';
import { doc, getDoc } from 'firebase/firestore';

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  console.log("EXISTS:", snap.exists());
  if (snap.exists()) {
    const data = snap.data();
    console.log("lk_nh_sieu_thi length:", data.lk_nh_sieu_thi ? data.lk_nh_sieu_thi.length : 0);
    console.log("lk_nh_sieu_thi prefix:", data.lk_nh_sieu_thi ? data.lk_nh_sieu_thi.substring(0, 50) : "NONE");
    console.log("updated_at:", data.updated_at);
  }
  process.exit(0);
}
test();
