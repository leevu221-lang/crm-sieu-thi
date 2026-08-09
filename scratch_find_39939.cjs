const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

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

async function find() {
  const q = query(collection(db, 'ql_nguoi_dung'), where('username', '==', '39939'));
  const snap = await getDocs(q);
  console.log('Total documents found:', snap.size);
  snap.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
  });
}

find().then(() => process.exit(0));
