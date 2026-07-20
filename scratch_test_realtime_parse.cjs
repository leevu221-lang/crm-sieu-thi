const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');
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

const prefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR", "TỔNG"];

const cleanNum = (s) => {
  if (s === null || s === undefined) return 0;
  if (typeof s === 'number') return s;
  let clean = s.replace(/[^\d,.-]/g, '');
  const lastDot = clean.lastIndexOf('.');
  const lastComma = clean.lastIndexOf(',');
  if (lastComma > lastDot) {
    clean = clean.replace(/\./g, '').replace(/,/g, '.');
  } else {
    clean = clean.replace(/,/g, '');
  }
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
};

const formatMarketName = (name) => {
  if (!name) return "";
  return name.trim().normalize('NFC');
};

const parseMarketData = (input, adjustment, pageType) => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n');
  const results = [];

  let marketName = "";
  let targetST = 0;
  let actualReal = 0;
  let actualVirtual = 0;
  let percentHT = 0;
  let percentQD = 0;
  let dtHomQua = 0;
  let isExplicitTarget = false;
  let nameColIdx = -1;
  let cleanLine = "";

  const normalizedVal = val.toLowerCase();
  const hasBiHeader = normalizedVal.includes("bi tổng quan") || normalizedVal.includes("1. bi tổng quan");
  const hasBcHeader = val.includes("BC TỔNG HỢP CỤM") || normalizedVal.includes("bc tổng hợp cụm");
  
  const isBcTongHopCum = hasBcHeader || pageType === 'LUYKE' || pageType === 'RTST' || normalizedVal.includes("tên siêu thị") || normalizedVal.includes("ngành hàng") || normalizedVal.includes("tổng");

  for (const line of lines) {
    cleanLine = line.trim();
    if (!cleanLine) continue;

    const lowerLine = cleanLine.toLowerCase();

    if (lowerLine.includes("hỗ trợ bi liên hệ user") || 
        lowerLine.includes("copyright © bi report") ||
        lowerLine?.startsWith("tên miền")) {
      continue;
    }
    
    const cols = cleanLine.split(/\t|\||\s{2,}/).map(c => c.trim());
    while (cols.length > 0 && cols[cols.length - 1] === "") {
      cols.pop();
    }

    console.log("Line:", JSON.stringify(cleanLine), "Cols length:", cols.length, "Cols:", cols);

    if (cols.length < 2) continue;

    marketName = "";
    nameColIdx = -1;

    if (isBcTongHopCum) {
      let foundIdx = -1;
      for (let i = 0; i <= 2; i++) {
        if (cols[i] && prefixes.some(p => cols[i].trim().toUpperCase().includes(p))) {
          foundIdx = i;
          break;
        }
      }
      
      if (foundIdx === -1) {
        if (cols[0] && isNaN(Number(cols[0].replace(/,/g, ''))) && cols[0].length > 3) {
          foundIdx = 0;
        } else if (cols[1] && isNaN(Number(cols[1].replace(/,/g, ''))) && cols[1].length > 3) {
          foundIdx = 1;
        } else if (cols[2] && isNaN(Number(cols[2].replace(/,/g, ''))) && cols[2].length > 3) {
          foundIdx = 2;
        }
      }

      if (foundIdx !== -1) {
        nameColIdx = foundIdx;
        marketName = formatMarketName(cols[nameColIdx].trim());
      } else {
        continue;
      }
    }

    if (marketName) {
      if (pageType === 'RTST') {
        const actualVirtual = cleanNum(cols[2]);
        const targetQDVal = cleanNum(cols[3]);
        const percentHTVal = cleanNum(cols[4]);
        const luotBillBanHangVal = cols.length > 9 ? cleanNum(cols[9]) : 0;
        const luotBillThuHoVal = cols.length > 10 ? cleanNum(cols[10]) : 0;
        const installmentRateVal = cols.length > 12 ? cleanNum(cols[12]) : 0;
        
        console.log("-> Parsed market:", marketName, "actualVirtual:", actualVirtual, "targetQDVal:", targetQDVal);

        if (!results.some(m => m.name === marketName)) {
          results.push({ 
            name: marketName, 
            targetST: 0, 
            targetQD: targetQDVal,
            actualReal: cleanNum(cols[1]),
            actualVirtual,
            dtHomQua: 0,
            percentHT: percentHTVal,
            percentQD: 0,
            installmentRate: installmentRateVal,
            luotBillBanHang: luotBillBanHangVal,
            luotBillThuHo: luotBillThuHoVal,
            dtckThang: 0,
            luotBill: 0,
            isExplicitTarget: true,
            isSummary: marketName === 'TỔNG'
          });
        }
        continue;
      }
    }
  }
  return results;
};

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    console.log("No store doc");
    return;
  }
  const data = snap.data();
  console.log("rt_bi_tong_quan length:", data.rt_bi_tong_quan ? data.rt_bi_tong_quan.length : 'none');
  
  if (data.rt_bi_tong_quan) {
    const realtimeMarkets = parseMarketData(data.rt_bi_tong_quan, 0, 'RTST');
    console.log("Parsed RTST markets count:", realtimeMarkets.length);
    console.log("Sample:", realtimeMarkets);
  }
}

test().catch(console.error);
