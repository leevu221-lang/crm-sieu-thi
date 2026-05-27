import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface BaoGiaCongTyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BaoGiaCongTyModal({ isOpen, onClose }: BaoGiaCongTyModalProps) {
  const { userProfile } = useAuth();
  const LOCAL_STORAGE_KEY = 'rtst_bao_gia_cong_ty_data';

  const getSavedData = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentDate) parsed.currentDate = new Date(parsed.currentDate);
        if (parsed.validUntilDate) parsed.validUntilDate = new Date(parsed.validUntilDate);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved bao gia data:', e);
    }
    return null;
  };

  const savedData = getSavedData();

  const defaultDate = new Date();
  const defaultValidDate = new Date();
  defaultValidDate.setDate(defaultValidDate.getDate() + 6); // Add 6 days

  const [currentDate, setCurrentDate] = useState(() => savedData?.currentDate || defaultDate);
  const [validUntilDate, setValidUntilDate] = useState(() => savedData?.validUntilDate || defaultValidDate);
  
  const [items, setItems] = useState(() => savedData?.items || [
    { name: 'MÁY LẠNH CASPER GC-18IS33', quantity: '2', retailPrice: '15990000', discountPrice: '12690000' },
    { name: 'MÁY LẠNH CASPER GC-12IB36', quantity: '3', retailPrice: '8990000', discountPrice: '7990000' }
  ]);

  const [companyName, setCompanyName] = useState(() => savedData?.companyName ?? 'CHI NHÁNH CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH');
  const [companyAddress, setCompanyAddress] = useState(() => savedData?.companyAddress ?? '155A, NGUYỄN TẤT THÀNH, LÝ VĂN LÂM, TỈNH CÀ MAU');
  const [companyPhone, setCompanyPhone] = useState(() => savedData?.companyPhone ?? '1900232460');
  const [companyTax, setCompanyTax] = useState(() => savedData?.companyTax ?? '');

  const [customerName, setCustomerName] = useState(() => savedData?.customerName ?? 'DUNG');
  const [customerPhone, setCustomerPhone] = useState(() => savedData?.customerPhone ?? '0976896425');
  const [customerCompany, setCustomerCompany] = useState(() => savedData?.customerCompany ?? 'CHI NHÁNH PHÍA NAM - TỔNG CÔNG TY XÂY DỰNG TRƯỜNG SƠN');
  const [customerEmail, setCustomerEmail] = useState(() => savedData?.customerEmail ?? '');
  const [customerAddress, setCustomerAddress] = useState(() => savedData?.customerAddress ?? '30D PHAN VĂN TRỊ, PHƯỜNG HẠNH THÔNG, THÀNH PHỐ HỒ CHÍ MINH, VIỆT NAM');

  const [terms, setTerms] = useState(() => savedData?.terms || [
    'Giá trên đã bao gồm 10% VAT,',
    'Thanh toán bằng chuyển khoản hoặc tiền mặt trước khi nhận hàng',
    'Hàng hoá được bảo hành theo tiêu chuẩn nhà sản xuất và phân phối',
    'Hàng hóa được giao tại 63 tỉnh thành'
  ]);

  const [contactStore, setContactStore] = useState(() => savedData?.contactStore ?? (userProfile?.ten_sieu_thi || ''));
  const [contactAddress, setContactAddress] = useState(() => savedData?.contactAddress ?? '');
  const [creatorName, setCreatorName] = useState(() => savedData?.creatorName ?? (userProfile?.username || ''));

  useEffect(() => {
    const dataToSave = {
      currentDate, validUntilDate, items, companyName, companyAddress, companyPhone, companyTax,
      customerName, customerPhone, customerCompany, customerEmail, customerAddress,
      terms, contactStore, contactAddress, creatorName
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [
    currentDate, validUntilDate, items, companyName, companyAddress, companyPhone, companyTax,
    customerName, customerPhone, customerCompany, customerEmail, customerAddress,
    terms, contactStore, contactAddress, creatorName
  ]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: '1', retailPrice: '0', discountPrice: '0' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    // Remove non-numeric characters for prices
    if (field === 'retailPrice' || field === 'discountPrice') {
        const numericValue = value.replace(/[^0-9]/g, '');
        newItems[index] = { ...newItems[index], [field]: numericValue };
    } else {
        newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const formatCurrency = (val: string | number) => {
    const num = Number(val) || 0;
    if (num === 0) return '-';
    return num.toLocaleString('en-US');
  };

  const calculateTotalRow = (item: any) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.discountPrice) || 0;
    return qty * price;
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum: number, item: any) => sum + calculateTotalRow(item), 0);
  };

  const displayItems = [...items];

  const handleTermChange = (index: number, value: string) => {
    const newTerms = [...terms];
    newTerms[index] = value;
    setTerms(newTerms);
  };

  const handleAddTerm = () => setTerms([...terms, '']);
  const handleRemoveTerm = (index: number) => setTerms(terms.filter((_: any, i: number) => i !== index));


  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-100 overflow-hidden print-modal">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-modal * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
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
          .no-print { display: none !important; }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          textarea {
             border: none !important;
             resize: none !important;
             background: transparent !important;
             overflow: hidden !important;
          }
          input {
             border: none !important;
             background: transparent !important;
          }
          .print-only { display: inline-block !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm no-print relative z-10 shrink-0">
        <h2 className="text-xl font-bold text-slate-800">Báo Giá Công Ty</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> Thêm dòng SP
          </button>
          <button
            onClick={handleAddTerm}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> Thêm điều khoản
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#00965e] hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            <Printer size={18} /> In Báo Giá
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
          className="print-content bg-white shadow-xl m-auto"
          style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: '"Times New Roman", Times, serif' }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1 pr-4">
              <input 
                  className="font-bold text-black uppercase w-full outline-none" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
              />
              <div className="flex text-red-600 text-[13px] mt-1">
                  <span className="whitespace-nowrap">Địa chỉ: </span>
                  <input 
                      className="ml-1 flex-1 outline-none text-red-600" 
                      value={companyAddress} 
                      onChange={(e) => setCompanyAddress(e.target.value)} 
                  />
              </div>
              <div className="flex text-red-600 text-[13px] mt-4">
                  <span className="whitespace-nowrap">Điện thoại: </span>
                  <input 
                      className="ml-1 flex-1 outline-none text-red-600" 
                      value={companyPhone} 
                      onChange={(e) => setCompanyPhone(e.target.value)} 
                  />
              </div>
              <div className="flex text-red-600 text-[13px]">
                  <span className="whitespace-nowrap">Mã số thuế: </span>
                  <input 
                      className="ml-1 flex-1 outline-none text-red-600" 
                      value={companyTax} 
                      onChange={(e) => setCompanyTax(e.target.value)} 
                  />
              </div>
            </div>
            <div className="w-[260px] h-[50px] flex shrink-0 border border-slate-200">
                <div className="w-1/2 bg-black flex items-center justify-center p-1">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px] font-black">?</div>
                        <span className="text-yellow-400 font-sans font-bold italic text-[11px] leading-none">thegioididong</span>
                    </div>
                </div>
                <div className="w-1/2 bg-[#00a8e8] flex items-center justify-center p-1">
                    <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px] font-black">?</div>
                        <span className="text-yellow-400 font-sans font-bold italic text-[11px] leading-none whitespace-nowrap">Điện máy XANH</span>
                    </div>
                </div>
            </div>
          </div>

          <div className="flex justify-between items-start mb-6">
              <div className="w-[65%]">
                  <div className="bg-black text-white font-bold px-2 py-1 mb-6 text-[14px]">
                      Kính gởi Quý khách:
                  </div>
                  
                  <div className="space-y-1 text-[13px]">
                      <div className="flex text-red-600">
                          <span className="whitespace-nowrap w-[80px]">Anh/ Chị: </span>
                          <input className="flex-1 outline-none text-red-600" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                      </div>
                      <div className="flex text-red-600">
                          <span className="whitespace-nowrap w-[80px]">Điện thoại: </span>
                          <input className="flex-1 outline-none text-red-600" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                      </div>
                      <div className="flex text-red-600">
                          <span className="whitespace-nowrap w-[80px]">Tên công ty: </span>
                          <input className="flex-1 outline-none text-red-600" value={customerCompany} onChange={(e) => setCustomerCompany(e.target.value)} />
                      </div>
                      <div className="flex text-red-600">
                          <span className="whitespace-nowrap w-[80px]">Email: </span>
                          <input className="flex-1 outline-none text-red-600" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                      </div>
                      <div className="flex text-red-600">
                          <span className="whitespace-nowrap w-[80px]">Địa chỉ: </span>
                          <textarea 
                              className="flex-1 outline-none text-red-600 resize-none h-[40px] leading-tight" 
                              value={customerAddress} 
                              onChange={(e) => setCustomerAddress(e.target.value)} 
                          />
                      </div>
                  </div>
              </div>
              
              <div className="w-[35%] pl-4 flex flex-col items-end">
                  <h1 className="text-[32px] font-bold text-black font-serif tracking-wide mb-4 mt-[-10px]">BẢNG BÁO GIÁ</h1>
                  
                  <div className="w-full space-y-1 text-[13px] text-black pl-4">
                      <div className="flex items-center justify-start">
                          <span className="whitespace-nowrap w-[90px]">Ngày báo giá: </span>
                          <input 
                            type="date"
                            className="no-print outline-none text-black bg-transparent w-[120px]"
                            value={format(currentDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const dateStr = e.target.value;
                              if (dateStr) {
                                const selectedDate = new Date(dateStr);
                                if (!isNaN(selectedDate.getTime())) setCurrentDate(selectedDate);
                              }
                            }}
                          />
                          <span className="print-only ml-1 whitespace-nowrap">{format(currentDate, 'd/M/yyyy')}</span>
                      </div>
                      <div className="flex items-center justify-start">
                          <span className="whitespace-nowrap w-[90px]">Hiệu lực đến: </span>
                          <input 
                            type="date"
                            className="no-print outline-none text-black bg-transparent w-[120px]"
                            value={format(validUntilDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                              const dateStr = e.target.value;
                              if (dateStr) {
                                const selectedDate = new Date(dateStr);
                                if (!isNaN(selectedDate.getTime())) setValidUntilDate(selectedDate);
                              }
                            }}
                          />
                          <span className="print-only ml-1 whitespace-nowrap">{format(validUntilDate, 'd/M/yyyy')}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black mb-4 text-[13px]">
            <thead>
              <tr className="bg-black text-white">
                <th className="border border-black p-1.5 font-bold w-[5%] text-center">STT</th>
                <th className="border border-black p-1.5 font-bold w-[35%] text-left">Mô tả hàng hoá</th>
                <th className="border border-black p-1.5 font-bold w-[6%] text-center">SL</th>
                <th className="border border-black p-1.5 font-bold w-[16%] text-right">Giá bán lẻ</th>
                <th className="border border-black p-1.5 font-bold w-[18%] text-right">Giá đã giảm</th>
                <th className="border border-black p-1.5 font-bold w-[20%] text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item: any, index: number) => {
                  const isActualItem = index < items.length;
                  const stt = index + 1;
                  return (
                    <tr key={index} className="relative group">
                      <td className="border border-black text-red-600 text-center font-bold relative">
                        {stt}
                        {isActualItem && (
                            <button onClick={() => handleRemoveItem(index)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1 bg-red-100 text-red-600 rounded no-print opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 size={14} />
                            </button>
                        )}
                      </td>
                      <td className="border border-black p-0 h-[24px]">
                        {isActualItem ? (
                            <input 
                                className="w-full h-full px-1.5 outline-none font-bold text-black" 
                                value={item.name} 
                                onChange={(e) => handleItemChange(index, 'name', e.target.value)} 
                            />
                        ) : null}
                      </td>
                      <td className="border border-black p-0 text-center">
                        {isActualItem ? (
                            <input 
                                className="w-full h-full text-center outline-none text-red-600" 
                                value={item.quantity} 
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                            />
                        ) : null}
                      </td>
                      <td className="border border-black p-0 text-right">
                        {isActualItem ? (
                            <input 
                                className="w-full h-full px-1.5 text-right outline-none text-red-600" 
                                value={formatCurrency(item.retailPrice)} 
                                onChange={(e) => handleItemChange(index, 'retailPrice', e.target.value)} 
                            />
                        ) : null}
                      </td>
                      <td className="border border-black p-0 text-right">
                        {isActualItem ? (
                            <input 
                                className="w-full h-full px-1.5 text-right outline-none text-red-600" 
                                value={formatCurrency(item.discountPrice)} 
                                onChange={(e) => handleItemChange(index, 'discountPrice', e.target.value)} 
                            />
                        ) : null}
                      </td>
                      <td className="border border-black p-1.5 text-right text-red-600 font-bold bg-[#fcfcfc]">
                        {isActualItem ? formatCurrency(calculateTotalRow(item)) : '-'}
                      </td>
                    </tr>
                  )
              })}
              <tr>
                <td colSpan={5} className="p-2 font-bold text-right text-[14px]">Tổng cộng (VND)</td>
                <td className="border border-black p-2 font-bold text-right bg-[#e2e8f0] text-[14px]">
                    {formatCurrency(calculateGrandTotal())}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes Area */}
          <div className="w-[65%] border-2 border-black mb-6">
              <div className="bg-black text-white font-bold px-2 py-1 text-[13px]">
                  Các điều khoản lưu ý
              </div>
              <div className="p-2 text-[13px]">
                  {terms.map((term: string, index: number) => (
                      <div key={index} className="flex relative group">
                          <span className="text-black font-bold mr-1">{index + 1}.</span>
                          <input 
                              className={`flex-1 outline-none ${index % 2 === 0 ? 'text-black' : 'text-red-600'}`} 
                              value={term} 
                              onChange={(e) => handleTermChange(index, e.target.value)} 
                          />
                          <button onClick={() => handleRemoveTerm(index)} className="absolute -left-6 top-1/2 -translate-y-1/2 p-0.5 bg-red-100 text-red-600 rounded no-print opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={12} />
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          <div className="text-[13px] text-black mb-8 space-y-1">
              <div>Nếu quý khách cần hỗ trợ thêm thông tin, vui lòng liên hệ với:</div>
              <div className="flex text-red-600">
                  <span className="whitespace-nowrap">Siêu thị: </span>
                  <input className="ml-1 flex-1 outline-none text-red-600" value={contactStore} onChange={(e) => setContactStore(e.target.value)} />
              </div>
              <div className="flex text-black">
                  <span className="whitespace-nowrap">Địa chỉ: </span>
                  <input className="ml-1 flex-1 outline-none text-black" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} />
              </div>
              <div className="font-bold font-serif italic mt-2">Cảm ơn Quý khách đã cộng tác với Điện máy xanh!</div>
          </div>

          <div className="flex justify-end pr-12 text-center text-[13px]">
              <div>
                  <div className="font-bold text-black mb-16">Người lập báo giá</div>
                  <input 
                      className="text-center font-bold text-black uppercase outline-none min-w-[200px]" 
                      value={creatorName} 
                      onChange={(e) => setCreatorName(e.target.value)} 
                  />
              </div>
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
