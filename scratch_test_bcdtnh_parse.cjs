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

const parseYcxRows = (data) => {
  if (!data) return [];
  let rows = [];
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) rows = parsed;
    else rows = data.split('\n').map(line => line.split('\t'));
  } catch (e) {
    rows = data.split('\n').map(line => line.split('\t'));
  }
  return rows.filter(r => r.length > 0 && r.some(c => String(c).trim() !== ''));
};

const getColumnIndices = (headers) => {
  const findIdx = (keywords, defaultIdx) => {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const exactIdx = lowerHeaders.findIndex(h => keywords.some(k => h === k));
    if (exactIdx !== -1) return exactIdx;
    
    const partialIdx = lowerHeaders.findIndex(h => keywords.some(k => h.includes(k)));
    if (partialIdx !== -1) return partialIdx;
    return defaultIdx;
  };
  
  const idxQty = findIdx(['số lượng', 'sl'], 35);
  const idxRevenue = findIdx(['doanh thu', 'thành tiền', 'phải thu', 'tổng tiền', 'giá trị', 'giá bán', 'dtqđ'], 37);
  const idxCategory = findIdx(['ngành hàng', 'nhóm ngành hàng', 'nhóm hàng'], 40);
  const idxProduct = findIdx(['tên sản phẩm', 'tên hàng', 'nhóm hàng'], 33);
  const idxStatus = findIdx(['trạng thái xuất', 'trạng thái'], 13);
  const idxTra = findIdx(['tình trạng nhập trả', 'trạng thái trả', 'trả hàng', 'nhập trả'], 44);

  return { idxQty, idxRevenue, idxCategory, idxProduct, idxStatus, idxTra };
};

const filterDataset = (rows, idxs) => {
  if (rows.length <= 1) return [];
  return rows.slice(1).filter(row => {
    const statusVal = String(row[idxs.idxStatus] || '').trim().toLowerCase();
    const traVal = String(row[idxs.idxTra] || '').trim().toLowerCase();
    return (statusVal === 'đã xuất' || !statusVal) && (traVal === 'chưa trả' || !traVal);
  });
};

const findHeaderRowIdx = (rows) => {
  return rows.findIndex(row => {
    if (!row || row.length < 2) return false;
    const rowStr = row.join(' ').toLowerCase();
    return rowStr.includes('số lượng') || rowStr.includes('sl') || rowStr.includes('doanh thu') || rowStr.includes('dt') || rowStr.includes('nhóm ngành hàng') || rowStr.includes('ngành hàng');
  });
};

async function test() {
  const docRef = doc(db, 'store', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const raw = data.bcdtnh_this_month_data;
  if (!raw) return;
  
  const rows = parseYcxRows(raw);
  const headerIdx = findHeaderRowIdx(rows);
  console.log("Found header index:", headerIdx);
  if (headerIdx !== -1) {
    const headers = rows[headerIdx].map(h => String(h || '').trim());
    console.log("Headers:", headers);
    const idxs = getColumnIndices(headers);
    console.log("Indices:", idxs);
    const filtered = filterDataset(rows.slice(headerIdx), idxs);
    console.log("Filtered rows count:", filtered.length);
    console.log("Sample 3 rows:");
    filtered.slice(0, 3).forEach(r => console.log(JSON.stringify(r)));
  }
}

test().catch(console.error);
