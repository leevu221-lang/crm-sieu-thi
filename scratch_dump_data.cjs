const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config();

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

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function decodeGZ(str) {
  try {
    const binary = atob(str.slice(3));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    return await response.text();
  } catch (e) {
    return str;
  }
}

async function run() {
  const querySnapshot = await getDocs(collection(db, 'store'));
  console.log(`Scanning ${querySnapshot.size} stores for Thach Vu...`);
  
  for (const doc of querySnapshot.docs) {
    const data = doc.data();
    
    for (const field of ['rt_bi_tong_quan', 'rt_nh_cum']) {
      if (data[field]) {
        const str = await decodeGZ(data[field]);
        const norm = removeAccents(str).toLowerCase();
        if (norm.includes('thach vu')) {
          console.log(`FOUND in store: ${doc.id} (field: ${field})`);
          
          // Dump the row
          const rows = str.split('\n').map(row => row.split('\t'));
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let hasName = false;
            for (let j = 0; j < row.length; j++) {
              const val = removeAccents(String(row[j] || '').toLowerCase());
              if (val.includes('thach vu')) {
                hasName = true;
                break;
              }
            }
            if (hasName) {
              console.log(`\nRow ${i}:`, row);
            }
          }
        }
      }
    }
  }
  process.exit(0);
}

run().catch(console.error);
