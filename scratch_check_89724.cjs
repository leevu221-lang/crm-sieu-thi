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

async function checkPlanner() {
  const snap = await getDoc(doc(db, 'system_configs', 'roadshow_planner_1841'));
  if (snap.exists()) {
    const data = snap.data();
    console.log('Master Staff Length:', data.masterStaff?.length);
    const shifts = data.shifts || {};
    const dateShifts = shifts['2026-08-10'] || {};
    console.log('Shifts for 2026-08-10:');
    console.log(JSON.stringify(dateShifts, null, 2));
  } else {
    console.log('Document not found!');
  }
}

checkPlanner().then(() => process.exit(0));
