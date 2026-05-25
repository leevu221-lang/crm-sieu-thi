import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, Printer, Trash2, Info, Archive, ShieldAlert, FilePlus, 
  ChevronDown, CheckCircle2, Save, Loader2, Calendar, ArrowUpDown, 
  SortAsc, SortDesc, PieChart, Users, UploadCloud, Settings, 
  ChevronRight, LayoutGrid, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import StickerPrintModal from '../components/StickerPrintModal';
import PrintLayoutModal from '../components/PrintLayoutModal';
import PhanCaTable from '../components/PhanCaTable';
import PhanCaTuanTable from '../components/PhanCaTuanTable';
import BienBanTinhTrangHangHoa from '../components/BienBanTinhTrangHangHoa';

import { STORAGE_KEYS } from './RTST/types';
� thay đổi trong Hợp Đồng này phải lập phụ lục hợp đồng và phải có chữ ký xác nhận của Hai Bên. Nếu một trong Hai Bên cố ý vi phạm các điều khoản của Hợp Đồng này sẽ phải chịu trách nhiệm về các hành vi vi phạm đó.</p>
<p style="margin-bottom: 10px; text-align: justify;">8.2 Trong trường hợp xảy ra tranh chấp, hai bên cố gắng cùng nhau bàn bạc các biện pháp giải quyết trên tinh thần hòa giải, có thiện chí và hợp tác. Nếu vẫn không thể thống nhất cách giải quyết thì hai bên sẽ đưa vụ việc ra Tòa án có thẩm quyền giải quyết, toàn bộ chi phí xét xử do bên thua chịu.</p>
<p style="margin-bottom: 15px; text-align: justify;">8.3 Hợp đồng này được lập thành 02 (hai) bản, mỗi bên giữ 01 (một) bản có giá trị pháp lý như nhau.</p>

<table style="width: 100%; border-collapse: collapse; border: none; margin-top: 25px; font-size: 13px;">
  <tr>
    <td style="width: 50%; border: 1.5px dashed #cbd5e1; padding: 15px; height: 180px; vertical-align: top;">
      <div style="font-weight: bold; text-align: center; margin-bottom: 15px;">Đại Diện Bên A</div>
    </td>
    <td style="width: 50%; border: 1.5px dashed #cbd5e1; padding: 15px; height: 180px; vertical-align: top;">
      <div style="font-weight: bold; text-align: center; margin-bottom: 15px;">Đại Diện Bên B</div>
    </td>
  </tr>
  <tr>
    <td style="width: 50%; border: none; padding: 10px 5px; vertical-align: top; line-height: 1.5;">
      <strong>Bởi:</strong> CHI NHÁNH PHÍA NAM - TỔNG CÔNG TY XÂY DỰNG TRƯỜNG SƠN<br/>
      <strong>Tên:</strong> {{Tên đại diện Bên A}}<br/>
      <strong>Chức vụ:</strong> {{Chức vụ Bên A}}
    </td>
    <td style="width: 50%; border: none; padding: 10px 5px; vertical-align: top; line-height: 1.5;">
      <strong>Bởi:</strong> CÔNG TY CỔ PHẦN ĐẦU TƯ ĐIỆN MÁY XANH<br/>
      <strong>Tên:</strong> {{Tên đại diện Bên B}}<br/>
      <strong>Chức vụ:</strong> {{Chức vụ Bên B}}
    </td>
  </tr>
</table>

<div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 5px;">
  <div>Pháp Chế_111124_TGDD_VN</div>
  <div>Trang 1/1</div>
