import React, { useState } from 'react';
import { X } from 'lucide-react';

interface PrintLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (style: string, layout: string, showPromoLabel: boolean) => void;
}

export default function PrintLayoutModal({ isOpen, onClose, onConfirm }: PrintLayoutModalProps) {
  const [selectedStyle, setSelectedStyle] = useState('classic');
  const [selectedLayout, setSelectedLayout] = useState('4');
  const [showPromoLabel, setShowPromoLabel] = useState(true);

  if (!isOpen) return null;

  const layouts = [
    { id: '1', title: '1 Sticker / Trang', desc: 'CE, QĐH, Quạt lớn, MLN' },
    { id: '2', title: '2 Sticker / Trang', desc: 'Bộ lau nhà, Bếp đôi, Lò vi sóng, Lò nướng' },
    { id: '4', title: '4 Sticker / Trang', desc: 'Nồi cơm, Nồi chiên, Bếp đơn, Nồi, Quạt nhỏ' },
    { id: '8', title: '8 Sticker / Trang', desc: 'Máy sấy tóc, bàn ủi, bình đun, Máy xay sinh tố, vợt muỗi, thớt' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">Chọn Kiểu & Bố Cục In</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Style Selection */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">1. CHỌN KIỂU STICKER</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === 'classic' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input 
                  type="radio" 
                  name="stickerStyle" 
                  value="classic" 
                  checked={selectedStyle === 'classic'} 
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="ml-3 font-medium text-slate-800">Kiểu có sẵn</span>
              </label>
              <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === 'modern' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input 
                  type="radio" 
                  name="stickerStyle" 
                  value="modern" 
                  checked={selectedStyle === 'modern'} 
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="ml-3 font-medium text-slate-800">Kiểu giá quạt</span>
              </label>
              <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === 'display' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input 
                  type="radio" 
                  name="stickerStyle" 
                  value="display" 
                  checked={selectedStyle === 'display'} 
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="ml-3 font-medium text-slate-800">Kiểu hàng trưng bày</span>
              </label>
              <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === 'giovang' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input 
                  type="radio" 
                  name="stickerStyle" 
                  value="giovang" 
                  checked={selectedStyle === 'giovang'} 
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="ml-3 font-medium text-slate-800 text-red-600 font-black">GIỜ VÀNG GIÁ SỐC (A5)</span>
              </label>
              <label className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedStyle === 'a4_giasoc' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'}`}>
                <input 
                  type="radio" 
                  name="stickerStyle" 
                  value="a4_giasoc" 
                  checked={selectedStyle === 'a4_giasoc'} 
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="ml-3 font-medium text-slate-800 text-amber-500 font-black">A4 ĐỨNG (GIÁ SỐC VÀNG)</span>
              </label>
            </div>
          </div>

          {/* Layout Selection */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">2. CHỌN BỐ CỤC TRANG IN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedStyle === 'display' || selectedStyle === 'giovang' || selectedStyle === 'a4_giasoc' ? (
                <div 
                  className={`p-5 rounded-xl border-2 cursor-pointer transition-all border-indigo-500 bg-indigo-50/50`}
                >
                  <h4 className="text-lg font-bold text-slate-800 mb-1">1 Sticker / Trang {selectedStyle === 'a4_giasoc' ? 'A4' : 'A5'}</h4>
                  <p className="text-sm text-slate-500">
                    Kích thước {selectedStyle === 'a4_giasoc' ? '210 x 297 mm (A4 Đứng)' : '148.5 x 210 mm (A5 Đứng)'}
                  </p>
                </div>
              ) : (
                layouts.map(layout => (
                  <div 
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout.id)}
                    className={`p-5 rounded-xl border-2 cursor-pointer transition-all ${selectedLayout === layout.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-200'}`}
                  >
                    <h4 className="text-lg font-bold text-slate-800 mb-1">{layout.title}</h4>
                    <p className="text-sm text-slate-500">{layout.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">3. TÙY CHỌN KHÁC</h3>
            <label className="flex items-center p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-200 cursor-pointer transition-all">
              <input 
                type="checkbox" 
                checked={showPromoLabel} 
                onChange={(e) => setShowPromoLabel(e.target.checked)}
                className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="ml-3 font-medium text-slate-800">Hiển thị nhãn "SẢN PHẨM GIÁ SỐC - EVENT T7 & CN"</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors">
            Hủy
          </button>
          <button 
            onClick={() => {
              const finalLayout = (selectedStyle === 'display' || selectedStyle === 'giovang' || selectedStyle === 'a4_giasoc') ? '1' : selectedLayout;
              onConfirm(selectedStyle, finalLayout, showPromoLabel);
            }}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
