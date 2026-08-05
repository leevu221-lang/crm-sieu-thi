import React, { useState, useEffect } from 'react';
import { ShoppingBag, RefreshCw, CheckCircle2 } from 'lucide-react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useNotification } from '../../../contexts/NotificationContext';

interface BanGiaSocTabProps {
  rawYcxRows: any[][];
}

interface ParsedItem {
  id: string; // Mã SP hoặc IMEI
  name: string;
  shockPrice: string;
  salePrice: string;
  isSold: boolean;
}

export const BanGiaSocTab: React.FC<BanGiaSocTabProps> = ({ rawYcxRows }) => {
  const [shockPriceInput, setShockPriceInput] = useState('');
  const [pmhInput, setPmhInput] = useState('');
  const [parsedData, setParsedData] = useState<ParsedItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
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

  const handleSync = () => {
    setIsSyncing(true);

    // Save to Firebase
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
    setTimeout(() => {
      // 1. Lấy danh sách các mã sản phẩm / IMEI đã bán từ DỮ LIỆU NGUỒN
      const soldIdentifiers = new Map<string, number>();
      if (rawYcxRows && rawYcxRows.length > 1) {
        const headers = rawYcxRows[0].map(h => String(h || '').trim().toLowerCase());
        const idIndex = headers.findIndex(h => h.includes('mã sản phẩm') || h.includes('mã sp'));
        const imeiIndex = headers.findIndex(h => h.includes('imei'));
        const qtyIndex = headers.findIndex(h => ['số lượng xuất', 'số lượng bán', 'số lượng xuất bán', 'số lượng', 'sl xuất', 'sl bán'].includes(h));
        
        for (let i = 1; i < rawYcxRows.length; i++) {
          const row = rawYcxRows[i];
          const qtyStr = qtyIndex !== -1 ? String(row[qtyIndex] || '1').trim() : '1';
          const qty = parseInt(qtyStr) || 1;
          
          if (idIndex !== -1 && row[idIndex]) {
            const id = String(row[idIndex]).trim();
            soldIdentifiers.set(id, (soldIdentifiers.get(id) || 0) + qty);
          }
          if (imeiIndex !== -1 && row[imeiIndex]) {
            const imei = String(row[imeiIndex]).trim();
            soldIdentifiers.set(imei, (soldIdentifiers.get(imei) || 0) + 1); // Each IMEI string is 1 item
          }
        }
      }

      // 2. Parse dữ liệu Giá Sốc từ input (Handling Excel quotes and newlines)
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
          if (currentRow.some(c => c)) rows.push(currentRow); // Only push non-empty rows
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
          // Typically: Program Name | Mã SP | Tên SP
          // E.g. cols[0] = "Bếp ga giá sốc 490,000đ\n2 suất"
          // cols[1] = "4844146000116"
          // cols[2] = "Bếp gas đôi Sunhouse..."
          
          let id = '';
          let name = '';
          let shockPrice = '';
          let salePrice = '';
          
          if (cols.length >= 3) {
            shockPrice = cols[0].replace(/\n/g, ' ');
            id = cols[1];
            name = cols[2];
          } else if (cols.length === 2) {
            // Fallback if they only pasted 2 columns
            id = cols[0];
            name = cols[1];
          } else {
            id = cols[0];
          }
          
          // Extract salePrice from shockPrice if not explicitly provided
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
            
            if (id) {
              const currentSoldQty = soldIdentifiers.get(id) || 0;
              if (currentSoldQty > 0) {
                isSold = true;
                soldIdentifiers.set(id, currentSoldQty - 1); // Decrement available sold qty
              }
              
              newParsedData.push({
                id,
                name,
                shockPrice: rowCount > 1 ? `${shockPrice} (Suất ${k + 1}/${rowCount})` : shockPrice,
                salePrice,
                isSold
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
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h4 className="text-[14px] font-black uppercase tracking-wider text-slate-800">CẤU HÌNH BÁN GIÁ SỐC</h4>
            <p className="text-[11px] text-slate-500">Dán danh sách Giá Sốc và PMH từ Excel để đối chiếu (Mã SP/IMEI | Tên SP | Giá Sốc | Giá Bán)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nhập Danh sách Giá Sốc */}
          <div className="space-y-3">
            <label className="text-[12px] font-bold text-slate-700 uppercase">Danh Sách Giá Sốc</label>
            <textarea
              className="w-full h-40 p-3 border border-slate-200 rounded-xl text-[12px] font-sans focus:ring-2 focus:ring-rose-500 outline-none resize-none"
              placeholder="Copy và Paste từ Excel vào đây (Mã SP, Tên SP, Giá Sốc, Giá Bán...)"
              value={shockPriceInput}
              onChange={(e) => setShockPriceInput(e.target.value)}
            />
          </div>

          {/* Nhập Danh sách PMH */}
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
            onClick={handleSync}
            disabled={isSyncing || (!shockPriceInput && !pmhInput)}
            className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-[12px] font-black uppercase tracking-wider hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Đang Đồng Bộ...' : 'Đồng Bộ Dữ Liệu'}
          </button>
        </div>
      </div>

      {parsedData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h4 className="text-[13px] font-black uppercase text-slate-800">KẾT QUẢ ĐỐI CHIẾU</h4>
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
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase">
                          <CheckCircle2 size={12} /> Đã Bán
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
