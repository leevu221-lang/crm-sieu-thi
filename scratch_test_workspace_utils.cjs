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

// Simple extraction of parseMarketData from src/pages/RTST/utils.ts to test it exactly
const utilsCode = fs.readFileSync('src/pages/RTST/utils.ts', 'utf8');

// Since it's TypeScript ESM, we can extract the function and run it with eval after minor conversions
const parseMarketDataFuncMatch = utilsCode.match(/export const parseMarketData = ([\s\S]+?)(?=\nexport const parseCategoryData)/);
if (!parseMarketDataFuncMatch) {
  console.error("Could not find parseMarketData in utils.ts");
  process.exit(1);
}

let parseMarketDataCode = "const parseMarketData = " + parseMarketDataFuncMatch[1].trim();

// Extract cleanNum, formatMarketName, normalize
const cleanNumMatch = utilsCode.match(/export const cleanNum = ([\s\S]+?)(?=\nexport const extractSection)/);
const formatMarketNameMatch = utilsCode.match(/export const formatMarketName = ([\s\S]+?)(?=\nexport const normalize)/);
const normalizeMatch = utilsCode.match(/export const normalize = ([\s\S]+?)(?=\n\/\/ Check if a store name is valid)/);

const cleanNumCode = "const cleanNum = " + cleanNumMatch[1].trim();
const formatMarketNameCode = "const formatMarketName = " + formatMarketNameMatch[1].trim();
const normalizeCode = "const normalize = " + normalizeMatch[1].trim();

const fullJSCode = `
${cleanNumCode}
${formatMarketNameCode}
${normalizeCode}
${parseMarketDataCode}

module.exports = { parseMarketData };
`;

// Write temporary file
fs.writeFileSync('scratch_temp_parser.cjs', fullJSCode);
const { parseMarketData } = require('./scratch_temp_parser.cjs');

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("Testing extracted parser from workspace utils.ts:");
  const results = parseMarketData(data.rt_bi_tong_quan, 0, 'RTST');
  console.log("Parsed count:", results.length);
  console.log("Parsed results:", JSON.stringify(results, null, 2));
}

test().then(() => {
  fs.unlinkSync('scratch_temp_parser.cjs');
}).catch(console.error);
