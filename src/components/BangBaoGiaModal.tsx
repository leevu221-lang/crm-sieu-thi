import React, { useRef, useState, useEffect, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { DMX_SPRITE_B64 } from '../constants/assets';

interface BangBaoGiaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BangBaoGiaModal({ isOpen, onClose }: BangBaoGiaModalProps) {
  const LOCAL_STORAGE_KEY = 'rtst_bang_bao_gia_data';

  const getSavedData = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.quoteDate) parsed.quoteDate = new Date(parsed.quoteDate);
        if (parsed.validUntil) parsed.validUntil = new Date(parsed.validUntil);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved bang bao gia data:', e);
    }
    return null;
  };

  const savedData = getSavedData();

  const [customerName, setCustomerName] = useState(() => savedData?.customerName || 'Lưu Thiện Chí');
  const [customerPhone, setCustomerPhone] = useState(() => savedData?.customerPhone || '0947773822');
  const [companyName, setCompanyName] = useState(() => savedData?.companyName || 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ SÀI GÒN - CÀ MAU');
  const [taxCode, setTaxCode] = useState(() => savedData?.taxCode || '2000969020');
  const [address, setAddress] = useState(() => savedData?.address || 'Số 09, đường Trần Hưng Đạo, Phường Tân Thành, Tỉnh Cà Mau, Việt Nam');
  
  const [quoteDate, setQuoteDate] = useState(() => savedData?.quoteDate || new Date());
  const [validUntil, setValidUntil] = useState(() => savedData?.validUntil || addDays(new Date(), 7));
  
  const [items, setItems] = useState(() => savedData?.items || [
    {
      image: '',
      name: 'MÁY GIẶT LG FV1410S4M1',
      quantity: 1,
      retailPrice: 14190000,
      discount: 3900000,
    }
  ]);
  
  const [contactInfo, setContactInfo] = useState(() => savedData?.contactInfo || 'Mr Linh - 0943099221');

  useEffect(() => {
    const dataToSave = {
      customerName,
      customerPhone,
      companyName,
      taxCode,
      address,
      quoteDate,
      validUntil,
      items,
      contactInfo
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [customerName, customerPhone, companyName, taxCode, address, quoteDate, validUntil, items, contactInfo]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAddItem = () => {
    setItems([...items, { image: '', name: '', quantity: 1, retailPrice: 0, discount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleImageUpload = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleItemChange(index, 'image', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN');
  };
  
  const parseNumber = (val: string) => {
    const parsed = parseInt(val.replace(/,/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-100 overflow-hidden print-modal">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-modal * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          textarea, input {
             border: none !important;
             resize: none !important;
             background: transparent !important;
             overflow: hidden !important;
          }
          .print-only {
             display: inline-block !important;
          }
        }
        @media screen {
          .print-only {
             display: none !important;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm no-print relative z-10 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">Bảng Báo Giá</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> Thêm sản phẩm
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#00965e] hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            <Printer size={18} /> In Bảng Báo Giá
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-slate-100 p-8 flex justify-center pb-24">
        <div 
          className="print-content bg-white shadow-xl m-auto text-black font-serif"
          style={{ width: '210mm', minHeight: '297mm', padding: '10mm', fontFamily: '"Times New Roman", Times, serif' }}
        >
          {/* Header Row */}
          <div className="flex border-b border-black mb-4">
            {/* Left side */}
            <div className="w-[60%] border-r border-black pr-2 flex flex-col justify-center">
              <h1 className="text-[#008000] font-bold text-[18px] uppercase tracking-tight leading-tight mb-2">CHI NHÁNH CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH</h1>
              <div className="text-[13px] leading-tight">
                <p>Địa chỉ: Phòng 5.6, Etown 2 364 Cộng Hoà P.13 Q.Tân Bình</p>
                <p>Điện thoại: 1800 1060 - Fax: (+84) 38125957</p>
                <p>Mã số thuế: 0303217354 - 007</p>
              </div>
            </div>
            
            {/* Right side Logo */}
            <div className="w-[40%] bg-[#00A1E4] flex items-center justify-center p-2 relative overflow-hidden">
              <div 
                className="logo-dmx-print"
                style={{
                  backgroundImage: `url('${DMX_SPRITE_B64}')`,
                  backgroundPosition: '0 -130px', /* coordinates for logo in the sprite */
                  backgroundRepeat: 'no-repeat',
                  width: '229px',
                  height: '41px',
                  transform: 'scale(0.8)',
                  transformOrigin: 'center',
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact'
                }}
              />
            </div>
          </div>

          <div className="flex mb-4">
            {/* Kính gửi section */}
            <div className="w-[60%] text-[14px]">
              <div className="bg-black text-white px-2 py-1 font-bold">Kính gởi Quý khách:</div>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="w-[30%] border-b border-t border-r border-l border-slate-300 px-2 py-1">Anh/ Chị:</td>
                    <td className="border-b border-t border-r border-slate-300 px-2"><input className="w-full outline-none bg-transparent" value={customerName} onChange={e => setCustomerName(e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="border-b border-r border-l border-slate-300 px-2 py-1">Điện thoại:</td>
                    <td className="border-b border-r border-slate-300 px-2"><input className="w-full outline-none bg-transparent" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="border-b border-r border-l border-slate-300 px-2 py-1">Tên công ty</td>
                    <td className="border-b border-r border-slate-300 px-2"><input className="w-full outline-none bg-transparent" value={companyName} onChange={e => setCompanyName(e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="border-b border-r border-l border-slate-300 px-2 py-1">Mã số thuế:</td>
                    <td className="border-b border-r border-slate-300 px-2"><input className="w-full outline-none bg-transparent" value={taxCode} onChange={e => setTaxCode(e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="border-b border-r border-l border-slate-300 px-2 py-1">Địa chỉ:</td>
                    <td className="border-b border-r border-slate-300 px-2"><textarea className="w-full outline-none bg-transparent resize-y min-h-[40px] pt-1" value={address} onChange={e => setAddress(e.target.value)} /></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Title & Dates */}
            <div className="w-[40%] flex flex-col justify-end items-center pb-2 pl-4">
              <h2 className="text-[28px] font-bold tracking-widest font-serif mb-4 whitespace-nowrap">BẢNG BÁO GIÁ</h2>
              <table className="w-full text-[14px]">
                <tbody>
                  <tr>
                    <td className="text-right pr-2 py-1">Ngày báo giá:</td>
                    <td className="text-red-500 w-[120px]">
                      <input 
                        type="date"
                        className="no-print outline-none border-b border-dashed border-gray-300 w-full text-red-500 font-sans"
                        value={format(quoteDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const dateStr = e.target.value;
                          if (dateStr) {
                            const selectedDate = new Date(dateStr);
                            if (!isNaN(selectedDate.getTime())) setQuoteDate(selectedDate);
                          }
                        }}
                      />
                      <span className="print-only text-red-500 font-sans">{format(quoteDate, 'dd/MM/yyyy')}</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-right pr-2 py-1 border-b border-slate-300">Hiệu lực đến:</td>
                    <td className="border-b border-slate-300 pb-1">
                      <input 
                        type="date"
                        className="no-print outline-none border-b border-dashed border-gray-300 w-full font-sans"
                        value={format(validUntil, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const dateStr = e.target.value;
                          if (dateStr) {
                            const selectedDate = new Date(dateStr);
                            if (!isNaN(selectedDate.getTime())) setValidUntil(selectedDate);
                          }
                        }}
                      />
                      <span className="print-only font-sans">{format(validUntil, 'dd/MM/yyyy')}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse border border-black text-[14px] mb-4">
            <thead>
              <tr className="bg-black text-white">
                <th className="border border-black p-2 font-bold w-[15%]">Hình ảnh</th>
                <th className="border border-black p-2 font-bold w-[35%]">Mô tả hàng hoá</th>
                <th className="border border-black p-2 font-bold w-[5%]">SL</th>
                <th className="border border-black p-2 font-bold w-[15%]">Giá bán lẻ</th>
                <th className="border border-black p-2 font-bold w-[15%]">Khuyến mãi</th>
                <th className="border border-black p-2 font-bold w-[15%]">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => {
                const total = item.quantity * (item.retailPrice - item.discount);
                return (
                  <tr key={index} className="relative group text-center min-h-[80px]">
                    <td className="border border-black p-2 relative h-[100px]">
                      {item.image ? (
                        <div className="relative w-full h-full flex justify-center items-center">
                          <img src={item.image} alt="Product" className="max-h-[80px] object-contain" />
                          <label className="no-print absolute inset-0 bg-black/50 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer rounded transition-opacity">
                            <span className="text-[10px]">Đổi ảnh</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e)} />
                          </label>
                        </div>
                      ) : (
                        <label className="w-full h-full min-h-[80px] border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:bg-slate-50 no-print transition-colors">
                          <ImageIcon size={20} />
                          <span className="text-[10px] mt-1">Chọn ảnh</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(index, e)} />
                        </label>
                      )}
                      
                      <button onClick={() => handleRemoveItem(index)} className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 bg-red-100 text-red-600 rounded-lg no-print opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td className="border border-black font-bold p-2 text-center uppercase">
                      <textarea 
                        className="w-full text-center outline-none resize-y min-h-[60px] font-bold" 
                        value={item.name} 
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)} 
                      />
                    </td>
                    <td className="border border-black p-2">
                       <input 
                        type="number"
                        className="w-full text-center outline-none" 
                        value={item.quantity} 
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)} 
                      />
                    </td>
                    <td className="border border-black p-2">
                      <input 
                        type="text"
                        className="w-full text-center outline-none" 
                        value={item.retailPrice ? formatCurrency(item.retailPrice) : ''} 
                        onChange={(e) => handleItemChange(index, 'retailPrice', parseNumber(e.target.value))} 
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td className="border border-black p-2">
                      <input 
                        type="text"
                        className="w-full text-center outline-none" 
                        value={item.discount ? formatCurrency(item.discount) : ''} 
                        onChange={(e) => handleItemChange(index, 'discount', parseNumber(e.target.value))} 
                        onFocus={(e) => e.target.select()}
                      />
                    </td>
                    <td className="border border-black p-2 text-right pr-2">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
              
              {/* Empty placeholder rows for visual matching */}
              {[1, 2].map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-[40px]">
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                </tr>
              ))}

              <tr className="bg-white">
                <td colSpan={5} className="border border-black font-bold text-right p-2 pr-4 text-[15px]">
                  Tổng cộng (VND)
                </td>
                <td className="border border-black font-bold text-right p-2 pr-2 text-[15px]">
                  {formatCurrency(items.reduce((acc: number, item: any) => acc + (item.quantity * (item.retailPrice - item.discount)), 0))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer constraints */}
          <div className="w-full text-[14px]">
            <div className="bg-black text-white px-2 py-1 font-bold w-full">Các điều khoản lưu ý</div>
            <div className="border-l border-r border-black px-2 pb-2">
              <p>1. Giá trên đã bao gồm 10% VAT,</p>
              <p>2. Thanh toán bằng chuyển khoản hoặc tiền mặt trước khi nhận hàng</p>
              <p>3. Hàng hoá được bảo hành theo tiêu chuẩn nhà sản xuất và phân phối</p>
              <p>4. Hàng hóa được giao miễn phí tại 63 tỉnh thành</p>
            </div>
            
            <div className="border border-black h-[100px] mb-4"></div>

            <div className="px-2">
              <p>Nếu quý khách cần hỗ trợ thêm thông tin, vui lòng liên hệ với:</p>
              <input className="w-full outline-none font-bold italic border-b border-dashed border-gray-300 text-[15px]" value={contactInfo} onChange={e => setContactInfo(e.target.value)} />
            </div>

            <div className="mt-8 font-bold italic text-[22px] font-serif text-black">
              Cảm ơn Quý khách đã công tác với dienmayxanh.com!
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
