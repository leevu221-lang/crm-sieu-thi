import React, { useState } from 'react';
import { X, ArrowUp, ArrowDown, RotateCcw, Check, Sparkles, GripVertical, Eye, EyeOff } from 'lucide-react';

export interface CeBrandDef {
  key: string;
  label: string;
  field: string;
}

export const DEFAULT_CE_BRANDS: CeBrandDef[] = [
  { key: 'cePana', label: 'PANASONIC', field: 'cePanaQty' },
  { key: 'ceAqua', label: 'AQUA', field: 'ceAquaQty' },
  { key: 'ceHaier', label: 'HAIER', field: 'ceHaierQty' },
  { key: 'ceSunhouse', label: 'SUNHOUSE', field: 'ceSunhouseQty' },
  { key: 'ceToshiba', label: 'TOSHIBA', field: 'ceToshibaQty' },
  { key: 'ceDaikin', label: 'DAIKIN', field: 'ceDaikinQty' },
  { key: 'ceComfee', label: 'COMFEE', field: 'ceComfeeQty' },
  { key: 'ceNagakawa', label: 'NAGAKAWA', field: 'ceNagakawaQty' },
  { key: 'ceSamsung', label: 'SAMSUNG', field: 'ceSamsungQty' },
  { key: 'ceCasper', label: 'CASPER', field: 'ceCasperQty' },
  { key: 'ceLg', label: 'LG', field: 'ceLgQty' },
  { key: 'ceSharp', label: 'SHARP', field: 'ceSharpQty' },
  { key: 'ceTcl', label: 'TCL', field: 'ceTclQty' },
  { key: 'ceSony', label: 'SONY', field: 'ceSonyQty' },
  { key: 'ceElectrolux', label: 'ELECTROLUX', field: 'ceElectroluxQty' },
  { key: 'ceBeko', label: 'BEKO', field: 'ceBekoQty' },
  { key: 'ceSanaky', label: 'SANAKY', field: 'ceSanakyQty' },
  { key: 'ceFuniki', label: 'FUNIKI', field: 'ceFunikiQty' },
  { key: 'ceMidea', label: 'MIDEA', field: 'ceMideaQty' },
  { key: 'ceGree', label: 'GREE', field: 'ceGreeQty' },
  { key: 'ceHisense', label: 'HISENSE', field: 'ceHisenseQty' },
  { key: 'ceFerroli', label: 'FERROLI', field: 'ceFerroliQty' },
  { key: 'ceKhac', label: 'KHÁC', field: 'ceKhacQty' }
];

interface CeBrandOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStore: string;
  ceBrandOrder: string[];
  onSaveOrder: (newOrder: string[]) => void;
  showKhaiThacCols: Record<string, boolean>;
  onToggleCol: (key: string, val: boolean) => void;
}

