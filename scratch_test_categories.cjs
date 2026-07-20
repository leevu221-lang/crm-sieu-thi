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

// Simple implementation of parseCategoryData and dependencies for testing
const normalize = (s) => {
  if (!s) return "";
  const basic = s.trim().normalize('NFC').replace(/[\s\-_]+/g, ' ').toLowerCase();
  return basic.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
};

const isMarketNameLike = (name) => {
  const norm = normalize(name);
  const prefixes = ['dml', 'dmm', 'dms', 'tgd', 'aar', 'bhx', 'dm3', 'ch'];
  const hasPrefix = prefixes.some(p => {
    if (p === 'ch') {
      return norm.startsWith('ch') && !norm.startsWith('cho');
    }
    return norm.startsWith(p);
  });
  const hasStoreKeywords = norm.startsWith('sieu thi') || norm.startsWith('cua hang') || norm.startsWith('dien may') || norm.startsWith('the gioi');
  const startsWithCode = /^\d+\s*[-–—]/.test(norm) || /^\d+\s+[a-z]/.test(norm);
  return hasPrefix || hasStoreKeywords || startsWithCode;
};

const parseCategoryData = (input, daysPassed, totalDays, markets, mode = 'REALTIME') => {
  const val = input.trim();
  if (!val) return [];
  const lines = val.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const results = [];
  let currentCatName = "";
  let currentCatType = 'ALL';
  let currentMarketName = markets.length > 0 ? markets[0].name : "7038";
  
  if (currentMarketName.match(/^\d+$/) && markets.length > 0) {
    const found = markets.find(m => m.name.toUpperCase().includes(currentMarketName));
    if (found) currentMarketName = found.name;
  }

  const sortedMarkets = [...markets].sort((a, b) => b.name.length - a.name.length).map(m => {
    const normName = normalize(m.name);
    const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
    const codeMatch = m.name.match(/^([^-]+)/);
    const code = codeMatch ? codeMatch[1].trim() : "";
    return { ...m, normName, nameWithoutPrefix, code };
  });
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(/\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
    if (cols.length === 0) continue;

    let firstCol = cols[0];
    firstCol = firstCol.replace(/^\d+[\.\t]\s*/, '').replace(/^\d+\s+(?!\d)/, '').trim();
    const normFirstCol = normalize(firstCol);

    if ((normFirstCol.includes("tong") && firstCol.toLowerCase().startsWith("tổng") && !normFirstCol.includes("sim tong")) || 
        normFirstCol.includes("ho tro bi lien he") || 
        normFirstCol.includes("copyright")) {
      continue;
    }

    const dataNumbers = [];
    for (let j = 1; j < cols.length; j++) {
      const col = cols[j];
      if (/^-?[\d,.]+(%?)$/.test(col)) {
        dataNumbers.push(col);
      }
    }

    const isHeaderLine = normFirstCol.includes('target') || normFirstCol.includes('tháng') || normFirstCol.includes('đự kiến') || normFirstCol.includes('rank') || normFirstCol.includes('dự kiến');
    const isDataLine = (dataNumbers.length >= 3 || (mode === 'LUYKE' && dataNumbers.length >= 2)) && 
                       !isHeaderLine && 
                       (firstCol.toLowerCase().startsWith('tổng') || isMarketNameLike(firstCol));

    if (isDataLine) {
      if (firstCol.toLowerCase().startsWith('tổng')) {
        continue;
      }
      
      const matchedMarket = sortedMarkets.find(m => {
        return normFirstCol.includes(m.normName) || 
               (m.nameWithoutPrefix.length > 3 && normFirstCol.includes(m.nameWithoutPrefix)) ||
               (m.code.length >= 3 && normFirstCol.includes(m.code));
      });
      if (matchedMarket) {
        currentMarketName = matchedMarket.name;
      } else {
        currentMarketName = firstCol;
      }
    }

    if (!isDataLine) {
      if (!firstCol.startsWith("Tổng")) {
        const catName = firstCol;
        const lowerCat = catName.toLowerCase();
        const isHeaderKeyword = [
          'dtlk', 'sllk', 'target', '% ht', 'du kien', 'dự kiến', 'xep hang', 'xếp hạng',
          'top/bottom', 'miền của tôi', 'mien cua toi', 'tháng', 'thang', 'realtime',
          'phòng ban', 'phong ban', 'nhân viên', 'nhan vien', 'stt', 'tỷ lệ', 'ty le',
          'đạt', 'dat'
        ].some(kw => lowerCat === kw || lowerCat.startsWith(kw + ' ') || lowerCat.includes('\t') || lowerCat.includes('  '));

        let catType = 'ALL';
        const fullLine = line.trim();
        if (fullLine.match(/SL Realtime|SL REALTIME|SLLK|\bSL\b|số lượng|so luong|quantity/i)) catType = 'SL';
        else if (fullLine.match(/DT Realtime|DT REALTIME|DTLK|\bDT\b|doanh thu|revenue/i)) catType = 'DT';
        else catType = currentCatType;

        const isMarket = sortedMarkets.some(m => {
          const normName = normalize(m.name);
          const nameWithoutPrefix = normalize(m.name.replace(/^(ĐML|ĐMM|ĐMS3|ĐMS|TGD|AAR)\s*-\s*/i, ''));
          if (normFirstCol.includes('bao hiem') || normFirstCol.includes('bh') || normFirstCol.startsWith('bh ') || normFirstCol.includes('sim tong')) {
            return false;
          }
          return normFirstCol.includes(normName) || normFirstCol.includes(nameWithoutPrefix);
        }) || isMarketNameLike(firstCol);
        
        if (!isMarket && catName.length > 0 && !isHeaderKeyword) {
          currentCatName = catName;
          currentCatType = catType;
        }
      }
      continue;
    }
    
    const cleanNum = (s) => s ? parseFloat(s.replace(/,/g, '')) : 0;
    let actual = 0;
    let target = 0;
    
    if (mode === 'LUYKE') {
      if (dataNumbers.length >= 2) {
        actual = cleanNum(dataNumbers[0]);
        target = cleanNum(dataNumbers[1]);
      }
    } else {
      if (dataNumbers.length >= 2) {
        target = cleanNum(dataNumbers[1]);
        actual = cleanNum(dataNumbers[0]);
      }
    }
    
    actual = Math.round(actual * 10) / 10;
    target = Math.round(target * 10) / 10;
    
    let rate = 0;
    if (target > 0) {
      rate = (actual / target) * 100;
      rate = Math.round(rate * 10) / 10;
    }
    
    let extractedName = currentCatName;
    if (extractedName) {
      const trimmedUpper = extractedName.trim().toUpperCase();
      if (trimmedUpper === 'DTLK' || trimmedUpper === 'SLLK') {
        extractedName = trimmedUpper;
      } else {
        if (/^(DTLK|SLLK)\b/i.test(extractedName)) {
          extractedName = extractedName.replace(/^(DTLK|SLLK)\s*[-_]*\s*/i, '').trim();
        }
        if (/\b(DTLK|SLLK)$/i.test(extractedName)) {
          extractedName = extractedName.replace(/\s*[-_]*\s*(DTLK|SLLK)$/i, '').trim();
        }
      }
      extractedName = extractedName.replace(/SL REALTIME|DT REALTIME/gi, '').trim();
      extractedName = extractedName.replace(/^[-_]+|[-_]+$/g, '').trim();
      
      if (extractedName && extractedName !== "Miền của tôi") {
        results.push({
          name: extractedName,
          target,
          actual,
          rate,
          marketName: currentMarketName,
          type: currentCatType,
          revenue: actual,
          group: 'ALL'
        });
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
  const markets = [
    {
      name: 'ĐML_CMA_CMA - 155A Nguyễn Tất Thành',
      targetQD: 211,
      actualVirtual: 117,
      percentHT: 55.29,
      installmentRate: 24.17,
      luotBillThuHo: 78
    }
  ];
  const parsed = parseCategoryData(data.rt_nh_cum, 0, 30, markets);
  console.log(`Parsed categories count: ${parsed.length}`);
  console.log("Sample parsed categories:", parsed.slice(0, 10));
}

test().catch(console.error);
