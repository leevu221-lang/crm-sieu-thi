import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, query, where, getDocs, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const warehouseCode = "ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH";

const employees = [
  { name: "Nguyễn Diệu Ái", birthday: "2007-12-22" },
  { name: "Lâm Tiểu Băng", birthday: "2001-09-14" },
  { name: "Ngô thị bé thắm", birthday: "1991-05-30" },
  { name: "Lê Thị Ngọc Trâm", birthday: "1998-05-24" },
  { name: "Võ Trung Tín", birthday: "1993-12-23" },
  { name: "Thạch Vũ", birthday: "1997-06-27" },
  { name: "Trần Anh Thư", birthday: "2007-12-07" },
  { name: "Nguyễn Thị Nhạn", birthday: "1987-03-10" },
  { name: "Nguyễn Thị Thu Trúc", birthday: "1995-09-25" },
  { name: "Nguyễn Duy Khắc", birthday: "1991-11-06" },
  { name: "Nguyễn Hoàng Tuấn", birthday: "2000-09-12" },
  { name: "Huỳnh Hoàng Phúc", birthday: "1994-03-02" },
  { name: "Phạm Văn Đại", birthday: "1998-07-24" },
  { name: "Lâm Thị Như Ý", birthday: "1991-07-21" },
  { name: "Trương Thị huyền Trinh", birthday: "1993-06-26" },
  { name: "Võ Vũ Linh", birthday: "1992-07-06" },
  { name: "Lê Kim Mỹ", birthday: "1994-07-07" },
  { name: "Nguyễn Hùng Mạnh", birthday: "1991-11-20" }
];

async function upsertBirthday(employeeName, birthday, warehouseCode) {
  const q = query(
    collection(db, "employee_birthdays"),
    where("employee_name", "==", employeeName),
    where("warehouse_code", "==", warehouseCode)
  );
  
  const snap = await getDocs(q);
  if (!snap.empty) {
    const docId = snap.docs[0].id;
    console.log(`Updating ${employeeName} (${warehouseCode}) birthday to ${birthday}...`);
    await setDoc(doc(db, "employee_birthdays", docId), {
      employee_name: employeeName,
      birthday: birthday,
      warehouse_code: warehouseCode,
      updated_at: serverTimestamp()
    }, { merge: true });
  } else {
    console.log(`Adding ${employeeName} (${warehouseCode}) with birthday ${birthday}...`);
    await addDoc(collection(db, "employee_birthdays"), {
      employee_name: employeeName,
      birthday: birthday,
      warehouse_code: warehouseCode,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }
}

async function run() {
  console.log("Starting import to Firebase...");
  for (const emp of employees) {
    await upsertBirthday(emp.name, emp.birthday, warehouseCode);
  }
  console.log("Import completed successfully!");
}

run().catch(console.error);
