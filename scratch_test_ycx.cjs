const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
const fs = require('fs');
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

// Extract cleanNum, formatMarketName, normalize, parseYcxData, parseYcxRankData
const utilsCode = fs.readFileSync('src/pages/RTST/utils.ts', 'utf8');

const parseYcxDataMatch = utilsCode.match(/export const parseYcxData = ([\s\S]+?)(?=\nexport const parseYcxRankData)/);
if (!parseYcxDataMatch) {
  console.error("Could not find parseYcxData in utils.ts");
  process.exit(1);
}

// Convert typescript annotations in parseYcxData Match to javascript
let parseYcxDataCode = "const parseYcxData = " + parseYcxDataMatch[1].trim()
  .replace(/:\s*string/g, '')
  .replace(/:\s*number/g, '')
  .replace(/:\s*boolean/g, '')
  .replace(/:\s*any/g, '')
  .replace(/:\s*Record<[^>]+>/g, '')
  .replace(/as\s+any/g, '');

const CONVERSION_RATES = {
  normal: 1,
  installment: 1
};

// Add dependencies mock
const fullJSCode = `
const CONVERSION_RATES = ${JSON.stringify(CONVERSION_RATES)};
const normalize = (s) => s ? s.trim().normalize('NFC').replace(/[\\s\\-_]+/g, ' ').toLowerCase() : '';
const cleanNum = (s) => s ? parseFloat(s.replace(/,/g, '')) : 0;
const getRowConversionRate = (colAO, rowStr, isInstallment, rates) => ({ rate: 1, matchedCat: 'Other' });
${parseYcxDataCode}

module.exports = { parseYcxData };
`;

fs.writeFileSync('scratch_temp_ycx.cjs', fullJSCode);
const { parseYcxData } = require('./scratch_temp_ycx.cjs');

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("Testing parseYcxData:");
  const rates = {
    'ICT': { normal: 1, installment: 1 }
  };
  const staffData = parseYcxData(data.ycx_data, rates);
  console.log("Parsed staff count:", staffData.length);
  console.log("Success! Parsed without errors.");
}

test().then(() => {
  fs.unlinkSync('scratch_temp_ycx.cjs');
}).catch(err => {
  console.error(err);
  fs.unlinkSync('scratch_temp_ycx.cjs');
});
