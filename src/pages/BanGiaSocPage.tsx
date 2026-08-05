import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

interface ParsedItem {
  id: string;
  name: string;
  shockPrice: string;
  salePrice: string;
  isSold: boolean;
  actualStatus: string;
}

const removeAccents = (str: string) => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
};

const cleanId = (str: string) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

export const BanGiaSocPage: React.FC = () => {
  const { userProfile } = useAuth();
  const selectedMaKho = userProfile?.ma_kho || '';
  const { ycxDataMoi, loadData } = useRealtimeData(selectedMaKho);

  const rawYcxRows = useMemo(() => {
    if (!ycxDataMoi) return [];
    return ycxDataMoi.split('\n').filter(line => line.trim()).map(line => line.split('\t'));
  }, [ycxDataMoi]);

  const [shockPriceInput, setShockPriceInput] = useState('');
  const [pmhInput, setPmhInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showNotification } = useNotification();
  const hasAutoSynced = useRef(false);

  useEffect(() => {
    loadData();
    const docRef = doc(db, 'global_configs', 'ban_gia_soc');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.shockPriceInput !== undefined) setShockPriceInput(data.shockPriceInput);
        if (data.pmhInput !== undefined) setPmhInput(data.pmhInput);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (shockPriceInput && rawYcxRows.length > 0 && !hasAutoSynced.current) {
      handleSync(true);
      hasAutoSynced.current = true;
    }
  }, [shockPriceInput, rawYcxRows]);

  const handleSync = (isAuto = false) => {
    setIsSyncing(true);

    if (!isAuto) {
      const docRef = doc(db, 'global_configs', 'ban_gia_soc');
      setDoc(docRef, {
        shockPriceInput,
        pmhInput,
        updatedAt: serverTimestamp()
      }, { merge: true }).then(() => {
        showNotification('Đã lưu cấu hình Bán Giá Sốc thành công.', 'success');
      }).catch(err => {
        console.error('Lỗi lưu cấu hình Bán Giá Sốc:', err);
        showNotification('Lỗi khi lưu cấu hình.', 'error');
      });
    }

    setTimeout(() => {
      const soldIdentifiers = new Map<string, { qty: number, statuses: string[] }>();
      if (rawYcxRows && rawYcxRows.length > 1) {
        const headers = rawYcxRows[0].map(h => removeAccents(String(h || '')).toLowerCase().trim());
        const idIndex = headers.findIndex(h => h.includes('ma san pham') || h.includes('ma hang') || h === 'ma sp');
        const imeiIndex = headers.findIndex(h => h.includes('imei'));
        const qtyIndex = headers.findIndex(h => ['so luong xuat', 'so luong ban', 'so luong xuat ban', 'so luong', 'sl xuat', 'sl ban'].includes(h));
        const statusIndex = headers.findIndex(h => h.includes('trang thai xuat') || h.includes('trang thai ycx') || h.includes('tinh trang xuat') || h === 'trang thai');
        
        for (let i = 1; i < rawYcxRows.length; i++) {
          const row = rawYcxRows[i];
          const qtyStr = qtyIndex !== -1 ? String(row[qtyIndex] || '1').trim() : '1';
          const qty = parseInt(qtyStr) || 1;
          const statusVal = statusIndex !== -1 ? String(row[statusIndex]).trim() : '';
          
          if (idIndex !== -1 && row[idIndex]) {
            const id = cleanId(row[idIndex]);
            if (!soldIdentifiers.has(id)) soldIdentifiers.set(id, { qty: 0, statuses: [] });
            const obj = soldIdentifiers.get(id)!;
            obj.qty += qty;
            for(let q=0; q<qty; q++) obj.statuses.push(statusVal);
          }
          if (imeiIndex !== -1 && row[imeiIndex]) {
            const imei = cleanId(row[imeiIndex]);
            if (!soldIdentifiers.has(imei)) soldIdentifiers.set(imei, { qty: 0, statuses: [] });
            const obj = soldIdentifiers.get(imei)!;
            obj.qty += 1;
            obj.statuses.push(statusVal);
          }
        }
      }

      const rows: string[][] = [];
      let currentRow: string[] = [];
      let currentCell = '';
      let insideQuotes = false;

      for (let i = 0; i < shockPriceInput.length; i++) {
        const char = shockPriceInput[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === '\t' && !insideQuotes) {
          currentRow.push(currentCell.trim());
          currentCell = '';
        } else if (char === '\n' && !insideQuotes) {
          currentRow.push(currentCell.trim());
          if (currentRow.some(c => c)) rows.push(currentRow);
          currentRow = [];
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      if (currentCell) currentRow.push(currentCell.trim());
      if (currentRow.length > 0 && currentRow.some(c => c)) rows.push(currentRow);

      const newParsedData: ParsedItem[] = [];

      rows.forEach(cols => {
        if (cols.length > 0) {
          let id = '';
          let name = '';
          let shockPrice = '';
          let salePrice = '';
          
          if (cols.length >= 3) {
            shockPrice = cols[0].replace(/\n/g, ' ');
            id = cols[1].trim();
            name = cols[2];
          } else if (cols.length === 2) {
            id = cols[0].trim();
            name = cols[1];
          } else {
            id = cols[0].trim();
          }
          
          if (shockPrice && !salePrice) {
            const priceMatch = shockPrice.match(/(\d{1,3}(?:[.,]\d{3})*)\s*[đdĐD]/);
            if (priceMatch) {
              salePrice = priceMatch[1].replace(/,/g, '.') + 'đ';
            }
          }
          
          let rowCount = 1;
          const suatMatch = shockPrice.match(/(\d+)\s*suất/i);
          if (suatMatch) {
            rowCount = parseInt(suatMatch[1], 10) || 1;
          }
          
          for (let k = 0; k < rowCount; k++) {
            let isSold = false;
            let actualStatus = '';
            
            if (id) {
              const cleanedInputId = cleanId(id);
              const soldObj = soldIdentifiers.get(cleanedInputId);
              if (soldObj && soldObj.qty > 0) {
                soldObj.qty -= 1;
                actualStatus = soldObj.statuses.shift() || '';
                if (!actualStatus || removeAccents(actualStatus).toLowerCase().includes('da xuat')) {
                  isSold = true;
                }
              }
              
              newParsedData.push({
                id,
                name,
                shockPrice: rowCount > 1 ? `${shockPrice} (Suất ${k + 1}/${rowCount})` : shockPrice,
                salePrice,
                isSold,
                actualStatus
              });
            }
          }
        }
      });

      setParsedData(newParsedData);
      setIsSyncing(false);
    }, 500);
  };

  const soldCount = parsedData.filter(item => item.isSold).length;
  const totalCount = parsedData.length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">CẤU HÌNH BÁN GIÁ SỐC</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Dán danh sách Giá Sốc và PMH từ Excel để đối chiếu (Mã SP/IMEI | Tên SP | Giá Sốc | Giá Bán)</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[12px] font-bold text-slate-700 uppercase">Danh Sách Giá Sốc</label>
            <textarea
              className="w-full h-40 p-3 border border-slate-200 rounded-xl text-[12px] font-sans focus:ring-2 focus:ring-rose-500 outline-none resize-none"
              placeholder="Copy và Paste từ Excel vào đây (Mã SP, Tên SP, Giá Sốc, Giá Bán...)"
              value={shockPriceInput}
              onChange={(e) => setShockPriceInput(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <label className="text-[12px] font-bold text-slate-700 uppercase">Danh Sách PMH</label>
            <textarea
              className="w-full h-40 p-3 border border-slate-200 rounded-xl text-[12px] font-sans focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              placeholder="Copy và Paste danh sách PMH từ Excel vào đây..."
              value={pmhInput}
              onChange={(e) => setPmhInput(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => handleSync(false)}
            disabled={isSyncing || (!shockPriceInput && !pmhInput)}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Đang Đồng Bộ...' : 'Đồng Bộ Dữ Liệu'}
          </button>
        </div>
      </motion.div>

      {parsedData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="text-[13px] font-black uppercase text-slate-800 flex items-center gap-2">
              <ShoppingBag size={16} className="text-rose-500" />
              KẾT QUẢ ĐỐI CHIẾU
            </h4>
            <div className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
              Đã bán: <span className="text-emerald-600">{soldCount}</span> / {totalCount}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] text-slate-500 uppercase tracking-widest">
                  <th className="p-3 border-b border-slate-200">Mã SP / IMEI</th>
                  <th className="p-3 border-b border-slate-200">Sản Phẩm</th>
                  <th className="p-3 border-b border-slate-200">Giá Sốc</th>
                  <th className="p-3 border-b border-slate-200">Giá Bán</th>
                  <th className="p-3 border-b border-slate-200 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody>
                {parsedData.map((item, idx) => (
                  <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.isSold ? 'bg-emerald-50/30' : ''}`}>
                    <td className="p-3 text-[12px] font-bold text-slate-700">{item.id}</td>
                    <td className="p-3 text-[12px] text-slate-600 max-w-xs truncate">{item.name}</td>
                    <td className="p-3 text-[12px] font-bold text-rose-600">{item.shockPrice}</td>
                    <td className="p-3 text-[12px] font-bold text-slate-700">{item.salePrice}</td>
                    <td className="p-3 text-center">
                      {item.isSold ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border border-emerald-200">
                          <CheckCircle2 size={12} /> Đã Bán
                        </div>
                      ) : item.actualStatus ? (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-orange-200">
                          {item.actualStatus}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};
