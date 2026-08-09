const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } = require('firebase/firestore');

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

async function upsert(tableName, item, onConflict) {
  let id = item.id;
  if (!id && onConflict) {
    const conflictFields = onConflict.split(',').map(f => f.trim());
    let q = query(collection(db, tableName));
    conflictFields.forEach(field => {
      if (item[field] !== undefined) q = query(q, where(field, '==', item[field]));
    });
    let snap = await getDocs(q);
    if (!snap.empty) id = snap.docs[0].id;
  }
  
  const docRef = id ? doc(db, tableName, String(id)) : doc(collection(db, tableName));
  await setDoc(docRef, {
    ...item,
    updated_at: serverTimestamp()
  }, { merge: true });
}

async function testMerge() {
  const docRef = doc(db, 'ql_nguoi_dung', 'test_merge');

  console.log('1. Setting initial document with setDoc (name=John, age=30, status=active)...');
  await setDoc(docRef, {
    username: 'test_merge',
    name: 'John',
    age: 30,
    status: 'active'
  });

  console.log('2. Call upsert via adapter (age=35, last_active=now, no status/name)...');
  await upsert('ql_nguoi_dung', {
    username: 'test_merge',
    age: 35,
    last_active: 'now'
  }, 'username');

  console.log('3. Fetching document to verify fields...');
  const snap = await getDoc(docRef);
  console.log('Data:', JSON.stringify(snap.data(), null, 2));
}

testMerge().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
