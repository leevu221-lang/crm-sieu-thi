const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = require('firebase/firestore');

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

async function runTest() {
  const username = '39939';
  const maKho = '1841';

  console.log('1. Checking user existence...');
  const userSnap = await getDoc(doc(db, 'ql_nguoi_dung', username));
  console.log('User snap exists:', userSnap.exists());

  console.log('2. Checking warehouse existence...');
  const warehouseSnap = await getDoc(doc(db, 'warehouses', maKho));
  console.log('Warehouse exists:', warehouseSnap.exists());

  if (!warehouseSnap.exists()) {
    console.log('3. Creating warehouse...');
    await setDoc(doc(db, 'warehouses', maKho), {
      ma_kho: maKho,
      ten_kho: `Siêu thị ${maKho}`,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
    console.log('Warehouse created.');
  }

  console.log('4. Creating user...');
  const trialDays = 7;
  const trialExpiredAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
  await setDoc(doc(db, 'ql_nguoi_dung', username), {
    username,
    storeCode: maKho,
    password: username,
    status: 'active',
    paymentConfirmed: true,
    packageDays: trialDays,
    expiredAt: trialExpiredAt,
    isDemo: false,
    declarationCompleted: false,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  console.log('User created.');

  console.log('5. Creating permissions...');
  await setDoc(doc(db, 'user_permissions', username), {
    user_id: username,
    allowed_pages: ['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'birthday', 'bangiasoc', 'tnb_data'],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
  console.log('Permissions created successfully!');
}

runTest().then(() => {
  console.log('SUCCESS');
  process.exit(0);
}).catch(err => {
  console.error('FAILED:', err);
  process.exit(1);
});
