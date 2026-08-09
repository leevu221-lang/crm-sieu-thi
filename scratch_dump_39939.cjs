const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA_FevBrpgE6R1YVbL321BeuX5J8v0Su00",
  authDomain: "crm-43751-71e4b.firebaseapp.com",
  projectId: "crm-43751-71e4b",
  storageBucket: "crm-43751-71e4b.firebasestorage.app",
  messagingSenderId: "665213457085",
  appId: "1:665213457085:web:976cdbafbf69583d73ddd4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function dump() {
  const snap = await getDoc(doc(db, 'ql_nguoi_dung', '39939'));
  console.log('Exists:', snap.exists());
  if (snap.exists()) {
    console.log('Data:', JSON.stringify(snap.data(), null, 2));
  }
}

dump().then(() => process.exit(0));