export const CeBrandOrderModal: React.FC<CeBrandOrderModalProps> = ({
  isOpen,
  onClose,
  activeStore,
  ceBrandOrder,
  onSaveOrder,
  showKhaiThacCols,
  onToggleCol
}) => {
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Build brand list according to ceBrandOrder
  const brandMap = new Map(DEFAULT_CE_BRANDS.map(b => [b.key, b]));
  const orderedList: CeBrandDef[] = [];
  ceBrandOrder.forEach(k => {
    const b = brandMap.get(k);
    if (b) orderedList.push(b);
  });
  DEFAULT_CE_BRANDS.forEach(b => {
    if (!orderedList.some(item => item.key === b.key)) {
      orderedList.push(b);
    }
  });

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= orderedList.length || fromIdx === toIdx) return;
    const newItems = [...orderedList];
    const [moved] = newItems.splice(fromIdx, 1);
    newItems.splice(toIdx, 0, moved);
    onSaveOrder(newItems.map(item => item.key));
  };

  const moveUp = (idx: number) => moveItem(idx, idx - 1);
  const moveDown = (idx: number) => moveItem(idx, idx + 1);
  const moveToTop = (idx: number) => moveItem(idx, 0);

  const handleReset = () => {
    const defaultOrder = DEFAULT_CE_BRANDS.map(b => b.key);
    onSaveOrder(defaultOrder);
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.setData('text/plain', key);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedKey(key);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverKey !== key) {
      setDragOverKey(key);
    }
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData('text/plain') || draggedKey;
    setDraggedKey(null);
    setDragOverKey(null);
    if (!sourceKey || sourceKey === targetKey) return;

    const fromIdx = orderedList.findIndex(b => b.key === sourceKey);
    const toIdx = orderedList.findIndex(b => b.key === targetKey);
    if (fromIdx !== -1 && toIdx !== -1) {
      moveItem(fromIdx, toIdx);
    }
  };

  const filteredList = orderedList.filter(b => 
    b.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-[#0284c7] flex items-center justify-center font-black">
              ❄️
            </div>
            <div>
              <h3 className="text-[15px] sm:text-[16px] font-black text-slate-800 uppercase tracking-tight">
                SẮP XẾP VỊ TRÍ CỘT HÃNG CE
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span>Siêu thị:</span>
                <span className="font-bold text-[#0284c7] bg-sky-100/70 px-2 py-0.5 rounded-md">
                  {activeStore || 'Mặc định'}
                </span>
                <span className="text-emerald-600 font-medium hidden sm:inline flex items-center gap-0.5">
                  <Check size={11} className="inline" /> Auto lưu
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tip & Search */}
        <div className="px-5 pt-3 pb-2 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <p className="text-[11px] text-slate-500 italic">
            Kéo thả hoặc nhấn <span className="font-bold text-slate-700">▲/▼</span> để đổi thứ tự cột trong bảng (từ trái qua phải).
          </p>
          {orderedList.length > 8 && (
            <input
              type="text"
              placeholder="Tìm nhanh hãng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-[11.5px] px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:border-sky-400 bg-white"
            />
          )}
        </div>

        {/* List of Brands */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 divide-y-0 no-scrollbar">
          {filteredList.map((brand) => {
            const actualIdx = orderedList.findIndex(item => item.key === brand.key);
            const isVisible = showKhaiThacCols[brand.key] !== false;
            const isBeingDragged = draggedKey === brand.key;
            const isTarget = dragOverKey === brand.key;

            return (
              <div
                key={brand.key}
                draggable
                onDragStart={(e) => handleDragStart(e, brand.key)}
                onDragOver={(e) => handleDragOver(e, brand.key)}
                onDrop={(e) => handleDrop(e, brand.key)}
                onDragEnd={() => { setDraggedKey(null); setDragOverKey(null); }}
                className={`flex items-center justify-between p-2 sm:px-3 rounded-xl border transition-all ${
                  isBeingDragged 
                    ? 'opacity-40 bg-sky-50 border-sky-300' 
                    : isTarget 
                      ? 'bg-sky-100 border-sky-400 shadow-md scale-[1.01]' 
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-xs'
                }`}
              >
                {/* Drag Handle & Info */}
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  <span className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-0.5">
                    <GripVertical size={16} />
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10.5px] font-black flex items-center justify-center shrink-0">
                    {actualIdx + 1}
                  </span>
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[12.5px] sm:text-[13px] font-black text-slate-800 tracking-tight">
                      {brand.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleCol(brand.key, !isVisible)}
                      className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                        isVisible 
                          ? 'bg-sky-50 text-[#0284c7] hover:bg-sky-100' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={isVisible ? 'Đang hiển thị trong bảng (Nhấn để ẩn)' : 'Đang ẩn trong bảng (Nhấn để hiện)'}
                    >
                      {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                      <span>{isVisible ? 'Hiện' : 'Ẩn'}</span>
                    </button>
                  </div>
                </div>

                {/* Move Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveToTop(actualIdx)}
                    disabled={actualIdx === 0}
                    className="px-1.5 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-50 rounded disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Đưa lên đầu bảng"
                  >
                    Top
                  </button>
                  <button
                    onClick={() => moveUp(actualIdx)}
                    disabled={actualIdx === 0}
                    className="p-1 rounded text-slate-500 hover:text-[#0284c7] hover:bg-sky-50 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Dịch sang trái (lên trên)"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => moveDown(actualIdx)}
                    disabled={actualIdx === orderedList.length - 1}
                    className="p-1 rounded text-slate-500 hover:text-[#0284c7] hover:bg-sky-50 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                    title="Dịch sang phải (xuống dưới)"
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Khôi phục thứ tự các hãng ban đầu"
          >
            <RotateCcw size={12} />
            <span>Mặc định</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-[12px] font-black transition-all shadow-sm flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Hoàn tất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