</div>`;

export default function ToolHoTro() {
  const { userProfile } = useAuth();
  const maKho = userProfile?.ma_kho || '';
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('sticker-event');
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [priceFile, setPriceFile] = useState<File | null>(null);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [priceData, setPriceData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [lastUpdateInventory, setLastUpdateInventory] = useState<string | null>(null);
  const [lastUpdatePrice, setLastUpdatePrice] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  const [isBienBanModalOpen, setIsBienBanModalOpen] = useState(false);
  const [printConfig, setPrintConfig] = useState({ style: 'classic', layout: '4', showPromoLabel: true });
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<number, number>>({});
  const [printQuantity, setPrintQuantity] = useState<string>('');
  const [filters, setFilters] = useState({
    maSieuThi: '',
    nganhHang: '',
    nhomHang: '',
    onlyInventory: false,
    sortOrder: '' // '' | 'asc' | 'desc'
  });

  const [manualData, setManualData] = useState({
    productCode: '',
    name: '',
    originalPrice: '',
    discountPrice: ''
  });

  const [autoExpand, setAutoExpand] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Fetch data from local storage on mount
  useEffect(() => {
    if (activeTab === 'sticker-event' || activeTab === 'sticker') {
      const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
      const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;

      const savedInventory = localStorage.getItem(storageKeyInv);
      if (savedInventory) {
        try {
          const parsed = JSON.parse(savedInventory);
          setInventoryData(parsed.data || []);
          setLastUpdateInventory(parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('vi-VN') : null);
        } catch (e) {
          console.error('Error parsing saved inventory:', e);
        }
      }

      const savedPrice = localStorage.getItem(storageKeyPrice);
      if (savedPrice) {
        try {
          const parsed = JSON.parse(savedPrice);
          setPriceData(parsed.data || []);
          setLastUpdatePrice(parsed.timestamp ? new Date(parsed.timestamp).toLocaleString('vi-VN') : null);
        } catch (e) {
          console.error('Error parsing saved price:', e);
        }
      }
    }
  }, [activeTab]);

  // Autosave priceData to localStorage when it changes
  React.useEffect(() => {
    if (priceData.length > 0) {
      const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
      localStorage.setItem(storageKeyPrice, JSON.stringify({
        data: priceData,
        timestamp: new Date().toISOString()
      }));
    }
  }, [priceData, activeTab]);

  const fetchInventoryData = async () => {
    // Disabled database fetching as per user request
    return;
  };

  const fetchPriceData = async () => {
    // Disabled database fetching as per user request
    return;
  };

  const combinedPriceData = React.useMemo(() => {
    if (!inventoryData || inventoryData.length === 0) return priceData;

    const inventoryMap = new Map<string, { nganhHang: string, nhomHang: string }>();

    // Handle both array of arrays (file upload) and array of objects (database)
    if (Array.isArray(inventoryData[0])) {
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(20, inventoryData.length); i++) {
        const row: any = inventoryData[i];
        if (!row || !Array.isArray(row)) continue;
        const rowStr = row.join(' ').toLowerCase();
        if (rowStr.includes('mã sản phẩm') || rowStr.includes('tên sản phẩm') || rowStr.includes('mã hàng')) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx !== -1) {
        const headerRow = inventoryData[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
        const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
        const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
        const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

        if (maSpIdx !== -1) {
          for (let i = headerRowIdx + 1; i < inventoryData.length; i++) {
            const row = inventoryData[i];
            if (!row || !Array.isArray(row)) continue;
            const maSp = String(row[maSpIdx] || '').trim();
            if (maSp) {
              inventoryMap.set(maSp, {
                nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
                nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
              });
            }
          }
        }
      }
    } else {
      // Array of objects from database
      inventoryData.forEach((item: any) => {
        if (item.ma_san_pham) {
          inventoryMap.set(item.ma_san_pham, {
            nganhHang: item.nganh_hang || '',
            nhomHang: item.nhom_hang || ''
          });
        }
      });
    }

    return priceData.map(item => {
      const productCode = item.maSanPham || item.productCode || (item.name || '').split(' - ')[0].trim();
      const invInfo = inventoryMap.get(productCode);
      return {
        ...item,
        nganhHang: invInfo?.nganhHang || item.nganhHang || '',
        nhomHang: invInfo?.nhomHang || item.nhomHang || ''
      };
    });
  }, [priceData, inventoryData]);

  const filteredPriceData = React.useMemo(() => {
    let result = combinedPriceData.filter(item => {
      const matchNganh = !filters.nganhHang || item.nganhHang === filters.nganhHang;
      const matchNhom = !filters.nhomHang || item.nhomHang === filters.nhomHang;
      const matchInv = !filters.onlyInventory || (item.nganhHang || item.nhomHang);
      return matchNganh && matchNhom && matchInv;
    });

    if (filters.sortOrder === 'asc') {
      result = [...result].sort((a, b) => Number(a.discountPrice) - Number(b.discountPrice));
    } else if (filters.sortOrder === 'desc') {
      result = [...result].sort((a, b) => Number(b.discountPrice) - Number(a.discountPrice));
    }

    return result;
  }, [combinedPriceData, filters]);

  const uniqueNganhHang = React.useMemo(() => {
    const set = new Set<string>();
    combinedPriceData.forEach(item => {
      if (item.nganhHang) set.add(item.nganhHang);
    });
    return Array.from(set).sort();
  }, [combinedPriceData]);

  const uniqueNhomHang = React.useMemo(() => {
    const set = new Set<string>();
    combinedPriceData.forEach(item => {
      if (item.nhomHang && (!filters.nganhHang || item.nganhHang === filters.nganhHang)) {
        set.add(item.nhomHang);
      }
    });
    return Array.from(set).sort();
  }, [combinedPriceData, filters.nganhHang]);

  React.useEffect(() => {
    const initialQuantities: Record<number, number> = {};
    filteredPriceData.forEach((_, index) => {
      initialQuantities[index] = 1;
    });
    setPrintQuantities(initialQuantities);
    setSelectedIndices(filteredPriceData.map((_, index) => index));
  }, [filteredPriceData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIndices = filteredPriceData.map((_, index) => index);
      setSelectedIndices(allIndices);
      const newQuantities = { ...printQuantities };
      allIndices.forEach(index => {
        if (!newQuantities[index] || newQuantities[index] === 0) newQuantities[index] = 1;
      });
      setPrintQuantities(newQuantities);
    } else {
      setSelectedIndices([]);
    }
  };

  const handleSelectRow = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        if (!printQuantities[index] || printQuantities[index] === 0) {
          setPrintQuantities(prevQ => ({ ...prevQ, [index]: 1 }));
        }
        return [...prev, index];
      }
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newQty = Math.max(0, qty);
    setPrintQuantities(prev => ({
      ...prev,
      [index]: newQty
    }));
    
    if (newQty > 0) {
      if (!selectedIndices.includes(index)) {
        setSelectedIndices(prev => [...prev, index]);
      }
    } else {
      setSelectedIndices(prev => prev.filter(i => i !== index));
    }
  };

  const totalStickersToPrint = React.useMemo(() => {
    return selectedIndices.reduce((sum, index) => sum + (printQuantities[index] || 0), 0);
  }, [selectedIndices, printQuantities]);

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File, type: 'inventory' | 'price', shouldAppend: boolean = false) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    if (type === 'inventory') {
      setInventoryFile(file);
    } else if (!shouldAppend) {
      setPriceFile(file);
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataBuffer = evt.target?.result as ArrayBuffer;
      const wb = XLSX.read(dataBuffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0, defval: '' }) as any[][]; 
      
      if (!data || data.length === 0) {
        showNotification('File Excel không có dữ liệu!', 'error');
        return;
      }

      if (type === 'inventory') {
        const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
        setInventoryData(data);
        const timestamp = new Date().toISOString();
        setLastUpdateInventory(new Date(timestamp).toLocaleString('vi-VN'));
        localStorage.setItem(storageKeyInv, JSON.stringify({
          data,
          timestamp
        }));
        showNotification('Đã tải và lưu tạm file Tồn kho!', 'success');

        // Tự động xuất file Excel chỉ lấy dữ liệu cột G
        try {
          const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || 'Du_Lieu';
          const colGData = data.map((row) => {
            const value = row && row.length > 6 ? row[6] : '';
            return [value];
          });
          const exportWs = XLSX.utils.aoa_to_sheet(colGData);
          const exportWb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(exportWb, exportWs, 'Sheet1');
          XLSX.writeFile(exportWb, `${originalName}_Cot_G.xlsx`);
          showNotification('Đã tự động xuất file Excel cột G!', 'success');
        } catch (err) {
          console.error('Error auto-exporting column G:', err);
        }
      } else {
        // Process price data
        const parsedPriceData: any[] = [];
        
        if (shouldAppend) {
          // TRANG STICKER -> BẢNG DỮ LIỆU BẢNG GIÁ -> Cột A = Mã SP, Cột B = Tên SP, Cột C = Giá gốc, Cột D = Giá giảm
          const cleanPrice = (val: any) => {
            if (val === undefined || val === null || val === '') return 0;
            if (typeof val === 'number') return val;
            return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
          };

          for (let i = 0; i < data.length; i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;

            const colA = String(row[0] || '').trim();  // Cột A
            const colB = String(row[1] || '').trim();  // Cột B
            const colC = row[2];                        // Cột C = Giá gốc
            const colD = row[3];                        // Cột D = Giá giảm

            // Bỏ qua dòng tiêu đề
            if (i === 0 && (colA.toLowerCase().includes('mã') || colB.toLowerCase().includes('tên') || colB.toLowerCase().includes('sản phẩm'))) {
              continue;
            }

            if (!colB) continue; // Bỏ qua dòng trống không có tên SP

            parsedPriceData.push({
              maSanPham: colA,
              productCode: colA,
              name: colB,
              originalPrice: cleanPrice(colC),
              discountPrice: cleanPrice(colD),
              nganhHang: '',
              nhomHang: ''
            });
          }
        } else {
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const row: any = data[i];
            if (!row || !Array.isArray(row)) continue;
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('tên sản phẩm') || rowStr.includes('tên hàng') || rowStr.includes('mã sản phẩm') || rowStr.includes('giá niêm yết') || rowStr.includes('giá gốc') || rowStr.includes('giá sau giảm')) {
              headerRowIdx = i;
              break;
            }
          }

          if (headerRowIdx !== -1) {
            const headerRow = data[headerRowIdx].map((h: any) => String(h || '').toLowerCase().trim());
            const maSpIdx = headerRow.findIndex((h: string) => h === 'mã sản phẩm' || h === 'mã sp' || h === 'mã hàng');
            const nameIdx = headerRow.findIndex((h: string) => h === 'tên sản phẩm' || h === 'tên hàng' || h === 'sản phẩm');
            const originalPriceIdx = headerRow.findIndex((h: string) => h === 'giá niêm yết' || h === 'giá gốc' || h === 'giá cũ');
            const discountPriceIdx = headerRow.findIndex((h: string) => h === 'giá mới' || h === 'giá giảm' || h === 'giá bán' || h === 'giá hiện tại' || h === 'giá sau giảm');
            const nganhHangIdx = headerRow.findIndex((h: string) => h === 'ngành hàng');
            const nhomHangIdx = headerRow.findIndex((h: string) => h === 'nhóm hàng');

            for (let i = headerRowIdx + 1; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const name = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';
              if (!name || name.toLowerCase().includes('tên sản phẩm')) continue;

              const cleanPrice = (val: any) => {
                if (val === undefined || val === null || val === '') return 0;
                if (typeof val === 'number') return val;
                return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
              };

              parsedPriceData.push({
                maSanPham: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
                productCode: maSpIdx !== -1 ? String(row[maSpIdx] || '').trim() : '',
                name,
                originalPrice: originalPriceIdx !== -1 ? cleanPrice(row[originalPriceIdx]) : 0,
                discountPrice: discountPriceIdx !== -1 ? cleanPrice(row[discountPriceIdx]) : 0,
                nganhHang: nganhHangIdx !== -1 ? String(row[nganhHangIdx] || '').trim() : '',
                nhomHang: nhomHangIdx !== -1 ? String(row[nhomHangIdx] || '').trim() : ''
              });
            }
          } else {
            // Fallback: Không tìm thấy header
            // Cột AK (index 36) = Mã SP, Cột A+B = Tên SP, Cột E = Giá gốc, Cột F = Giá giảm
            const cleanPrice = (val: any) => {
              if (val === undefined || val === null || val === '') return 0;
              if (typeof val === 'number') return val;
              return parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
            };

            for (let i = 0; i < data.length; i++) {
              const row: any = data[i];
              if (!row || !Array.isArray(row)) continue;

              const colA = String(row[0] || '').trim();  // Cột A
              const colB = String(row[1] || '').trim();  // Cột B
              const colE = row[4];                        // Cột E = Giá gốc
              const colF = row[5];                        // Cột F = Giá giảm
              const colAK = String(row[36] || '').trim(); // Cột AK = Mã SP

              // Tên SP = Cột A + Cột B (gộp lại)
              const name = [colA, colB].filter(Boolean).join(' ').trim();

              // Bỏ qua dòng trống
              if (!name) continue;

              parsedPriceData.push({
                maSanPham: colAK,
                productCode: colAK,
                name,
                originalPrice: cleanPrice(colE),
                discountPrice: cleanPrice(colF),
                nganhHang: '',
                nhomHang: ''
              });
            }
          }
        }

        const finalData = shouldAppend ? [...priceData, ...parsedPriceData] : parsedPriceData;
        setPriceData(finalData);
        
        const timestamp = new Date().toISOString();
        if (!shouldAppend) setLastUpdatePrice(new Date(timestamp).toLocaleString('vi-VN'));
        
        const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
        localStorage.setItem(storageKeyPrice, JSON.stringify({
          data: finalData,
          timestamp
        }));
        
        const message = shouldAppend 
          ? `Đã thêm ${parsedPriceData.length} sản phẩm vào danh sách!` 
          : `Đã tải và đồng bộ ${parsedPriceData.length} sản phẩm bảng giá!`;
        showNotification(message, 'success');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearData = () => {
    setInventoryFile(null);
    setPriceFile(null);
    setInventoryData([]);
    setPriceData([]);
    setLastUpdateInventory(null);
    setLastUpdatePrice(null);
    const storageKeyInv = STORAGE_KEYS.STICKER_INVENTORY_DATA;
    const storageKeyPrice = STORAGE_KEYS.STICKER_PRICE_DATA;
    localStorage.removeItem(storageKeyInv);
    localStorage.removeItem(storageKeyPrice);
    setSaveMessage({ type: '', text: '' });
    if (inventoryInputRef.current) inventoryInputRef.current.value = '';
    if (priceInputRef.current) priceInputRef.current.value = '';
  };

  const handlePrintSticker = () => {
    setIsPrintModalOpen(true);
  };

  const handleAddManualSticker = () => {
    if (!manualData.name || !manualData.discountPrice) {
      showNotification('Vui lòng nhập tên sản phẩm và giá giảm!', 'error');
      return;
    }

    const newItem = {
      productCode: manualData.productCode || 'MANUAL',
      maSanPham: manualData.productCode || 'MANUAL',
      name: manualData.name,
      originalPrice: parseInt(manualData.originalPrice.replace(/[^\d]/g, '')) || 0,
      discountPrice: parseInt(manualData.discountPrice.replace(/[^\d]/g, '')) || 0,
      nganhHang: 'THỦ CÔNG',
      nhomHang: 'THỦ CÔNG',
      isManual: true
    };

    setPriceData(prev => [newItem, ...prev]);
    setManualData({
      productCode: '',
      name: '',
      originalPrice: '',
      discountPrice: ''
    });
    showNotification('Đã thêm sản phẩm thủ công vào danh sách!', 'success');
  };

  const handleDeleteRow = (index: number) => {
    const itemToDelete = filteredPriceData[index];
    if (!itemToDelete) return;

    setPriceData(prev => prev.filter(item => {
      return !(item.maSanPham === itemToDelete.maSanPham && 
               item.productCode === itemToDelete.productCode && 
               item.name === itemToDelete.name);
    }));
    showNotification('Đã xóa sản phẩm khỏi danh sách!', 'success');
  };

  const handlePriceChange = (index: number, field: 'originalPrice' | 'discountPrice', value: string) => {
    const itemToUpdate = filteredPriceData[index];
    if (!itemToUpdate) return;

    // Use a unique combination of fields to identify the item in the original priceData
    const numericValue = value.replace(/[^0-9]/g, '');
    const newValue = numericValue ? parseInt(numericValue, 10) : 0;
    
    setPriceData(prev => prev.map(item => {
      const matches = (item.maSanPham === itemToUpdate.maSanPham && 
                       item.productCode === itemToUpdate.productCode && 
                       item.name === itemToUpdate.name);
      if (matches) {
        return { ...item, [field]: newValue };
      }
      return item;
    }));
  };

  const handleQuickPrint = (style: string, layout: string) => {
    const finalLayout = (style === 'giovang' || style === 'display') ? '1' : layout;
    setPrintConfig({ style, layout: finalLayout, showPromoLabel: true });
    setIsPrintModalOpen(true);
  };

  const handlePrintStickerDirect = () => {
    setIsLayoutModalOpen(true);
  };

  const menuItems = [
    { id: 'sticker', label: 'STICKER', icon: Printer, color: 'text-blue-500' },
    { id: 'sticker-event', label: 'STICKER EVENT', icon: Printer, color: 'text-emerald-500' },
    { id: 'phan-ca-thang', label: 'PHÂN CA THÁNG', icon: Users, color: 'text-purple-500' },
    { id: 'phan-ca-tuan', label: 'PHÂN CA TUẦN', icon: UploadCloud, color: 'text-orange-500' },
    { id: 'bien-ban', label: 'BIÊN BẢN CÁC LOẠI', icon: FileText, color: 'text-rose-500' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {/* Top Header Section - Spans full width */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00965e] to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Wrench size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Tools Hỗ Trợ Công Việc</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#00965e] text-[9px] font-black uppercase tracking-widest">Quản Trị Viên</span>
                <span className="text-[10px] font-bold text-slate-400">Kho: {maKho || '43751'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-50 transition-all uppercase tracking-tighter">Đổi mật khẩu</button>
             <div className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><Info size={18} /></div>
             <button className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-black hover:bg-rose-100 transition-all uppercase tracking-tighter">Đăng Xuất</button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 p-8">
        {/* Left Vertical Navigation */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="flex flex-col gap-3 py-4 sticky top-[116px]">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white border-[#00965e] shadow-[0_15px_35px_-10px_rgba(0,150,94,0.15)] -translate-y-0.5 translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-emerald-50 ' + item.color : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[15px] font-black tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00965e] shadow-[0_0_10px_rgba(0,150,94,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area - Right Side */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'phan-ca-thang' && (
              <motion.div
                key="phan-ca-thang"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PhanCaTable />
              </motion.div>
            )}
            {activeTab === 'phan-ca-tuan' && (
              <motion.div
                key="phan-ca-tuan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PhanCaTuanTable />
              </motion.div>
            )}

            {(activeTab === 'sticker-event' || activeTab === 'sticker') && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
              {/* Left Column */}
              <div className="col-span-1 space-y-6">
                {activeTab === 'sticker-event' ? (
                  /* Card 1: Thông tin & Nhập dữ liệu */
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-700">Thông tin người in <span className="text-red-500">*</span></h3>
                      <button 
                        onClick={handleClearData}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-xs font-medium">Xóa dữ liệu</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      <span className="text-2xl font-black text-slate-800">43751</span>
                      <button className="text-sm text-blue-600 hover:underline">(Sửa)</button>
                    </div>

                    <div className="h-px bg-slate-100 w-full mb-6"></div>

                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-700">Nhập dữ liệu (Admin)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={inventoryInputRef}
                        onChange={(e) => handleFileUpload(e, 'inventory')}
                      />
                      <button 
                        onClick={() => inventoryInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all relative ${
                          inventoryFile || lastUpdateInventory
                            ? 'border-indigo-200 bg-indigo-50 text-indigo-700' 
                            : 'border-indigo-100 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        {inventoryFile || lastUpdateInventory ? <CheckCircle2 size={24} strokeWidth={1.5} className="text-indigo-500" /> : <Archive size={24} strokeWidth={1.5} />}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">{inventoryFile || lastUpdateInventory ? 'Đã tải Tồn Kho' : 'Tải Tồn Kho'}</div>
                          {lastUpdateInventory && !inventoryFile && <div className="text-[8px] font-bold text-indigo-400 mt-1">Cập nhật: {lastUpdateInventory}</div>}
                          {inventoryFile && <div className="text-[8px] font-bold text-indigo-400 mt-1 truncate max-w-[80px]">{inventoryFile.name}</div>}
                        </div>
                      </button>

                      <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={priceInputRef}
                        onChange={(e) => handleFileUpload(e, 'price')}
                      />
                      <button 
                        onClick={() => priceInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border border-dashed transition-all relative ${
                          priceFile || lastUpdatePrice
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-emerald-300 bg-emerald-50/30 text-emerald-600 hover:bg-emerald-50/50'
                        }`}
                      >
                        {priceFile || lastUpdatePrice ? <CheckCircle2 size={24} strokeWidth={1.5} className="text-emerald-500" /> : <FilePlus size={24} strokeWidth={1.5} />}
                        <div className="text-center">
                          <div className="text-[10px] font-black uppercase tracking-wider">{priceFile || lastUpdatePrice ? 'Đã tải Bảng Giá' : 'Tải Bảng Giá'}</div>
                          {lastUpdatePrice && !priceFile && <div className="text-[8px] font-bold text-emerald-500 mt-1">Cập nhật: {lastUpdatePrice}</div>}
                          {priceFile && <div className="text-[8px] font-bold text-emerald-500 mt-1 truncate max-w-[80px]">{priceFile.name}</div>}
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Card 2: Nhập thủ công */
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                          <FilePlus size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight">In Sticker Thủ Công</h3>
                      </div>
                      <button 
                        onClick={handleClearData}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                        <span className="text-xs font-medium">Xóa dữ liệu</span>
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Mã sản phẩm</label>
                          <input 
                            type="text"
                            placeholder="Mã SP..."
                            value={manualData.productCode}
                            onChange={(e) => setManualData(prev => ({ ...prev, productCode: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Tên sản phẩm</label>
                          <input 
                            type="text"
                            placeholder="Tên SP..."
                            value={manualData.name}
                            onChange={(e) => setManualData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Giá gốc</label>
                          <input 
                            type="text"
                            placeholder="Giá gốc..."
                            value={manualData.originalPrice}
                            onChange={(e) => setManualData(prev => ({ ...prev, originalPrice: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Giá sau giảm</label>
                          <input 
                            type="text"
                            placeholder="Giá giảm..."
                            value={manualData.discountPrice}
                            onChange={(e) => setManualData(prev => ({ ...prev, discountPrice: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          onClick={handleAddManualSticker}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <FilePlus size={14} />
                          THÊM VÀO LIST
                        </button>
                        
                        <label className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer">
                          <UploadCloud size={14} />
                          FILE EXCEL {'->'} LIST
                          <input 
                            type="file" 
                            className="hidden" 
                            accept=".xlsx, .xls"
                            onChange={(e) => {
                              handleFileUpload(e, 'price', true);
                              e.target.value = ''; // Reset to allow same file again
                            }}
                          />
                        </label>
                      </div>

                      <button
                        onClick={() => {
                          const templateData = [
                            {
                              'MÃ SẢN PHẨM': 'SP001',
                              'TÊN SẢN PHẨM': 'Ví dụ Tên Sản Phẩm',
                              'GIÁ GỐC': 1000000,
                              'GIÁ SAU GIẢM': 500000
                            }
                          ];
                          const worksheet = XLSX.utils.json_to_sheet(templateData);
                          const workbook = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(workbook, worksheet, 'StickerTemplate');
                          XLSX.writeFile(workbook, `Mau_In_Sticker_Event.xlsx`);
                          showNotification('Đã tải file Excel mẫu!', 'success');
                        }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                      >
                        <UploadCloud size={14} />
                        XUẤT FILE MẪU
                      </button>
                    </div>
                  </div>
                )}

                {/* Nút In Sticker */}
                <button
                  onClick={handlePrintStickerDirect}
                  disabled={combinedPriceData.length === 0 || selectedIndices.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-3xl text-base font-bold transition-colors shadow-sm"
                >
                  <Printer size={20} />
                  IN STICKER
                </button>
              </div>

              {/* Right Column */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">BỘ LỌC TỒN KHO</h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" 
                          checked={filters.onlyInventory}
                          onChange={(e) => setFilters(prev => ({ ...prev, onlyInventory: e.target.checked }))}
                        />
                        <span className="text-sm font-medium text-slate-600">Có trong tồn kho</span>
                      </label>
                    </div>
                    <button 
                      onClick={() => {
                        setFilters({ maSieuThi: '', nganhHang: '', nhomHang: '', onlyInventory: false, sortOrder: '' });
                        setPrintQuantity('');
                      }}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Ngành hàng</label>
                      <div className="relative">
                        <select 
                          value={filters.nganhHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nganhHang: e.target.value, nhomHang: '' }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Tất cả ngành hàng</option>
                          {uniqueNganhHang.map(nganh => (
                            <option key={nganh} value={nganh}>{nganh}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Nhóm hàng</label>
                      <div className="relative">
                        <select 
                          value={filters.nhomHang}
                          onChange={(e) => setFilters(prev => ({ ...prev, nhomHang: e.target.value }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Tất cả nhóm hàng</option>
                          {uniqueNhomHang.map(nhom => (
                            <option key={nhom} value={nhom}>{nhom}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Sắp xếp giá giảm</label>
                      <div className="relative">
                        <select 
                          value={filters.sortOrder}
                          onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value }))}
                          className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-2.5 pl-3 pr-10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Mặc định</option>
                          <option value="asc">Giá thấp đến cao</option>
                          <option value="desc">Giá cao đến thấp</option>
                        </select>
                        <ArrowUpDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500">Số lượng cần in</label>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          min="0"
                          max={filteredPriceData.length}
                          placeholder="VD: 5"
                          value={printQuantity}
                          onChange={(e) => setPrintQuantity(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <button 
                          onClick={() => {
                            const qty = parseInt(printQuantity);
                            if (!isNaN(qty) && qty >= 0) {
                              const count = Math.min(qty, filteredPriceData.length);
                              setSelectedIndices(Array.from({ length: count }, (_, i) => i));
                            }
                          }}
                          className="bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors shrink-0"
                        >
                          Chọn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Table or Instructions */}
                {priceData.length > 0 ? (
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <FilePlus size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">DỮ LIỆU BẢNG GIÁ</h3>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">Đã lọc {filteredPriceData.length} / {combinedPriceData.length} sản phẩm</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {saveMessage.text && (
                          <span className={`text-xs font-bold ${saveMessage.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {saveMessage.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="overflow-auto flex-1 p-0">
                      <table className="w-full text-left border-collapse border border-slate-200">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 shadow-sm">
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 w-10 text-center">
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                checked={filteredPriceData.length > 0 && selectedIndices.length === filteredPriceData.length}
                                onChange={handleSelectAll}
                              />
                            </th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">STT</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center">SL In</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Mã SP</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Tên sản phẩm</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Ngành hàng</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">Nhóm hàng</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36">Giá gốc</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-right w-36">Giá giảm</th>
                            <th className="py-3 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200 text-center w-10">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPriceData.map((item, index) => (
                            <tr key={index} className={`hover:bg-slate-50 transition-colors ${item.isManual ? 'bg-amber-50/30' : ''}`}>
                              <td className="py-3 px-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  checked={selectedIndices.includes(index)}
                                  onChange={() => handleSelectRow(index)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-500">{index + 1}</td>
                              <td className="py-3 px-4 text-center">
                                <input 
                                  type="number" 
                                  min="0"
                                  className="w-16 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                                  value={printQuantities[index] ?? 0}
                                  onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 0)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-indigo-600">{item.maSanPham || item.productCode || '-'}</td>
                              <td className="py-3 px-4 text-sm font-bold text-slate-800">{item.name}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600">{item.nganhHang || '-'}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600">{item.nhomHang || '-'}</td>
                              <td className="py-3 px-4 text-sm font-medium text-slate-600 text-right">
                                <input 
                                  type="text"
                                  className="w-32 bg-white border border-slate-200 text-slate-700 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  value={Number(item.originalPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                  onChange={(e) => handlePriceChange(index, 'originalPrice', e.target.value)}
                                />
                              </td>
                              <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">
                                <input 
                                  type="text"
                                  className="w-32 bg-white border border-slate-200 text-red-600 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                                  value={Number(item.discountPrice || 0).toLocaleString('vi-VN') + ' đ'}
                                  onChange={(e) => handlePriceChange(index, 'discountPrice', e.target.value)}
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button 
                                  onClick={() => handleDeleteRow(index)}
                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                  title="Xóa dòng này"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-indigo-100 p-6 md:p-8 relative overflow-hidden">
                    {/* Background subtle tint */}
                    <div className="absolute inset-0 bg-indigo-50/30 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-start gap-4 mb-8">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <Info size={24} className="text-indigo-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-800 tracking-tight">Hướng Dẫn Xuất File Giá Từ ERP</h2>
                          <p className="text-slate-500 mt-1">Làm theo các bước sau để thêm dữ liệu vào công cụ</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">1.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Truy cập: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">ERP {'>'} In bảng giá</span>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">2.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Ngành hàng: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Điện gia dụng, Dụng cụ nhà bếp,...</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">3.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Nhóm hàng: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Tất cả</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">4.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Vị trí trưng bày: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">2 - Kệ trưng bày</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">5.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Chọn Mẫu in: <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">81 - Bảng giá Gia Dụng - Phụ Kiện rút gọn...</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="text-indigo-600 font-black text-lg w-6 shrink-0">6.</span>
                          <div className="text-slate-700 font-medium pt-0.5">
                            Xuất file: Bấm nút <span className="font-bold">"In"</span>, sau đó chọn định dạng <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-mono text-sm font-bold tracking-tight">Excel Workbook Data - only (*.xlsx)</span>.
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 pt-6 border-t border-indigo-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Lưu ý quan trọng</h3>
                        <p className="text-sm text-slate-600">
                          Đảm bảo bạn đã chọn đúng siêu thị và ngành hàng trước khi xuất file để dữ liệu in ra được chính xác nhất.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'bien-ban' && (
            <motion.div
              key="bien-ban"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 min-h-[500px]"
            >
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileText size={24} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">BIÊN BẢN CÁC LOẠI</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => setIsBienBanModalOpen(true)}
                  className="flex flex-col items-center justify-center p-6 bg-white border-2 border-indigo-100 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-100/50 rounded-2xl transition-all cursor-pointer group"
                >
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 text-center uppercase">Biên bản Tình Trạng Hàng Hóa</h3>
                  <p className="text-slate-500 text-sm text-center mt-2">Dùng khi ghi nhận tình trạng hàng hóa, in A4 ngang</p>
                </button>
              </div>
            </motion.div>
          )}


          </AnimatePresence>
        </div>
      </div>

      <BienBanTinhTrangHangHoa 
        isOpen={isBienBanModalOpen}
        onClose={() => setIsBienBanModalOpen(false)}
      />

      <PrintLayoutModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        onConfirm={(style, layout, showPromoLabel) => {
          setPrintConfig({ style, layout, showPromoLabel });
          setIsLayoutModalOpen(false);
          setIsPrintModalOpen(true);
        }}
      />

      <StickerPrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        data={filteredPriceData.flatMap((item, index) => {
          const isSelected = selectedIndices.length === 0 || selectedIndices.includes(index);
          const quantity = printQuantities[index] || 1;
          return isSelected && quantity > 0 ? Array(quantity).fill(item) : [];
        })} 
        config={printConfig}
      />
    </div>
  );
}
