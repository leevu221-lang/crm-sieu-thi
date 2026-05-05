import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface BienBanTinhTrangHangHoaProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BienBanTinhTrangHangHoa({ isOpen, onClose }: BienBanTinhTrangHangHoaProps) {
  const { userProfile } = useAuth();
  const LOCAL_STORAGE_KEY = 'rtst_bien_ban_tinh_trang_hang_hoa_data';

  const getSavedData = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentDate) parsed.currentDate = new Date(parsed.currentDate);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved bien ban data:', e);
    }
    return null;
  };

  const savedData = getSavedData();

  const [currentDate, setCurrentDate] = useState(() => savedData?.currentDate || new Date());
  
  const [items, setItems] = useState(() => savedData?.items || [
    {
      name: 'Vợt muỗi Sunhouse SHE-MT1690\n(1032999000762)',
      quantity: '1',
      description: 'KHÔNG NGUỒN',
      reason: 'LỖI SX',
      solution: 'Chuyển trạng thái sang Lỗi MYC\n01841RP2604000299',
      invoiceNumber: '',
      invoiceDate: ''
    }
  ]);

  const [storeName, setStoreName] = useState(() => savedData?.storeName ?? `${userProfile?.ma_kho || ''} - ${userProfile?.ten_sieu_thi || ''}`);
  const [managerInfo, setManagerInfo] = useState(() => savedData?.managerInfo ?? '');
  const [warehouseStaffInfo, setWarehouseStaffInfo] = useState(() => savedData?.warehouseStaffInfo ?? `${userProfile?.username || ''}`);
  const [deliveryStaffMsnv, setDeliveryStaffMsnv] = useState(() => savedData?.deliveryStaffMsnv ?? '');
  const [deliveryStaffName, setDeliveryStaffName] = useState(() => savedData?.deliveryStaffName ?? '');

  useEffect(() => {
    const dataToSave = {
      currentDate,
      items,
      storeName,
      managerInfo,
      warehouseStaffInfo,
      deliveryStaffMsnv,
      deliveryStaffName
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
  }, [currentDate, items, storeName, managerInfo, warehouseStaffInfo, deliveryStaffMsnv, deliveryStaffName]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', quantity: '', description: '', reason: '', solution: '', invoiceNumber: '', invoiceDate: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_: any, i: number) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
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
            size: A4 landscape;
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
        <h2 className="text-xl font-bold text-slate-800">Biên Bản Nhận Tình Trạng Hàng Hóa</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAddItem}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> Thêm dòng
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#00965e] hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            <Printer size={18} /> In Biên Bản
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
          style={{ width: '297mm', minHeight: '210mm', padding: '10mm', fontFamily: '"Times New Roman", Times, serif' }}
        >
          {/* Header */}
          <div className="flex items-start border-b-2 border-black pb-2 mb-2 relative">
            <div className="flex-1 flex justify-center absolute w-full top-2">
              <h1 className="text-2xl font-bold text-black font-serif uppercase tracking-wide">BIÊN BẢN GHI NHẬN TÌNH TRẠNG HÀNG HÓA</h1>
            </div>
            <div className="w-1/3 bg-black text-[#fffb00] font-sans italic font-bold py-2 px-4 text-center z-10 w-[300px]">
              <span style={{fontSize:'22px'}}>www.thegioididong.com</span>
            </div>
            
            <div className="w-1/3 flex justify-end items-end text-black text-lg z-10 w-full pt-2">
              <span className="mr-1">Ngày lập:</span>
              <input 
                type="date"
                className="no-print outline-none border-b border-dashed border-gray-300 ml-1 text-right text-base text-black bg-transparent w-[140px]"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  const dateStr = e.target.value;
                  if (dateStr) {
                    const selectedDate = new Date(dateStr);
                    if (!isNaN(selectedDate.getTime())) {
                      setCurrentDate(selectedDate);
                    }
                  }
                }}
              />
              <span className="print-only">{format(currentDate, 'dd/MM/yyyy')}</span>
            </div>
          </div>

          {/* Info section */}
          <div className="flex flex-col border border-black mb-1 w-full text-[15px] font-sans">
            <div className="flex border-b border-black">
              <div className="flex-1 px-2 py-1 font-bold">SIÊU THỊ: <input className="font-normal w-3/4 outline-none border-b border-dashed border-gray-300" placeholder="Thông tin siêu thị..." value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
            </div>
            <div className="flex border-b border-black">
              <div className="flex-1 px-2 py-1 font-bold">QUẢN LÝ SIÊU THỊ: <input className="font-normal w-3/4 outline-none border-b border-dashed border-gray-300" placeholder="Thông tin quản lý..." value={managerInfo} onChange={(e) => setManagerInfo(e.target.value)} /></div>
            </div>
            <div className="flex border-b border-black">
              <div className="flex-1 px-2 py-1 font-bold">Nhân viên Kho: <input className="font-normal w-3/4 outline-none border-b border-dashed border-gray-300" placeholder="Thông tin nhân viên kho..." value={warehouseStaffInfo} onChange={(e) => setWarehouseStaffInfo(e.target.value)} /></div>
            </div>
            <div className="flex border-b border-black text-black">
              <div className="w-[45%] px-2 py-1 font-bold pr-4">Nhân viên sau bán hàng/Nhân viên giao hàng<br/>(nếu hàng giao tại nhà)</div>
              <div className="w-[20%] border-l border-black px-2 py-1 flex items-center">
                <span>MSNV:</span>
                <input className="font-normal flex-1 ml-2 outline-none border-b border-dashed border-gray-300" value={deliveryStaffMsnv} onChange={(e) => setDeliveryStaffMsnv(e.target.value)} />
              </div>
              <div className="flex-1 border-l border-black px-2 py-1 flex items-center">
                <span>Họ & Tên:</span>
                <input className="font-normal flex-1 ml-2 outline-none border-b border-dashed border-gray-300" value={deliveryStaffName} onChange={(e) => setDeliveryStaffName(e.target.value)} />
              </div>
            </div>
            <div className="flex">
              <div className="flex-1 px-2 py-1 font-bold italic">Chúng tôi cùng thống nhất ghi nhận tình trạng hàng hóa như sau:</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border border-black mb-4 text-[14px]">
            <thead>
              <tr>
                <th className="border border-black p-2 font-bold bg-white w-[22%]" rowSpan={2}>Tên + MSP + Imei</th>
                <th className="border border-black p-2 font-bold bg-white w-[6%]" rowSpan={2}>Số lượng</th>
                <th className="border border-black p-2 font-bold bg-white w-[20%]" rowSpan={2}>Mô tả tình trạng hàng hóa</th>
                <th className="border border-black p-2 font-bold bg-white w-[15%]" rowSpan={2}>Nguyên nhân</th>
                <th className="border border-black p-2 font-bold bg-white w-[22%]" rowSpan={2}>Hướng đề nghị xử lý</th>
                <th className="border border-black p-2 font-bold bg-white w-[15%]" colSpan={2}>Thông tin Hóa đơn xuất bán nếu hàng đã đem giao cho khách</th>
              </tr>
              <tr>
                <th className="border border-black p-2 font-bold bg-white">Số hóa đơn</th>
                <th className="border border-black p-2 font-bold bg-white">Ngày hóa đơn</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => (
                <tr key={index} className="relative group">
                  <td className="border border-black relative">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none resize-y" 
                      value={item.name} 
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)} 
                    />
                    <button onClick={() => handleRemoveItem(index)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-red-100 text-red-600 rounded-lg no-print opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </td>
                  <td className="border border-black">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none text-center resize-y" 
                      value={item.quantity} 
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                    />
                  </td>
                  <td className="border border-black">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none resize-y" 
                      value={item.description} 
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)} 
                    />
                  </td>
                  <td className="border border-black">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none resize-y" 
                      value={item.reason} 
                      onChange={(e) => handleItemChange(index, 'reason', e.target.value)} 
                    />
                  </td>
                  <td className="border border-black">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none resize-y" 
                      value={item.solution} 
                      onChange={(e) => handleItemChange(index, 'solution', e.target.value)} 
                    />
                  </td>
                  <td className="border border-black">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none resize-y" 
                      value={item.invoiceNumber} 
                      onChange={(e) => handleItemChange(index, 'invoiceNumber', e.target.value)} 
                    />
                  </td>
                  <td className="border border-black">
                    <textarea 
                      className="w-full h-full min-h-[60px] p-2 outline-none resize-y" 
                      value={item.invoiceDate} 
                      onChange={(e) => handleItemChange(index, 'invoiceDate', e.target.value)} 
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signature Area */}
          <table className="w-full border-collapse border border-black text-center text-[15px] font-sans font-bold">
            <tbody>
              <tr>
                <td className="border-r border-b border-black p-2 w-[40%]">NHÂN VIÊN KHO</td>
                <td className="border-r border-b border-black p-2 w-[35%]">QLST</td>
                <td className="border-b border-black p-2 w-[25%] uppercase">Nhân viên sau bán hàng</td>
              </tr>
              <tr>
                <td className="border-r border-black p-2 h-[120px] align-bottom">
                  <input className="text-center font-bold outline-none border-b border-dashed border-gray-300 w-full" value={warehouseStaffInfo} onChange={(e) => setWarehouseStaffInfo(e.target.value)} />
                </td>
                <td className="border-r border-black p-2 h-[120px] align-bottom">
                  <input className="text-center font-bold outline-none border-b border-dashed border-gray-300 w-full" value={managerInfo} onChange={(e) => setManagerInfo(e.target.value)} />
                </td>
                <td className="border-black p-2 h-[120px] align-bottom">
                  <input className="text-center font-bold outline-none border-b border-dashed border-gray-300 w-full" value={deliveryStaffName} onChange={(e) => setDeliveryStaffName(e.target.value)} />
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
