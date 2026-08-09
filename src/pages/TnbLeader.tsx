import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Download, Database, LayoutGrid, Search, AlertCircle, Save, CheckCircle2, MessageSquare, AlertTriangle, Globe, Store, Zap, TrendingUp, Filter, Settings, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { supabase } from '../supabaseClient';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { cn } from './RTST/utils';
// Parser to handle CSV lines containing quotes
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

export default function TnbLeader({ pageMaintenanceState = {}, isUser43751Local = false }: { pageMaintenanceState?: Record<string, boolean>, isUser43751Local?: boolean }) {
  const { userProfile } = useAuth();
  const { showNotification } = useNotification();
  
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataVungPivot, setDataVungPivot] = useState<any[]>([]);
  const [dataSieuThiPivot, setDataSieuThiPivot] = useState<any[]>([]);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const rtTableRef = useRef<HTMLDivElement>(null);
  const lkTableRef = useRef<HTMLDivElement>(null);
  const chiTietTableRef = useRef<HTMLDivElement>(null);
  const xepHangTableRef = useRef<HTMLDivElement>(null);
  const khoTableRef = useRef<HTMLDivElement>(null);
  const tgdTableRef = useRef<HTMLDivElement>(null);
  const dmxTableRef = useRef<HTMLDivElement>(null);
  const vungScorecardRef = useRef<HTMLDivElement>(null);
  
  const exportImage = async (customRef?: React.RefObject<HTMLDivElement> | any) => {
    const targetRef = (customRef && customRef.current) ? customRef : tableRef;
    if (targetRef.current) {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        showNotification('Đang tạo ảnh, vui lòng đợi...', 'info');
        
        // Temporarily hide scrollbars and export buttons for cleaner export
        const styleEl = document.createElement('style');
        styleEl.id = 'hide-scrollbar-temp';
        styleEl.innerHTML = `
          *::-webkit-scrollbar { display: none !important; }
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          .export-btn { display: none !important; }
        `;
        document.head.appendChild(styleEl);

        // Temporarily expand the container and add white margin/padding
        const originalWidth = targetRef.current.style.width;
        const originalHeight = targetRef.current.style.height;
        const originalMaxHeight = targetRef.current.style.maxHeight;
        const originalOverflow = targetRef.current.style.overflow;
        const originalPosition = targetRef.current.style.position;
        const originalPadding = targetRef.current.style.padding;
        const originalBg = targetRef.current.style.backgroundColor;
        const originalDisplay = targetRef.current.style.display;

        targetRef.current.style.width = 'max-content';
        targetRef.current.style.height = 'max-content';
        targetRef.current.style.maxHeight = 'none';
        targetRef.current.style.overflow = 'hidden';
        targetRef.current.style.position = 'relative';
        targetRef.current.style.padding = '32px'; // Perfect equal 32px padding on all sides
        targetRef.current.style.backgroundColor = '#ffffff';
        targetRef.current.style.display = 'inline-block';
        
        // Give DOM time to update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const imgData = await htmlToImage.toPng(targetRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            overflow: 'hidden'
          }
        });
        
        // Restore style
        targetRef.current.style.width = originalWidth;
        targetRef.current.style.height = originalHeight;
        targetRef.current.style.maxHeight = originalMaxHeight;
        targetRef.current.style.overflow = originalOverflow;
        targetRef.current.style.position = originalPosition;
        targetRef.current.style.padding = originalPadding;
        targetRef.current.style.backgroundColor = originalBg;
        targetRef.current.style.display = originalDisplay;
        
        setPreviewImage(imgData);
        showNotification('Tạo ảnh thành công!', 'success');
      } catch (err) {
        console.error('Lỗi khi tạo ảnh:', err);
        showNotification('Lỗi khi xuất ảnh', 'error');
      } finally {
        document.getElementById('hide-scrollbar-temp')?.remove();
        setIsExporting(false);
      }
    }
  };

  const exportImageShort = async (customRef?: React.RefObject<HTMLDivElement> | any) => {
    const targetRef = (customRef && customRef.current) ? customRef : tableRef;
    if (targetRef.current) {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        showNotification('Đang tạo ảnh rút gọn, vui lòng đợi...', 'info');
        
        // Temporarily hide scrollbars and export buttons for cleaner export
        const styleEl = document.createElement('style');
        styleEl.id = 'hide-scrollbar-temp';
        styleEl.innerHTML = `
          *::-webkit-scrollbar { display: none !important; }
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          .export-btn { display: none !important; }
        `;
        document.head.appendChild(styleEl);
        
        targetRef.current.classList.add('export-short-mode');
        const originalWidth = targetRef.current.style.width;
        const originalHeight = targetRef.current.style.height;
        const originalMaxHeight = targetRef.current.style.maxHeight;
        const originalOverflow = targetRef.current.style.overflow;
        const originalPosition = targetRef.current.style.position;
        const originalPadding = targetRef.current.style.padding;
        const originalBg = targetRef.current.style.backgroundColor;
        const originalDisplay = targetRef.current.style.display;

        targetRef.current.style.width = 'max-content';
        targetRef.current.style.height = 'max-content';
        targetRef.current.style.maxHeight = 'none';
        targetRef.current.style.overflow = 'hidden';
        targetRef.current.style.position = 'relative';
        targetRef.current.style.padding = '32px'; // Perfect equal 32px padding on all sides
        targetRef.current.style.backgroundColor = '#ffffff';
        targetRef.current.style.display = 'inline-block';
        
        // Give DOM time to update
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const imgData = await htmlToImage.toPng(targetRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left',
            overflow: 'hidden'
          }
        });
        
        targetRef.current.style.width = originalWidth;
        targetRef.current.style.height = originalHeight;
        targetRef.current.style.maxHeight = originalMaxHeight;
        targetRef.current.style.overflow = originalOverflow;
        targetRef.current.style.position = originalPosition;
        targetRef.current.style.padding = originalPadding;
        targetRef.current.style.backgroundColor = originalBg;
        targetRef.current.style.display = originalDisplay;
        targetRef.current.classList.remove('export-short-mode');
        
        setPreviewImage(imgData);
        showNotification('Tạo ảnh rút gọn thành công!', 'success');
      } catch (err) {
        console.error('Lỗi khi tạo ảnh rút gọn:', err);
        showNotification('Lỗi khi xuất ảnh rút gọn', 'error');
      } finally {
        document.getElementById('hide-scrollbar-temp')?.remove();
        setIsExporting(false);
      }
    }
  };
  
  const [dataRtSieuThi, setDataRtSieuThi] = useState<any[]>([]);
  const [headersRtSieuThi, setHeadersRtSieuThi] = useState<string[]>([]);
  const [dataLkSieuThi, setDataLkSieuThi] = useState<any[]>([]);
  const [headersLkSieuThi, setHeadersLkSieuThi] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<'VUNG' | 'SIEU_THI' | 'RT_SIEU_THI' | 'LK_SIEU_THI' | 'CAU_HINH'>('VUNG');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [dbHash, setDbHash] = useState<string | null>(null);
  const [tnbDataMode, setTnbDataMode] = useState<'realtime' | 'luyke'>('realtime');
  const searchedRowsRef = useRef<any[]>([]);

  // Category Configuration State
  const [categoryConfig, setCategoryConfig] = useState<{name: string, group: string}[]>([]);
  const [categoryConfigText, setCategoryConfigText] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<{name: string, group: string}[]>([]);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app_settings', 'TNB_LEADER_DATA'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categories && Array.isArray(data.categories)) {
          setCategoryConfig(data.categories);
          setPreviewConfig(data.categories);
          const text = data.categories.map((c: any) => `${c.name}\t${c.group}`).join('\n');
          setCategoryConfigText(text);
        }
      } else {
        const DEFAULT_CATEGORIES = [
          { name: 'ĐIỆN THOẠI & TABLET ANDROID', group: 'ICT' },
          { name: 'Điện thoại Realme', group: 'ICT' },
          { name: 'Điện thoại Vivo', group: 'ICT' },
          { name: 'Đồng hồ - Phụ kiện', group: 'ICT' },
          { name: 'DOANH THU ĐỒNG HỒ', group: 'ICT' },
          { name: 'Loa', group: 'ICT' },
          { name: 'Laptop', group: 'ICT' },
          { name: 'Camera', group: 'ICT' },
          { name: 'Sim Tổng', group: 'DỊCH VỤ' },
          { name: 'SIM MOBIFONE&VINAPHONE&SIM DMX', group: 'DỊCH VỤ' },
          { name: 'BẢO HIỂM', group: 'DỊCH VỤ' },
          { name: 'BẢO HIỂM THỢ ĐIỆN MÁY XANH', group: 'DỊCH VỤ' },
          { name: 'TRẢ CHẬM HOMECREDIT', group: 'DỊCH VỤ' },
          { name: 'FECREDIT, SHINHAN, SAMSUNG FINANCE+', group: 'DỊCH VỤ' },
          { name: 'TRẢ CHẬM ĐIỆN MÁY VÀ GIA DỤNG', group: 'DỊCH VỤ' },
          { name: 'Ví trả sau', group: 'DỊCH VỤ' },
          { name: 'Cho vay tiền mặt', group: 'DỊCH VỤ' },
          { name: 'Dịch vụ VAS', group: 'DỊCH VỤ' },
          { name: 'NẠP RÚT TIỀN TÀI KHOẢN NGÂN HÀNG THÁNG 07/2026', group: 'DỊCH VỤ' },
          { name: 'MANGO PLUS + ICALLME', group: 'DỊCH VỤ' },
          { name: 'MỞ THẺ TÍN DỤNG TPBANK EVO VÀ VPBANK MWG', group: 'DỊCH VỤ' },
          { name: 'HISENSE', group: 'CE' },
          { name: 'Điện tử', group: 'CE' },
          { name: 'Điện tử Samsung', group: 'CE' },
          { name: 'MÁY GIẶT', group: 'CE' },
          { name: 'MÁY SẤY & MÁY RỬA CHÉN', group: 'CE' },
          { name: 'CE HÃNG HAIER + MÁY LẠNH AQUA', group: 'CE' },
          { name: 'Máy lạnh Casper', group: 'CE' },
          { name: 'Máy Lạnh NAGAKAWA', group: 'CE' },
          { name: 'ĐIỆN TỬ & ĐIỆN LẠNH, ĐIỆN GIA DỤNG HÃNG LG', group: 'CE' },
          { name: 'ĐẶC QUYỀN MÁY GIẶT -TỦ LẠNH -MÁY LẠNH SAMSUNG', group: 'CE' },
          { name: 'TỦ LẠNH, TỦ ĐÔNG, TỦ MÁT', group: 'CE' },
          { name: 'Máy Lọc Nước', group: 'CE' },
          { name: 'Nồi cơm', group: 'CE' },
          { name: 'Quạt gió', group: 'CE' },
          { name: 'MÁY LỌC KHÔNG KHÍ - HÚT ẨM - HÚT BỤI', group: 'CE' }
        ];
        setCategoryConfig(DEFAULT_CATEGORIES);
        setPreviewConfig(DEFAULT_CATEGORIES);
        setCategoryConfigText(DEFAULT_CATEGORIES.map(c => `${c.name}\t${c.group}`).join('\n'));
      }
    });
    return () => unsub();
  }, []);

  const handleViewAndGroup = () => {
    const lines = categoryConfigText.split('\n').filter(line => line.trim());
    const newConfig: {name: string, group: string}[] = [];
    lines.forEach(line => {
      // First try to split by tab
      if (line.includes('\t')) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          let groupRaw = parts[1].trim().toUpperCase();
          let group = 'CE';
          if (groupRaw.includes('ICT')) group = 'ICT';
          else if (groupRaw.includes('DỊCH VỤ') || groupRaw.includes('DICH VU') || groupRaw === 'DV') group = 'DỊCH VỤ';
          else group = 'CE';
          if (name) newConfig.push({ name, group });
          return;
        }
      }
      
      // If no tab, parse by trailing keyword separated by space
      const upperLine = line.toUpperCase();
      let group = 'CE';
      let name = line.trim();
      
      if (upperLine.endsWith(' ICT')) {
        group = 'ICT';
        name = line.substring(0, line.length - 4).trim();
      } else if (upperLine.endsWith(' DỊCH VỤ')) {
        group = 'DỊCH VỤ';
        name = line.substring(0, line.length - 8).trim();
      } else if (upperLine.endsWith(' DICH VU')) {
        group = 'DỊCH VỤ';
        name = line.substring(0, line.length - 8).trim();
      } else if (upperLine.endsWith(' DV')) {
        group = 'DỊCH VỤ';
        name = line.substring(0, line.length - 3).trim();
      } else if (upperLine.endsWith(' CE')) {
        group = 'CE';
        name = line.substring(0, line.length - 3).trim();
      } else {
        const existing = categoryConfig.find(c => c.name === line.trim());
        group = existing ? existing.group : 'CE';
      }
      
      if (name) newConfig.push({ name, group });
    });
    
    // Grouping
    const ict = newConfig.filter(c => c.group === 'ICT');
    const dv = newConfig.filter(c => c.group === 'DỊCH VỤ');
    const ce = newConfig.filter(c => c.group === 'CE');
    
    setPreviewConfig([...ict, ...dv, ...ce]);
  };

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const _previewConfig = [...previewConfig];
      const draggedItemContent = _previewConfig.splice(dragItem.current, 1)[0];
      _previewConfig.splice(dragOverItem.current, 0, draggedItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setPreviewConfig(_previewConfig);
    }
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const _previewConfig = [...previewConfig];
    const temp = _previewConfig[index - 1];
    _previewConfig[index - 1] = _previewConfig[index];
    _previewConfig[index] = temp;
    setPreviewConfig(_previewConfig);
  };

  const moveItemDown = (index: number) => {
    if (index === previewConfig.length - 1) return;
    const _previewConfig = [...previewConfig];
    const temp = _previewConfig[index + 1];
    _previewConfig[index + 1] = _previewConfig[index];
    _previewConfig[index] = temp;
    setPreviewConfig(_previewConfig);
  };

  const handleSaveCategoryConfig = async () => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'app_settings', 'TNB_LEADER_DATA'), { categories: previewConfig }, { merge: true });
      showNotification('Lưu cấu hình ngành hàng thành công!', 'success');
    } catch (error) {
      console.error('Error saving config:', error);
      showNotification('Lỗi khi lưu cấu hình. Vui lòng thử lại!', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCopyNhanXet = () => {
    const rows = searchedRowsRef.current || [];
    const under50 = rows.filter(r => r.tyLe < 50);
    if (under50.length === 0) {
      showNotification('Không có siêu thị nào tỷ lệ dưới 50% trong danh sách hiện tại!', 'error');
      return;
    }
    
    let text = '🚨 DANH SÁCH SIÊU THỊ CÓ TỶ LỆ DƯỚI 50%:\n\n';
    
    const userIds = under50.map(r => {
      const bossParts = (r.boss || '').split('_');
      return bossParts.length > 1 ? bossParts[bossParts.length - 1] : r.boss;
    }).filter(id => id);
    
    const uniqueUserIds = Array.from(new Set(userIds));
    text += uniqueUserIds.map(id => `@${id}`).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Đã copy danh sách nhận xét vào khay nhớ tạm!', 'success');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      showNotification('Không thể copy text, vui lòng thử lại.', 'error');
    });
  };

  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  
  const getStoreKey = (key: string) => `${key}_${userProfile?.ten_sieu_thi || 'default'}`;

  const [sieuThiFilterTinh, setSieuThiFilterTinh] = useState<string>(() => {
    return localStorage.getItem(getStoreKey('tnb_leader_filter_tinh')) || '';
  });
  
  const [sieuThiFilterKenh, setSieuThiFilterKenh] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getStoreKey('tnb_leader_filter_kenh'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [sieuThiFilterNganhHangList, setSieuThiFilterNganhHangList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getStoreKey('tnb_leader_filter_nganhhang'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isNganhHangDropdownOpen, setIsNganhHangDropdownOpen] = useState(false);

  const [sieuThiFilterNhomList, setSieuThiFilterNhomList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(getStoreKey('tnb_leader_filter_nhom'));
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isNhomDropdownOpen, setIsNhomDropdownOpen] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  
  // Custom Realtime Table filters
  const [rtFilterTinh, setRtFilterTinh] = useState<string>('');
  const [rtFilterKenh, setRtFilterKenh] = useState<string[]>([]);
  const [rtFilterNganhHang, setRtFilterNganhHang] = useState<string>('');
  const [rtFilterKenhXepHang, setRtFilterKenhXepHang] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rtFilterKenhXepHang');
      return saved ? JSON.parse(saved) : ['ĐML'];
    } catch {
      return ['ĐML'];
    }
  });

  useEffect(() => {
    localStorage.setItem('rtFilterKenhXepHang', JSON.stringify(rtFilterKenhXepHang));
  }, [rtFilterKenhXepHang]);
  const [rtFilterTinhXepHang, setRtFilterTinhXepHang] = useState<string>('');
  const [rtKhoFilterNganhHang, setRtKhoFilterNganhHang] = useState<string>(() => {
    try {
      return localStorage.getItem('rtKhoFilterNganhHang') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    localStorage.setItem('rtKhoFilterNganhHang', rtKhoFilterNganhHang);
  }, [rtKhoFilterNganhHang]);

  // Save filters whenever they change
  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_tinh'), sieuThiFilterTinh);
  }, [sieuThiFilterTinh, userProfile?.ten_sieu_thi]);

  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_kenh'), JSON.stringify(sieuThiFilterKenh));
  }, [sieuThiFilterKenh, userProfile?.ten_sieu_thi]);

  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_nganhhang'), JSON.stringify(sieuThiFilterNganhHangList));
  }, [sieuThiFilterNganhHangList, userProfile?.ten_sieu_thi]);

  useEffect(() => {
    localStorage.setItem(getStoreKey('tnb_leader_filter_nhom'), JSON.stringify(sieuThiFilterNhomList));
  }, [sieuThiFilterNhomList, userProfile?.ten_sieu_thi]);

  const [firebaseFiltersLoaded, setFirebaseFiltersLoaded] = useState(false);

  // Load filters from Firebase
  useEffect(() => {
    const loadFilters = async () => {
      if (!userProfile?.username || firebaseFiltersLoaded) return;
      try {
        const docRef = doc(db, 'user_filters', `${userProfile.username}_tnbleader`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.rtFilterTinh !== undefined) setRtFilterTinh(data.rtFilterTinh);
          if (data.rtFilterKenh !== undefined) setRtFilterKenh(Array.isArray(data.rtFilterKenh) ? data.rtFilterKenh : (data.rtFilterKenh ? [data.rtFilterKenh] : []));
          if (data.rtFilterNganhHang !== undefined) setRtFilterNganhHang(data.rtFilterNganhHang);
          
          if (data.sieuThiFilterTinh !== undefined) setSieuThiFilterTinh(data.sieuThiFilterTinh);
          if (data.sieuThiFilterKenh !== undefined) setSieuThiFilterKenh(data.sieuThiFilterKenh);
        }
      } catch (error) {
        console.error("Error loading filters from Firebase:", error);
      } finally {
        setFirebaseFiltersLoaded(true);
      }
    };
    loadFilters();
  }, [userProfile?.username, firebaseFiltersLoaded]);

  // Save filters to Firebase whenever they change
  useEffect(() => {
    const saveFilters = async () => {
      if (!userProfile?.username || !firebaseFiltersLoaded) return;
      try {
        const docRef = doc(db, 'user_filters', `${userProfile.username}_tnbleader`);
        await setDoc(docRef, {
          rtFilterTinh,
          rtFilterKenh,
          rtFilterNganhHang,
          sieuThiFilterTinh,
          sieuThiFilterKenh,
          sieuThiFilterNganhHangList,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving filters to Firebase:", error);
      }
    };
    
    const timeoutId = setTimeout(() => {
      saveFilters();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [rtFilterTinh, rtFilterKenh, rtFilterNganhHang, sieuThiFilterTinh, sieuThiFilterKenh, sieuThiFilterNganhHangList, userProfile?.username, firebaseFiltersLoaded]);

  const isUser43751 = String(userProfile?.username || '').trim() === '43751' || 
                      String(userProfile?.ma_nhan_vien || '').trim() === '43751' || 
                      String(userProfile?.user_id || '').trim() === '43751';

  const dataLkSieuThiMapped = useMemo(() => {
    return dataLkSieuThi.map(row => {
      // row in dataLkSieuThi is parsed from the Google Sheet tab "data SIÊU THỊ" using lkSTCols ['B','C','D','E','F','G','H','K','L','M','R']:
      // row[0] = Tỉnh (Cột B / Cột 1) -> "An Giang"
      // row[2] = Luỹ Kế (Cột D / Cột 3) -> "7.79"
      // row[3] = Target (Cột E / Cột 4) -> "11.75"
      // row[5] = %HT Dự kiến (Cột G / Cột 6) -> "562.90%"
      // row[7] = Siêu thị (Cột K / Cột 10) -> "ĐMS_AGI_TTO - Lương An Trà"
      // row[8] = Kênh (Cột L / Cột 11) -> "ĐMS"
      // row[9] = BOSS (Cột M / Cột 12) -> "Em_12214"
      // row[10] = Ngành Hàng (Cột R / Cột 17) -> "Nồi cơm"
      const virtualRow = [];
      virtualRow[0] = (row[0] || '').normalize('NFC'); // Tỉnh (Cột 1)
      virtualRow[1] = '';
      virtualRow[2] = row[2] || ''; // Luỹ Kế (Cột 3)
      virtualRow[3] = row[3] || ''; // Target (Cột 4)
      virtualRow[4] = row[5] || ''; // %HT Dự kiến (Cột 6)
      virtualRow[5] = (row[8] || '').normalize('NFC'); // Kênh (Cột 11)
      virtualRow[6] = (row[7] || '').normalize('NFC'); // Siêu thị (Cột 10)
      virtualRow[7] = (row[8] || '').normalize('NFC'); // Kênh (Cột 11)
      virtualRow[8] = (row[9] || '').normalize('NFC'); // BOSS (Cột 12)
      
      let nganhHang = (row[10] || '').trim().toUpperCase().normalize('NFC');
      if (nganhHang === 'B.HIỂM TTB') {
        nganhHang = 'BẢO HIỂM';
      }
      virtualRow[9] = nganhHang; // Ngành Hàng (Cột 17)
      
      return virtualRow;
    });
  }, [dataLkSieuThi]);

  const isUser7611 = String(userProfile?.username || '').trim() === '7611' || 
                     String(userProfile?.ma_nhan_vien || '').trim() === '7611' || 
                     String(userProfile?.user_id || '').trim() === '7611';

  useEffect(() => {
    if (isUser7611) {
      setActiveTab('SIEU_THI');
    }
  }, [isUser7611]);

  // Load initial data from Supabase
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const cacheKey = 'TNB_LEADER_DATA_CACHE';
        const cachedStr = localStorage.getItem(cacheKey);
        let cachedData = null;
        
        if (cachedStr) {
          try {
            const parsed = JSON.parse(cachedStr);
            // Bỏ luôn vụ check 5 phút vì ta luôn gọi fetchDataFromUrl để lấy data mới từ Google Sheet
            cachedData = parsed.data;
          } catch (e) {}
        }

        let dbData = cachedData;

        if (!dbData) {
          const { data, error } = await supabase
            .from('store')
            .select('updated_at, sticker_lk_price_data, sticker_ce_price_data')
            .eq('id', 'TNB_LEADER_DATA')
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error loading TNB Leader data:', error);
            return;
          }
          dbData = data;
          
          if (dbData) {
            localStorage.setItem(cacheKey, JSON.stringify({
              data: dbData,
              timestamp: Date.now()
            }));
          }
        }

        if (dbData && dbData.sticker_lk_price_data) {
          if (isMounted) {
            setSheetUrl(dbData.sticker_lk_price_data);
            setLastSync(dbData.updated_at);
            setDbHash(dbData.sticker_ce_price_data);
            // Auto-fetch data from URL
            fetchDataFromUrl(dbData.sticker_lk_price_data, dbData.sticker_ce_price_data, dbData.updated_at);
          }
        }
      } catch (err) {
        console.error('Failed to load TNB Leader data:', err);
      }
    };
    
    loadData();
    return () => { isMounted = false; };
  }, []);

  // Helper: convert column letter (A, B, ..., Z, AA, AB, ...) to 0-based index
  const colLetterToIndex = (col: string): number => {
    let idx = 0;
    for (let i = 0; i < col.length; i++) {
      idx = idx * 26 + (col.charCodeAt(i) - 64);
    }
    return idx - 1; // 0-based
  };

  // Helper: extract specific columns from parsed data
  const extractColumns = (allHeaders: string[], allData: string[][], colIndices: number[]) => {
    const data = allData.map(row => colIndices.map(i => row[i] || ''));
    return { headers: colIndices.map(i => allHeaders[i] || ''), data };
  };

  const fetchDataFromUrl = async (url: string, currentHash?: string | null, currentLastSync?: string | null) => {
    const sheetId = extractSheetId(url);
    if (!sheetId) return;

    setIsSyncing(true);
    try {
      // Only fetch 1 sheet: "data SIÊU THỊ"
      const resSieuThi = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('data SIÊU THỊ')}`);



      // --- Sheet "data SIÊU THỊ" ---
      if (resSieuThi.ok) {
        const csvST = await resSieuThi.text();
        const newHash = hashString(csvST);
        
        // 1. If we have a known previous hash and it changed
        const isDataChanged = typeof currentHash === 'string' && newHash !== currentHash;
        // 2. If we don't have a known hash (first time setup) for any user
        const isFirstSetup = !currentHash;
        // 3. If we don't have a time for some reason (e.g. old cache or string 'null')
        let actualLastSync = currentLastSync !== undefined ? currentLastSync : lastSync;
        if (actualLastSync === 'null' || actualLastSync === 'undefined') actualLastSync = null;
        
        let isValidDate = false;
        if (actualLastSync) {
          const d = new Date(String(actualLastSync).includes('T') ? String(actualLastSync) : String(actualLastSync).replace(' ', 'T'));
          isValidDate = !isNaN(d.getTime());
        }
        const isMissingTime = !actualLastSync || !isValidDate;

        if (isDataChanged || isFirstSetup || isMissingTime) {
          let newTime = new Date().toISOString();
          
          // Only update the time to NOW if data changed OR if we are completely missing a time
          if (isDataChanged || isMissingTime) {
            setLastSync(newTime);
          } else {
            // Keep the old time if we are just initializing the hash but a time already exists
            newTime = typeof actualLastSync === 'string' ? actualLastSync : newTime;
          }

          if (isUser43751) {
            const record = {
              id: 'TNB_LEADER_DATA',
              ten_sieu_thi: 'Dữ liệu TNB Leader URL',
              warehouse_code: 'GLOBAL',
              sticker_ce_price_data: newHash,
              sticker_lk_price_data: url, 
              updated_by: userProfile?.username || 'unknown',
              updated_at: newTime
            };
            // Upsert in background, ignore error
            supabase.from('store').upsert(record, { onConflict: 'id' }).then().catch(e => console.error(e));
          }
          
          // Save to local cache to ensure it persists on reload even if DB fails
          localStorage.setItem('TNB_LEADER_DATA_CACHE', JSON.stringify({
            data: {
              sticker_ce_price_data: newHash,
              sticker_lk_price_data: url,
              updated_at: newTime
            },
            timestamp: Date.now()
          }));
          
          setDbHash(newHash);
        } else if (!currentHash) {
          // If non-admin and first load, just initialize the local state
          setDbHash(newHash);
        }
        
        const parsed = csvST.split('\n').filter(l => l.trim()).map(line => parseCSVLine(line).map(cell => cell.trim()));
        if (parsed.length > 0) {
          const allHeaders = parsed[0];
          const allData = parsed.slice(1);

          // REALTIME SIÊU THỊ: Cột U,V,W,X,Y,Z,AB,AC,AD,AG
          const rtSTCols = ['U','V','W','X','Y','Z','AB','AC','AD','AG'].map(colLetterToIndex);
          const rtST = extractColumns(allHeaders, allData, rtSTCols);
          setHeadersRtSieuThi(rtST.headers);
          setDataRtSieuThi(rtST.data);

          // LUỸ KẾ SIÊU THỊ: Cột B,C,D,E,F,G,H,K,L,M,R
          const lkSTCols = ['B','C','D','E','F','G','H','K','L','M','R'].map(colLetterToIndex);
          const lkST = extractColumns(allHeaders, allData, lkSTCols);
          setHeadersLkSieuThi(lkST.headers);
          setDataLkSieuThi(lkST.data);



          // VÙNG PIVOT: Cột B (Tỉnh), D (DTLK), E (TARGET), L (Brand), R (Ngành Hàng)
          const vungCols = ['B', 'D', 'E', 'L', 'R'].map(colLetterToIndex);
          const vungPivot = extractColumns(allHeaders, allData, vungCols);
          setDataVungPivot(vungPivot.data);

          // SIÊU THỊ PIVOT: Cột C (Siêu thị), D (DTLK), E (TARGET), L (Brand), R (Ngành Hàng)
          const stCols = ['C', 'D', 'E', 'L', 'R'].map(colLetterToIndex);
          const stPivot = extractColumns(allHeaders, allData, stCols);
          setDataSieuThiPivot(stPivot.data);
        }
      }
    } catch (e) {
      console.error('Auto fetch error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/(.*?)(\/|$)/);
    return match ? match[1] : null;
  };

  const handleSync = async () => {
    if (!sheetUrl) {
      showNotification('Vui lòng nhập link Google Sheet', 'error');
      return;
    }

    const sheetId = extractSheetId(sheetUrl);

    if (!sheetId) {
      showNotification('Link Google Sheet không hợp lệ', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      if (isUser43751 && dbHash === null) {
        // First time initialization if dbHash is missing
        const record = {
          id: 'TNB_LEADER_DATA',
          ten_sieu_thi: 'Dữ liệu TNB Leader URL',
          warehouse_code: 'GLOBAL',
          sticker_ce_price_data: dbHash,
          sticker_lk_price_data: sheetUrl, 
          updated_by: userProfile?.username || 'unknown',
          updated_at: new Date().toISOString()
        };
        await supabase.from('store').upsert(record, { onConflict: 'id' });
      }
      
      setCurrentPage(1);
      await fetchDataFromUrl(sheetUrl, dbHash, lastSync);

      // Notifications are handled inside fetchDataFromUrl now
    } catch (err: any) {
      console.error('Sync Error:', err);
      showNotification('Đồng bộ thất bại: ' + (err.message || 'Lỗi không xác định'), 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const currentData = useMemo(() => {
    if (activeTab === 'RT_SIEU_THI') return dataRtSieuThi;
    if (activeTab === 'LK_SIEU_THI') return dataLkSieuThi;
    return [];
  }, [activeTab, dataRtSieuThi, dataLkSieuThi]);

  const currentHeaders = useMemo(() => {
    if (activeTab === 'RT_SIEU_THI') return headersRtSieuThi;
    if (activeTab === 'LK_SIEU_THI') return headersLkSieuThi;
    return [];
  }, [activeTab, headersRtSieuThi, headersLkSieuThi]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return currentData;
    const lowerSearch = searchTerm.toLowerCase();
    return currentData.filter(row => 
      row.some((cell: string) => (cell || '').toLowerCase().includes(lowerSearch))
    );
  }, [currentData, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  if (pageMaintenanceState['tnbleader'] && !isUser43751Local) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-6">
        <div className="bg-white rounded-3xl p-12 max-w-lg text-center border border-amber-200 shadow-xl w-full">
          <div className="w-24 h-24 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
            <AlertCircle size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-widest mb-4">HỆ THỐNG ĐANG BẢO TRÌ</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Trang này đang trong quá trình bảo trì và nâng cấp. Xin lỗi vì sự bất tiện này!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-y-auto">
      <div className="p-4 md:p-6 lg:px-4 lg:py-8 max-w-[1920px] mx-auto w-full space-y-6">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner shrink-0">
              <Database size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">TNB LEADER</h1>
              <p className="text-slate-500 font-medium mt-1">Dữ liệu nội bộ từ Google Sheet</p>
              <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => setTnbDataMode('realtime')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all duration-300 ${
                      tnbDataMode === 'realtime'
                        ? 'bg-indigo-100 border-indigo-400 text-indigo-800 shadow-md scale-105 font-black ring-2 ring-offset-1 ring-indigo-300'
                        : 'bg-indigo-50/70 border-indigo-200 text-indigo-700 font-bold hover:scale-105 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Zap size={18} strokeWidth={2.5} />
                    <span className="text-[15px] tracking-wide whitespace-nowrap">REALTIME</span>
                  </button>
                  <button
                    onClick={() => setTnbDataMode('luyke')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all duration-300 ${
                      tnbDataMode === 'luyke'
                        ? 'bg-violet-100 border-violet-400 text-violet-800 shadow-md scale-105 font-black ring-2 ring-offset-1 ring-violet-300'
                        : 'bg-violet-50/70 border-violet-200 text-violet-700 font-bold hover:scale-105 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <TrendingUp size={18} strokeWidth={2.5} />
                    <span className="text-[15px] tracking-wide whitespace-nowrap">LUỸ KẾ</span>
                  </button>
                </div>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center w-full overflow-hidden">
            {(() => {
              let timeText = "ĐANG TẢI DỮ LIỆU TỪ GOOGLE SHEET...";
              if (lastSync) {
                const syncStr = String(lastSync);
                const safeDateStr = syncStr.includes('T') ? syncStr : syncStr.replace(' ', 'T');
                const d = new Date(safeDateStr);
                if (!isNaN(d.getTime())) {
                  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const dateStr = d.toLocaleDateString('vi-VN');
                  timeText = `DỮ LIỆU ĐÃ ĐƯỢC CẬP NHẬT TỪ GOOGLE SHEET VÀO LÚC ${timeStr} NGÀY ${dateStr}`;
                } else {
                  timeText = `DỮ LIỆU TỪ GOOGLE SHEET (Lỗi ngày: ${syncStr})`;
                }
              }

              return (
                <div className="bg-emerald-500 text-white font-normal px-5 py-3 rounded-xl shadow-md shadow-emerald-500/20 text-[15px] flex items-center gap-2 text-center whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  <CheckCircle2 size={18} className="shrink-0" />
                  {timeText}
                </div>
              );
            })()}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 shrink-0">

            {isUser43751 && (
              <div className="flex w-full lg:w-auto flex-col gap-2">
                <input 
                  type="text" 
                  placeholder="Nhập link Google Sheet (Public CSV)..." 
                  className="w-full sm:w-[200px] px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 text-[15px]"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
              </div>
            )}
            
            {(isUser43751 || sheetUrl) && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <Download size={20} />
                )}
                <span className="whitespace-nowrap">CẬP NHẬT DATA MỚI</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex w-full overflow-x-auto hide-scrollbar py-4 px-2 gap-3 items-center">
          {[
            { 
              id: 'VUNG', 
              label: 'VÙNG', 
              icon: Globe,
              activeBg: 'bg-emerald-100',
              activeBorder: 'border-emerald-300',
              inactiveBg: 'bg-emerald-50/70',
              inactiveBorder: 'border-emerald-200',
              textColor: 'text-emerald-800'
            },
            { 
              id: 'SIEU_THI', 
              label: 'SIÊU THỊ', 
              icon: Store,
              activeBg: 'bg-rose-100',
              activeBorder: 'border-rose-300',
              inactiveBg: 'bg-rose-50/70',
              inactiveBorder: 'border-rose-200',
              textColor: 'text-rose-800'
            },
            { 
              id: 'RT_SIEU_THI', 
              label: 'REALTIME SIÊU THỊ', 
              icon: Zap,
              activeBg: 'bg-blue-100',
              activeBorder: 'border-blue-300',
              inactiveBg: 'bg-blue-50/70',
              inactiveBorder: 'border-blue-200',
              textColor: 'text-blue-800',
              adminOnly: true
            },
            { 
              id: 'LK_SIEU_THI', 
              label: 'LUỸ KẾ SIÊU THỊ', 
              icon: TrendingUp,
              activeBg: 'bg-fuchsia-100',
              activeBorder: 'border-fuchsia-300',
              inactiveBg: 'bg-fuchsia-50/70',
              inactiveBorder: 'border-fuchsia-200',
              textColor: 'text-fuchsia-800',
              adminOnly: true
            },
            { 
              id: 'CAU_HINH', 
              label: 'CẤU HÌNH', 
              icon: Settings,
              activeBg: 'bg-amber-100',
              activeBorder: 'border-amber-300',
              inactiveBg: 'bg-amber-50/70',
              inactiveBorder: 'border-amber-200',
              textColor: 'text-amber-800',
              adminOnly: true 
            }
          ].filter(tab => !tab.adminOnly || isUser43751).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-none items-center gap-2 px-5 py-2.5 rounded-full border transition-all duration-300 ${
                activeTab === tab.id 
                  ? `${tab.activeBg} ${tab.activeBorder} ${tab.textColor} shadow-md scale-105 font-black ring-2 ring-offset-1 ring-${tab.activeBorder.split('-')[1]}-300` 
                  : `${tab.inactiveBg} ${tab.inactiveBorder} ${tab.textColor} font-bold hover:scale-105 hover:opacity-100 opacity-60`
              }`}
            >
              <tab.icon size={18} strokeWidth={2.5} />
              <span className="text-[15px] tracking-wide whitespace-nowrap">{tab.label}</span>
              <Filter size={16} strokeWidth={2} className="ml-1 opacity-60" />
            </button>
          ))}
        </div>

        {/* Configuration UI */}
        {activeTab === 'CAU_HINH' && (
          <div className="bg-white rounded-[32px] p-6 lg:p-10 shadow-xl shadow-slate-200/50 border border-slate-100 max-w-[1400px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                <Settings size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Cấu hình thứ tự Ngành hàng</h2>
                <p className="text-slate-500 text-[15px] mt-1">Dán (Paste) dữ liệu từ Excel để cài đặt nhóm cho các ngành hàng. Dữ liệu sẽ được lưu chung cho toàn bộ hệ thống (Firebase).</p>
              </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-amber-800 text-[15px]">
                  <strong>💡 Hướng dẫn:</strong> Copy 2 cột từ Excel <strong>(Cột 1: Tên ngành hàng, Cột 2: Tên Nhóm)</strong> rồi dán thẳng vào ô bên dưới. <br/>
                  - Tên nhóm hợp lệ: <code className="bg-white px-2 py-0.5 rounded shadow-sm text-amber-700">ICT</code>, <code className="bg-white px-2 py-0.5 rounded shadow-sm text-amber-700">DỊCH VỤ</code>, <code className="bg-white px-2 py-0.5 rounded shadow-sm text-amber-700">CE</code>
                </div>
                
                <textarea
                  className="w-full h-[400px] p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-mono text-[13px] leading-relaxed resize-none bg-slate-50 shadow-inner"
                  placeholder="Ví dụ:&#10;ĐIỆN THOẠI & TABLET ANDROID&#9;ICT&#10;Sim Tổng&#9;DỊCH VỤ&#10;MÁY GIẶT&#9;CE"
                  value={categoryConfigText}
                  onChange={e => setCategoryConfigText(e.target.value)}
                  spellCheck={false}
                />

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleViewAndGroup}
                    className="flex-1 px-8 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Search size={20} />
                    <span>XEM TRƯỚC & GOM NHÓM</span>
                  </button>

                  <button
                    onClick={handleSaveCategoryConfig}
                    disabled={isSavingConfig || previewConfig.length === 0}
                    className="flex-1 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                  >
                    {isSavingConfig ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    <span>ÁP DỤNG VÀ LƯU</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 p-1 flex flex-col h-[520px] overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white rounded-t-xl flex items-center justify-between">
                  <h3 className="font-bold text-slate-700">Bảng xem trước hiện tại</h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">{previewConfig.length} ngành hàng</span>
                </div>
                <div className="flex-1 overflow-auto p-1">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                      <tr>
                        <th className="px-4 py-2 font-black text-slate-600 uppercase border-b border-slate-200">#</th>
                        <th className="px-4 py-2 font-black text-slate-600 uppercase border-b border-slate-200">Ngành hàng</th>
                        <th className="px-4 py-2 font-black text-slate-600 uppercase border-b border-slate-200 text-center">Nhóm</th>
                        <th className="px-4 py-2 font-black text-slate-600 uppercase border-b border-slate-200 text-center">Di chuyển</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {previewConfig.map((c, i) => (
                        <tr 
                          key={i} 
                          className="hover:bg-indigo-50/50 group cursor-grab active:cursor-grabbing transition-colors"
                          draggable
                          onDragStart={() => (dragItem.current = i)}
                          onDragEnter={() => (dragOverItem.current = i)}
                          onDragEnd={handleSort}
                          onDragOver={(e) => e.preventDefault()}
                        >
                          <td className="px-4 py-2 text-slate-400 w-10">
                            <div className="flex items-center gap-2">
                              <GripVertical size={14} className="opacity-30 group-hover:opacity-100" />
                              <span>{i + 1}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 font-medium text-slate-700">{c.name}</td>
                          <td className="px-4 py-2 text-center w-28">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              c.group === 'ICT' ? 'bg-amber-100 text-amber-700' : 
                              c.group === 'DỊCH VỤ' ? 'bg-emerald-100 text-emerald-700' : 
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {c.group}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center w-24">
                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => moveItemUp(i)} disabled={i === 0} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed">
                                <ArrowUp size={14} />
                              </button>
                              <button onClick={() => moveItemDown(i)} disabled={i === previewConfig.length - 1} className="p-1.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed">
                                <ArrowDown size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {previewConfig.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Chưa có dữ liệu. Hãy dán dữ liệu và nhấn Xem Trước.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Stats */}
        {activeTab !== 'CAU_HINH' && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Removed Search Input */}
            
            {(activeTab === 'RT_SIEU_THI' || activeTab === 'LK_SIEU_THI') && (
              <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-slate-500 font-medium">Tổng cộng:</span>
                <span className="text-indigo-600 font-black text-lg">{filteredData.length.toLocaleString()}</span>
                <span className="text-slate-400 font-medium text-sm ml-2">dòng</span>
              </div>
            )}
          </div>
        )}

        {/* Filters and Actions */}
        {(activeTab === 'SIEU_THI' || activeTab === 'VUNG') && (
          <div className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-200 flex flex-col xl:flex-row items-start xl:items-end justify-between gap-6">
            <div className="flex-1 w-full">
              {activeTab === 'SIEU_THI' && (
                <div className="flex flex-col gap-6 w-full">
                  {/* Bộ lọc Kênh Tổng - hiển thị trên 1 hàng ngang lên trên đầu */}
                  <div className="w-full">
                    <label className="block text-[13px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Bộ lọc Kênh Tổng</label>
                    <div className="flex flex-wrap gap-2.5">
                      {['ĐML', 'ĐMM', 'ĐMS', 'TGD'].map(k => (
                        <label key={k} className={`flex items-center gap-2.5 cursor-pointer bg-white px-4 py-2.5 border-2 rounded-xl text-[15px] font-black transition-all shadow-sm ${sieuThiFilterKenh.includes(k) ? 'border-blue-500 text-blue-700 shadow-blue-500/20 bg-blue-50/30' : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                          <input 
                            type="checkbox" 
                            className={`w-[18px] h-[18px] rounded focus:ring-blue-500 cursor-pointer ${sieuThiFilterKenh.includes(k) ? 'text-blue-600 border-blue-500' : 'border-slate-300'}`}
                            checked={sieuThiFilterKenh.includes(k)}
                            onChange={(e) => {
                              if (e.target.checked) setSieuThiFilterKenh([...sieuThiFilterKenh, k]);
                              else setSieuThiFilterKenh(sieuThiFilterKenh.filter(x => x !== k));
                            }}
                          />
                          <span>{k}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Các bộ lọc còn lại phía dưới */}
                  <div className="flex flex-col sm:flex-row items-end gap-6">
                    <div className="w-full sm:w-[250px]">
                      <label className="block text-[13px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Bộ lọc Tỉnh</label>
                      <div className="relative">
                        <select 
                          className="w-full px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-[15px] font-black shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%231d4ed8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-no-repeat bg-[position:right_12px_center] pr-10"
                          value={sieuThiFilterTinh}
                          onChange={(e) => setSieuThiFilterTinh(e.target.value)}
                        >
                          <option value="" className="bg-white text-slate-800 font-bold">Tất cả các tỉnh</option>
                          {[
                            'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                            'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                            'Bến Tre', 'Đồng Tháp', 'An Giang'
                          ].sort((a, b) => a.localeCompare(b, 'vi')).map(tinh => (
                            <option key={tinh} value={tinh} className="bg-white text-slate-800 font-bold">{tinh}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="w-full sm:w-[280px] relative">
                      <label className="block text-[13px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Bộ Lọc Nhóm</label>
                      <button 
                         type="button"
                         onClick={() => setIsNhomDropdownOpen(!isNhomDropdownOpen)}
                         className="w-full flex items-center justify-between px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-[15px] font-black shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                         <span className="truncate mr-2">{sieuThiFilterNhomList.length > 0 ? `Đã chọn (${sieuThiFilterNhomList.length})` : 'Tất cả các nhóm'}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                      {isNhomDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsNhomDropdownOpen(false)} />
                          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col">
                             <div className="p-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const groups = Array.from(new Set(categoryConfig.map(c => c.group).filter(Boolean)));
                                   setSieuThiFilterNhomList(groups);
                                 }}
                                 className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                               >
                                 Chọn tất cả
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setSieuThiFilterNhomList([])}
                                 className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1"
                               >
                                 Bỏ chọn
                               </button>
                             </div>
                             <div className="p-2 max-h-[300px] overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                               {Array.from(new Set(categoryConfig.map(c => c.group).filter(Boolean))).map(group => (
                                  <label key={group} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox"
                                      checked={sieuThiFilterNhomList.includes(group)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSieuThiFilterNhomList([...sieuThiFilterNhomList, group]);
                                        else setSieuThiFilterNhomList(sieuThiFilterNhomList.filter(x => x !== group));
                                      }}
                                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-slate-700 leading-tight">{group === 'CE' ? 'C.E & GIA DỤNG' : group}</span>
                                  </label>
                               ))}
                             </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="w-full sm:w-[320px] relative">
                      <label className="block text-[13px] font-black text-slate-500 uppercase tracking-widest mb-2.5">Ngành Hàng Hiển Thị</label>
                      <button 
                         type="button"
                         onClick={() => setIsNganhHangDropdownOpen(!isNganhHangDropdownOpen)}
                         className="w-full flex items-center justify-between px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-[15px] font-black shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                      >
                         <span className="truncate mr-2">{sieuThiFilterNganhHangList.length > 0 ? `Đã chọn (${sieuThiFilterNganhHangList.length})` : 'Tất cả ngành hàng'}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                      </button>
                      {isNganhHangDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsNganhHangDropdownOpen(false)} />
                          <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex flex-col">
                             <div className="p-2 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
                               <button 
                                 type="button"
                                 onClick={() => setSieuThiFilterNganhHangList(categoryConfig.map(c => c.name))}
                                 className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                               >
                                 Chọn tất cả
                               </button>
                               <button 
                                 type="button"
                                 onClick={() => setSieuThiFilterNganhHangList([])}
                                 className="text-xs font-bold text-slate-500 hover:text-slate-700 px-2 py-1"
                               >
                                 Bỏ chọn
                               </button>
                             </div>
                             <div className="p-2 max-h-[300px] overflow-y-auto flex flex-col gap-1 custom-scrollbar">
                               {categoryConfig.map(c => (
                                  <label key={c.name} className="flex items-start gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                    <input 
                                      type="checkbox"
                                      checked={sieuThiFilterNganhHangList.includes(c.name)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSieuThiFilterNganhHangList([...sieuThiFilterNganhHangList, c.name]);
                                        else setSieuThiFilterNganhHangList(sieuThiFilterNganhHangList.filter(x => x !== c.name));
                                      }}
                                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-slate-700 leading-tight">{c.name}</span>
                                  </label>
                               ))}
                             </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto mt-4 xl:mt-0">
              {activeTab === 'VUNG' ? (
                <>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => exportImageShort(rtTableRef)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap text-xs">
                      <Download size={14} /> XUẤT ẢNH RÚT GỌN
                    </button>
                    <button onClick={() => exportImage(rtTableRef)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap text-xs">
                      <Download size={14} /> XUẤT ẢNH TỔNG
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={handleCopyNhanXet} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap">
                    <MessageSquare size={18} />
                    TAG TÊN BOSS
                  </button>
                  <button onClick={() => exportImageShort()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap">
                    <Download size={18} /> XUẤT ẢNH RÚT GỌN
                  </button>
                  <button onClick={() => exportImage()} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-colors shadow-sm whitespace-nowrap">
                    <Download size={18} /> XUẤT ẢNH TỔNG
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* VÙNG / SIÊU THỊ Pivot Table View */}
        {activeTab === 'CAU_HINH' ? null : activeTab === 'VUNG' || activeTab === 'SIEU_THI' ? (
          <div className="rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px]">
            {isSyncing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-800 font-bold">Đang tải và xử lý dữ liệu lớn...</p>
              </div>
            )}
            <div className="flex-1 w-full">
              {(() => {
                const renderPivotTable = (isRealtime: boolean, currentTableRef?: any) => {
                  const isLuyKeMode = tnbDataMode === 'luyke';
                  const dataSource = isLuyKeMode 
                    ? dataLkSieuThiMapped 
                    : ((activeTab === 'VUNG' && !isRealtime) ? dataVungPivot : dataRtSieuThi);
                  if (dataSource.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <LayoutGrid size={40} className="text-slate-300 mb-3" />
                      <p className="font-medium text-lg text-slate-500">Chưa có dữ liệu</p>
                      <p className="text-sm text-slate-400">Hãy đồng bộ từ Google Sheet để hiển thị.</p>
                    </div>
                  );
                }

                // Pivot source: dataSource
                // Col 0 (A) = Province name / Store name
                // Col 1 (C) = DTLK
                // Col 2 (D) = Target
                // Col 3 (K) = Brand -> Condition: !== "TGD" && !== "AAR"

                // 1. Filter rows
                const filtered = dataSource.filter(row => {
                  if (activeTab === 'VUNG' && !isRealtime) {
                    const brand = (row[3] || '').trim().toUpperCase();
                    return brand !== 'TGD' && brand !== 'AAR';
                  } else if (activeTab === 'VUNG' && isRealtime) {
                    const brand = (row[5] || '').trim().toUpperCase();
                    return brand !== 'TGD' && brand !== 'AAR';
                  } else {
                    const stName = (row[6] || '').trim().toUpperCase();
                    if (stName.includes('KHO BÁN HÀNG LƯU ĐỘNG')) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-20">
                      <LayoutGrid size={40} className="text-slate-300 mb-3" />
                      <p className="font-medium text-lg text-slate-500">Không có dữ liệu phù hợp</p>
                      <p className="text-sm text-slate-400">Không tìm thấy dòng nào hợp lệ.</p>
                    </div>
                  );
                }

                // 2. Extract unique categories preserving order
                const categorySet = new Set<string>();
                filtered.forEach(row => {
                  // When isLuyKeMode, data is always dataLkSieuThiMapped which has cat at row[9]
                  const cat = ((activeTab === 'VUNG' && !isRealtime && !isLuyKeMode) ? row[4] : row[9]) || '';
                  const cleanCat = cat.trim().toUpperCase().normalize('NFC');
                  if (cleanCat && cleanCat !== '-') categorySet.add(cleanCat);
                });
                const CATEGORY_ORDER = categoryConfig.map(c => c.name.toUpperCase().normalize('NFC'));
                const blueCatsData = categoryConfig.filter(c => c.group === 'CE').map(c => c.name.toUpperCase().normalize('NFC'));
                const allCats = Array.from(categorySet);
                let categories = [];
                if (sieuThiFilterNganhHangList.length > 0) {
                  const filterUpper = sieuThiFilterNganhHangList.map(c => c.toUpperCase().normalize('NFC'));
                  categories = CATEGORY_ORDER.filter(c => filterUpper.includes(c));
                  const extra = filterUpper.filter(c => !CATEGORY_ORDER.includes(c));
                  categories = [...categories, ...extra];
                } else {
                  categories = [
                    ...CATEGORY_ORDER.filter(c => allCats.includes(c)),
                    ...allCats.filter(c => !CATEGORY_ORDER.includes(c))
                  ];
                }

                if (sieuThiFilterNhomList.length > 0) {
                  categories = categories.filter(c => {
                    const catObj = categoryConfig.find(cfg => cfg.name.toUpperCase().normalize('NFC') === c);
                    return catObj && sieuThiFilterNhomList.includes(catObj.group);
                  });
                }

                if (activeTab !== 'VUNG' && sieuThiFilterKenh.length === 1 && sieuThiFilterKenh[0] === 'TGD') {
                  categories = categories.filter(c => !blueCatsData.includes(c));
                }

                // 3. Define rows
                let rowNames: string[] = [];
                const storeInfoMap: Record<string, { tinh: string, boss: string, kenh: string }> = {};

                if (activeTab === 'VUNG') {
                  rowNames = [
                    'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 'Trà Vinh',
                    'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 'Bến Tre', 'Đồng Tháp', 'An Giang'
                  ];
                } else {
                  const storeSet = new Set<string>();
                  filtered.forEach(row => {
                    const tinh = (row[0] || '').trim().toUpperCase();
                    const stRt = (row[6] || '').trim().toUpperCase();
                    const kenh = (row[7] || '').trim().toUpperCase();
                    const boss = (row[8] || '').trim().toUpperCase();
                    if (stRt) {
                      storeSet.add(stRt);
                      storeInfoMap[stRt] = { tinh, boss, kenh };
                    }
                  });

                  let storesList = Array.from(storeSet);
                  if (sieuThiFilterTinh) {
                    storesList = storesList.filter(s => (storeInfoMap[s]?.tinh || '') === sieuThiFilterTinh.toUpperCase());
                  }
                  if (sieuThiFilterKenh.length > 0) {
                    storesList = storesList.filter(s => sieuThiFilterKenh.includes(storeInfoMap[s]?.kenh || ''));
                  }
                  rowNames = storesList;
                }

                const pivotMap: Record<string, Record<string, { dtlk: number, target: number, rawPercent: number, htDuKien: number }>> = {};
                const parseNum = (str: any) => {
                  if (!str) return 0;
                  const clean = str.toString().replace(/,/g, '').replace(/ /g, '').replace(/[^0-9.-]/g, '');
                  return parseFloat(clean) || 0;
                };

                filtered.forEach(row => {
                  if (activeTab === 'VUNG' && !isRealtime && !isLuyKeMode) {
                    // VUNG LK (non-luyke): dataVungPivot columns
                    const prov = (row[0] || '').trim().toUpperCase();
                    const dtlk = parseNum(row[1]);
                    const target = parseNum(row[2]);
                    const cat = (row[4] || '').trim().toUpperCase().normalize('NFC');
                    if (prov && cat && cat !== '-') {
                      if (!pivotMap[prov]) pivotMap[prov] = {};
                      if (!pivotMap[prov][cat]) pivotMap[prov][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                      pivotMap[prov][cat].dtlk += dtlk;
                      pivotMap[prov][cat].target += target;
                    }
                  } else if (activeTab === 'VUNG' && (isRealtime || isLuyKeMode)) {
                    // VUNG RT or VUNG+luyke: dataRtSieuThi / dataLkSieuThiMapped columns
                    const prov = (row[0] || '').trim().toUpperCase();
                    const dtlk = parseNum(row[2]); // CỘT 3
                    const target = parseNum(row[3]); // CỘT 4
                    const kenh = (row[7] || '').trim().toUpperCase(); // CỘT 9 (AC)
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC'); // CỘT 13 (AG)
                    
                    if (prov && cat && cat !== '-') {
                      let isValidKenh = false;
                      if (sieuThiFilterKenh.length === 0) {
                        isValidKenh = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR'].includes(kenh);
                      } else {
                        if (sieuThiFilterKenh.includes(kenh)) isValidKenh = true;
                        if (sieuThiFilterKenh.includes('TGD') && kenh === 'AAR') isValidKenh = true;
                      }

                      if (isValidKenh) {
                        if (!pivotMap[prov]) pivotMap[prov] = {};
                        if (!pivotMap[prov][cat]) pivotMap[prov][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                        pivotMap[prov][cat].dtlk += dtlk;
                        pivotMap[prov][cat].target += target;
                      }
                    }
                  } else {
                    const stRt = (row[6] || '').trim().toUpperCase();
                    const rawPercent = parseNum(row[4]);
                    const htDuKien = parseNum(row[5]);
                    const dtlk = parseNum(row[2]);
                    const target = parseNum(row[3]);
                    const cat = (row[9] || '').trim().toUpperCase().normalize('NFC');
                    if (stRt && cat && cat !== '-') {
                      if (!pivotMap[stRt]) pivotMap[stRt] = {};
                      if (!pivotMap[stRt][cat]) pivotMap[stRt][cat] = { dtlk: 0, target: 0, rawPercent: 0, htDuKien: 0 };
                      pivotMap[stRt][cat].rawPercent = rawPercent;
                      pivotMap[stRt][cat].htDuKien = htDuKien;
                      pivotMap[stRt][cat].dtlk += dtlk;
                      pivotMap[stRt][cat].target += target;
                    }
                  }
                });

                const today = new Date();
                const currentDay = Math.max(1, today.getDate() - 1);
                const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const totalCats = categories.length;


                const mappedRows = rowNames.map((prov) => {
                  let datCount = 0;
                  const provData = pivotMap[prov.toUpperCase()] || {};
                  const info = storeInfoMap[prov.toUpperCase()] || { tinh: '', boss: '', kenh: '' };
                  
                  const isTGD = info.kenh === 'TGD';
                  const blueCats = CATEGORY_ORDER.slice(21);
                  let effectiveTotalCats = 0;

                  const catPercents = categories.map(cat => {
                    const isBlueCat = blueCats.includes(cat);
                    const shouldIgnoreForTGD = isTGD && isBlueCat;
                    
                    if (!shouldIgnoreForTGD) {
                      effectiveTotalCats++;
                    }

                    const cellData = provData[cat];
                    let percent = 0;
                    let displayVal = '-';
                    let textColor = 'text-slate-400';
                    let bgColor = 'bg-white';
                    
                    const isLuyKeMode = tnbDataMode === 'luyke';
                    
                    if (activeTab === 'VUNG' && (!isRealtime || isLuyKeMode)) {
                      if (cellData && cellData.target > 0) {
                        percent = ((cellData.dtlk / currentDay) * totalDays) / cellData.target * 100;
                        displayVal = percent.toFixed(0) + '%';
                      }
                    } else if (activeTab === 'VUNG' && isRealtime) {
                      if (cellData && cellData.target > 0) {
                        percent = (cellData.dtlk / cellData.target) * 100;
                        displayVal = percent.toFixed(0) + '%';
                      } else if (cellData && cellData.target === 0 && cellData.dtlk > 0) {
                        percent = 100;
                        displayVal = '100%';
                      }
                    } else {
                      if (cellData) {
                        if (isLuyKeMode) {
                          // SIEU_THI + luyke: rawPercent = row[4] = %HT Dự Kiến from spreadsheet
                          percent = cellData.rawPercent;
                        } else {
                          percent = cellData.rawPercent;
                        }
                        displayVal = percent.toFixed(0) + '%';
                      }
                    }
                    
                    // If ignored for TGD, maybe we still show it or blank it out? Let's just blank it out so it's clear it's not counted.
                    if (shouldIgnoreForTGD) {
                      displayVal = '-';
                    }

                    if (displayVal !== '-') {
                      if (percent >= 100) {
                        if (!shouldIgnoreForTGD) datCount++;
                        textColor = 'text-[#064e3b]';
                        bgColor = 'bg-emerald-100';
                      } else if (isLuyKeMode && percent < 50) {
                        textColor = 'text-red-600';
                        bgColor = 'bg-red-100';
                      } else if (!isLuyKeMode && percent <= 10) {
                        textColor = 'text-red-500';
                      } else {
                        textColor = 'text-slate-900';
                      }
                    } else if (cellData && cellData.target === 0 && cellData.dtlk > 0 && !shouldIgnoreForTGD) {
                      percent = 100;
                      displayVal = '100%';
                      textColor = 'text-[#064e3b]';
                      bgColor = 'bg-emerald-100';
                      datCount++;
                    }
                    
                    return { displayVal, textColor, bgColor };
                  });

                  const tyLe = effectiveTotalCats > 0 ? (datCount / effectiveTotalCats) * 100 : 0;
                  return { prov, datCount, tyLe, effectiveTotalCats, catPercents, ...info };
                });

                // Search logic
                let searchedRows = mappedRows.filter(r => {
                  // Filter out OFF stores only in SIÊU THỊ tab
                  if (activeTab === 'SIEU_THI' && (r.prov || '').toString().toUpperCase().includes('OFF')) {
                    return false;
                  }
                  
                  if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    return (r.prov || '').toString().toLowerCase().includes(term) || 
                           (r.boss || '').toString().toLowerCase().includes(term) ||
                           (r.kenh || '').toString().toLowerCase().includes(term);
                  }
                  return true;
                });
                
                searchedRowsRef.current = searchedRows;

                // Sort logic
                if (activeTab === 'VUNG') {
                  searchedRows.sort((a, b) => {
                    if (b.tyLe !== a.tyLe) return b.tyLe - a.tyLe;
                    if (b.datCount !== a.datCount) return b.datCount - a.datCount;
                    return a.prov.localeCompare(b.prov);
                  });
                } else {
                  const kenhOrder: Record<string, number> = { 'ĐML': 1, 'ĐMM': 2, 'ĐMS': 3, 'TGD': 4 };
                  searchedRows.sort((a, b) => {
                    const kA = kenhOrder[a.kenh] || 99;
                    const kB = kenhOrder[b.kenh] || 99;
                    if (kA !== kB) return kA - kB;
                    if (b.tyLe !== a.tyLe) return b.tyLe - a.tyLe;
                    if (b.datCount !== a.datCount) return b.datCount - a.datCount;
                    return a.prov.localeCompare(b.prov);
                  });
                }

                // Pagination logic removed - display all rows directly
                const paginatedRows = searchedRows;

                const totalRowCats = categories.map(cat => {
                   let sumDtlk = 0;
                   let sumTarget = 0;
                   let sumRawPercent = 0;
                   let countRawPercent = 0;

                   searchedRows.forEach(r => {
                      const provData = pivotMap[r.prov.toUpperCase()] || {};
                      const cellData = provData[cat];
                      if (cellData) {
                         sumDtlk += cellData.dtlk || 0;
                         sumTarget += cellData.target || 0;
                         if (cellData.rawPercent > 0 || cellData.target === 0) {
                           sumRawPercent += cellData.rawPercent || 0;
                           countRawPercent++;
                         }
                      }
                   });

                   let percent = 0;
                   let displayVal = '-';
                   let textColor = 'text-slate-400';
                   let bgColor = 'bg-white';

                   if (activeTab === 'VUNG' && (!isRealtime || isLuyKeMode)) {
                     if (sumTarget > 0) {
                       percent = ((sumDtlk / currentDay) * totalDays) / sumTarget * 100;
                       displayVal = percent.toFixed(0) + '%';
                     }
                   } else if (activeTab === 'VUNG' && isRealtime) {
                     if (sumTarget > 0) {
                       percent = (sumDtlk / sumTarget) * 100;
                       displayVal = percent.toFixed(0) + '%';
                     } else if (sumTarget === 0 && sumDtlk > 0) {
                       percent = 100;
                       displayVal = '100%';
                     }
                   } else {
                     if (isLuyKeMode && sumTarget > 0) {
                       // % Dự Kiến for SIEU_THI total row
                       percent = ((sumDtlk / currentDay) * totalDays) / sumTarget * 100;
                       displayVal = percent.toFixed(0) + '%';
                     } else if (countRawPercent > 0) {
                       percent = sumRawPercent / countRawPercent;
                       displayVal = percent.toFixed(0) + '%';
                     }
                   }

                   const isBlueCat = blueCatsData.includes(cat);
                   const shouldIgnoreForTGD = (activeTab !== 'VUNG' && sieuThiFilterKenh.length === 1 && sieuThiFilterKenh[0] === 'TGD') && isBlueCat;
                   
                   if (shouldIgnoreForTGD) {
                     displayVal = '-';
                   }

                   if (displayVal !== '-') {
                     if (percent >= 100) {
                       textColor = 'text-[#064e3b]';
                       bgColor = 'bg-emerald-100';
                     } else if (isLuyKeMode && percent < 50) {
                       textColor = 'text-red-600';
                       bgColor = 'bg-red-100';
                     } else if (!isLuyKeMode && percent <= 10) {
                       textColor = 'text-red-500';
                     } else {
                       textColor = 'text-slate-900';
                     }
                   }

                   return { displayVal, textColor, bgColor, percent, shouldIgnoreForTGD };
                });

                let totalDatCount = 0;
                let totalEffectiveCats = 0;
                totalRowCats.forEach(c => {
                  if (!c.shouldIgnoreForTGD) {
                    totalEffectiveCats++;
                    if (c.displayVal !== '-' && c.percent >= 100) {
                      totalDatCount++;
                    }
                  }
                });

                const totalTyLe = totalEffectiveCats > 0 ? (totalDatCount / totalEffectiveCats) * 100 : 0;

                const totalRow = {
                  isTotalRow: true,
                  prov: 'TỔNG CỘNG',
                  tinh: 'TỔNG CỘNG',
                  boss: '-',
                  kenh: '-',
                  datCount: totalDatCount,
                  effectiveTotalCats: totalEffectiveCats,
                  tyLe: totalTyLe,
                  catPercents: totalRowCats
                };

                const finalRows = searchedRows.length > 0 ? [...paginatedRows, totalRow] : paginatedRows;

                return (
                  <div className="w-full">
                    <style>{`
                      .export-short-mode .category-col { display: none !important; }
                    `}</style>
                    <div ref={currentTableRef} className="bg-white p-6 w-full inline-block rounded-xl">
                      <div className="w-full overflow-x-auto overflow-y-hidden custom-scrollbar mt-1">
                        <table className="w-full border-separate border-spacing-0 text-[15px] border border-slate-200 rounded-[8px] shadow-lg shadow-slate-200/30">
                      <thead className="sticky top-0 z-20 shadow-sm bg-white">
                        {/* Title Rows */}
                        {(() => {
                          const now = new Date();
                          const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${todayStr}`;
                          
                          const monthStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                          const yesterday = new Date(now);
                          yesterday.setDate(yesterday.getDate() - 1);
                          const yesterdayStr = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`;
                          
                          const isLuyKeMode = tnbDataMode === 'luyke';
                          const isEffectiveRealtime = isRealtime && !isLuyKeMode;

                          const titlePrefix = isLuyKeMode
                            ? `LUỸ KẾ THI ĐUA NGÀNH HÀNG THÁNG ${monthStr}`
                            : (activeTab === 'VUNG' 
                                ? (isEffectiveRealtime ? `REALTIME THI ĐUA NGÀNH HÀNG NGÀY ${todayStr}` : `LUỸ KẾ THI ĐUA NGÀNH HÀNG THÁNG ${monthStr}`)
                                : `REALTIME THI ĐUA NGÀNH HÀNG NGÀY ${todayStr}`);
                          const displayTime = isLuyKeMode
                            ? yesterdayStr
                            : (activeTab === 'VUNG' 
                                ? (isEffectiveRealtime ? timeStr : yesterdayStr)
                                : timeStr);
                          
                          const getKenhTitle = () => {
                            if (sieuThiFilterKenh.length === 0) return "TẤT CẢ KÊNH";
                            const hasDMX = sieuThiFilterKenh.some(k => ['ĐML', 'ĐMM', 'ĐMS'].includes(k));
                            const hasTGD = sieuThiFilterKenh.includes('TGD');
                            if (hasDMX && hasTGD) return "KÊNH ĐMX & TGD";
                            if (hasDMX) return "KÊNH ĐMX";
                            if (hasTGD) return "KÊNH TGD";
                            return `KÊNH ${sieuThiFilterKenh.join(', ')}`;
                          };
                          
                          return (
                            <>
                                <tr>
                                  <th colSpan={100} style={{ borderBottom: '1px solid #e2e8f0' }} className="bg-white px-4 py-4 text-left sticky left-0 z-30">
                                    <span className="text-[31px] font-black text-slate-800">{titlePrefix} - </span>
                                    <span className="text-[31px] font-black text-[#c00000] uppercase">
                                      {getKenhTitle()}
                                    </span>
                                  </th>
                                </tr>
                                <tr>
                                  <th colSpan={100} style={{ borderBottom: '2px solid #cbd5e1' }} className="bg-white px-4 py-2 text-left sticky left-0 z-30">
                                    <span className="text-[17px] font-bold text-slate-800 uppercase">THỜI GIAN ĐẾN : </span>
                                    <span className="text-[17px] font-bold text-slate-900 ml-4">{displayTime}</span>
                                    <span className="text-[17px] font-bold text-red-600 ml-4 uppercase">
                                      || CHỈ TÍNH {sieuThiFilterKenh.length === 0 ? 'TẤT CẢ KÊNH ĐMX, TGD, AAR' : (sieuThiFilterKenh.includes('TGD') ? getKenhTitle() + ', AAR' : getKenhTitle())}
                                    </span>
                                  </th>
                                </tr>
                            </>
                          );
                        })()}
                        {/* Top Group Header row */}
                        <tr>
                          <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-slate-900 px-2 py-3 border-r border-b border-white text-center w-[40px] whitespace-nowrap lg:sticky lg:left-0 z-30 text-[13.5px]">
                            STT
                          </th>
                          {activeTab === 'SIEU_THI' && (
                            <>
                              <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-slate-900 px-3 py-3 border-r border-b border-white text-center w-[80px] min-w-[80px] max-w-[80px] whitespace-nowrap lg:sticky lg:left-[40px] z-30 text-[13.5px]">
                                TỈNH
                              </th>
                              <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-slate-900 px-3 py-3 border-r border-b border-white text-center w-[100px] min-w-[100px] max-w-[100px] whitespace-nowrap lg:sticky lg:left-[120px] z-30 text-[13.5px]">
                                BOSS
                              </th>
                              <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="text-slate-900 px-3 py-3 border-r border-b border-white text-center w-[60px] min-w-[60px] max-w-[60px] whitespace-nowrap lg:sticky lg:left-[220px] z-30 text-[13.5px]">
                                KÊNH
                              </th>
                            </>
                          )}
                          <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`text-slate-900 px-3 py-3 border-r border-b border-white text-center whitespace-nowrap lg:sticky z-30 text-[13.5px] ${activeTab === 'SIEU_THI' ? 'w-[240px] min-w-[240px] max-w-[240px] lg:left-[280px]' : 'w-[120px] min-w-[120px] max-w-[120px] lg:left-[40px]'}`}>
                            {activeTab === 'VUNG' ? 'TỈNH' : 'SIÊU THỊ'}
                          </th>
                          <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`text-slate-900 px-2 py-3 border-r border-b border-white text-center w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap lg:sticky z-30 uppercase text-[13.5px] ${activeTab === 'SIEU_THI' ? 'lg:left-[520px]' : 'lg:left-[160px]'}`}>
                            ĐẠT
                          </th>
                          <th rowSpan={2} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`text-slate-900 px-3 py-3 border-r border-b border-white text-center w-[70px] min-w-[70px] max-w-[70px] whitespace-nowrap lg:sticky z-30 uppercase text-[13.5px] ${activeTab === 'SIEU_THI' ? 'lg:left-[590px]' : 'lg:left-[230px]'}`}>
                            TỶ LỆ
                          </th>
                          {(() => {
                            const yellowCats = categoryConfig.filter(c => c.group === 'ICT').map(c => c.name.toUpperCase().normalize('NFC'));
                            const greenCats = categoryConfig.filter(c => c.group === 'DỊCH VỤ').map(c => c.name.toUpperCase().normalize('NFC'));
                            const blueCats = categoryConfig.filter(c => c.group === 'CE').map(c => c.name.toUpperCase().normalize('NFC'));
                            const yellowSpan = yellowCats.filter(c => categories.includes(c)).length;
                            const greenSpan = greenCats.filter(c => categories.includes(c)).length;
                            const blueSpan = blueCats.filter(c => categories.includes(c)).length;
                            return (
                              <>
                                {yellowSpan > 0 && (
                                  <th colSpan={yellowSpan} style={{ backgroundColor: '#f59e0b', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="category-col text-slate-900 px-2 py-2 border-r border-b border-white text-center uppercase text-[13.5px]">
                                    NHÓM ICT
                                  </th>
                                )}
                                {greenSpan > 0 && (
                                  <th colSpan={greenSpan} style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="category-col text-slate-900 px-4 py-2 border-r border-b border-white text-center uppercase text-[13.5px]">
                                    NHÓM DỊCH VỤ
                                  </th>
                                )}
                                {blueSpan > 0 && (
                                  <th colSpan={blueSpan} style={{ backgroundColor: '#3b82f6', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="category-col text-white px-4 py-2 border-r border-b border-white text-center uppercase text-[13.5px]">
                                    NHÓM C.E & GIA DỤNG
                                  </th>
                                )}
                              </>
                            );
                          })()}
                        </tr>
                        {/* Sub Category Header row */}
                        <tr>
                          {categories.map((cat, idx) => {
                            const yellowCats = categoryConfig.filter(c => c.group === 'ICT').map(c => c.name.toUpperCase().normalize('NFC'));
                            const greenCats = categoryConfig.filter(c => c.group === 'DỊCH VỤ').map(c => c.name.toUpperCase().normalize('NFC'));
                            const blueCats = categoryConfig.filter(c => c.group === 'CE').map(c => c.name.toUpperCase().normalize('NFC'));
                            let headerBg = '#3b82f6'; // Default blue
                            let textColor = 'text-white';
                            if (yellowCats.includes(cat)) { headerBg = '#f59e0b'; textColor = 'text-slate-900'; }
                            else if (greenCats.includes(cat)) { headerBg = '#10b981'; textColor = 'text-slate-900'; }
                            else if (blueCats.includes(cat)) headerBg = '#3b82f6'; // Blue
                            
                            return (
                              <th key={idx} style={{ backgroundColor: headerBg, fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`category-col ${textColor} px-1 py-2 border-r border-white text-center w-[70px] min-w-[70px] max-w-[70px] break-words whitespace-normal leading-tight uppercase text-[13.5px]`} title={cat}>
                                {cat}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {finalRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className={cn("hover:bg-slate-50 transition-colors h-[40px]", row.isTotalRow ? cn("bg-[#e8f5e9] font-bold shadow-[0_-2px_4px_rgba(0,0,0,0.05)] border-t-[3px] border-slate-300 z-[100]", !isExporting && "sticky bottom-0") : "")}>
                              {/* Combined columns for Total Row OR Individual Columns */}
                              {row.isTotalRow ? (
                                <td 
                                  colSpan={activeTab === 'SIEU_THI' ? 5 : 2} 
                                  style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} 
                                  className={cn("text-[#0f172a] uppercase px-3 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky lg:left-0 z-[110] text-[15px] bg-[#c8e6c9]")}
                                >
                                  TỔNG CỘNG
                                </td>
                              ) : (
                                <>
                                  {/* STT - sticky */}
                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="bg-[#e8f5e9] text-[#0f172a] px-2 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky lg:left-0 z-[110] text-[15px]">
                                    {rowIndex + 1}
                                  </td>
                                  {activeTab === 'SIEU_THI' && (
                                    <>
                                      {/* TỈNH - sticky */}
                                      <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="bg-white text-[#0f172a] uppercase px-3 py-[6px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky lg:left-[40px] z-[110] text-[15px]">
                                        {row.tinh}
                                      </td>
                                      {/* BOSS - sticky */}
                                      <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className="bg-white text-[#0f172a] uppercase px-3 py-[6px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky lg:left-[120px] z-[110] text-[15px]">
                                        {row.boss}
                                      </td>
                                      {/* KÊNH - sticky */}
                                      <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`text-[#0f172a] uppercase px-2 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky lg:left-[220px] z-[110] text-[15px] ${
                                        row.kenh === 'ĐML' ? 'bg-blue-200 text-blue-900' : 
                                        row.kenh === 'ĐMM' ? 'bg-cyan-200 text-cyan-900' :
                                        row.kenh === 'ĐMS' ? 'bg-green-200 text-green-900' :
                                        row.kenh === 'TGD' ? 'bg-amber-200 text-amber-900' : 
                                        row.kenh === 'AAR' ? 'bg-rose-200 text-rose-900' : 'bg-white'
                                      }`}>
                                        {row.kenh}
                                      </td>
                                    </>
                                  )}
                                  {/* Province/Store name - sticky */}
                                  <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`bg-white text-[#0f172a] uppercase px-3 py-[6px] border-r border-b border-slate-300 whitespace-nowrap lg:sticky z-[110] text-[15px] ${activeTab === 'SIEU_THI' ? 'truncate lg:left-[280px]' : 'lg:left-[40px]'}`}>
                                    {row.prov}
                                  </td>
                                </>
                              )}
                              {/* ĐẠT - sticky */}
                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`text-[#0f172a] px-2 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky z-[110] text-[15px] ${activeTab === 'SIEU_THI' ? 'lg:left-[520px]' : 'lg:left-[160px]'} ${row.isTotalRow ? 'bg-[#c8e6c9]' : 'bg-white'}`}>
                                {row.datCount}/{row.effectiveTotalCats !== undefined ? row.effectiveTotalCats : totalCats}
                              </td>
                              {/* TỶ LỆ - sticky */}
                              <td style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={` ${row.tyLe < 50 ? 'text-red-600' : 'text-[#059669]'} px-2 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap lg:sticky z-[110] text-[15px] ${activeTab === 'SIEU_THI' ? 'lg:left-[590px]' : 'lg:left-[230px]'} ${row.isTotalRow ? 'bg-[#c8e6c9]' : 'bg-white'}`}>
                                {row.tyLe < 50 && '🚨'} {row.tyLe.toFixed(0)}%
                              </td>
                              
                              {row.catPercents.map((c: any, colIndex: number) => (
                                <td key={colIndex} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900 }} className={`category-col ${row.isTotalRow ? (c.displayVal !== '-' ? 'bg-[#e8f5e9] text-slate-800' : 'bg-[#c8e6c9] text-slate-400') : (c.bgColor + ' ' + c.textColor)} px-1 py-[6px] border-r border-b border-slate-300 text-center whitespace-nowrap w-[70px] min-w-[70px] max-w-[70px] text-[15px]`} title={c.displayVal}>
                                  {c.displayVal}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pivot Pagination Footer removed */}
                  </div>
                </div>
              );
            };

            const renderKhoTable = () => {
              const isLuyKeMode = tnbDataMode === 'luyke';
              const dataSrc = isLuyKeMode ? dataLkSieuThiMapped : dataRtSieuThi;
              if (dataSrc.length === 0) return null;

              const nganhHangSet = new Set<string>();
              dataSrc.forEach(row => {
                let nh = (row[9] || '').trim().toUpperCase();
                if (nh === 'B.HIỂM TTB') nh = 'BẢO HIỂM';
                if (nh && nh !== '-') nganhHangSet.add(nh);
              });
              const dsNganhHang = Array.from(nganhHangSet).sort();

              const filteredKho = dataSrc.filter(row => {
                const rowKenh = (row[7] || '').trim().toUpperCase();
                
                let isValidKenh = false;
                if (sieuThiFilterKenh.length === 0) {
                  isValidKenh = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR'].includes(rowKenh);
                } else {
                  if (sieuThiFilterKenh.includes(rowKenh)) {
                    isValidKenh = true;
                  }
                  if (sieuThiFilterKenh.includes('TGD') && rowKenh === 'AAR') {
                    isValidKenh = true;
                  }
                }

                if (!isValidKenh) return false;

                let rowNganhHang = (row[9] || '').trim().toUpperCase();
                if (rowNganhHang === 'B.HIỂM TTB') rowNganhHang = 'BẢO HIỂM';
                
                if (rtFilterNganhHang && rtFilterNganhHang !== 'TẤT CẢ NGÀNH HÀNG') {
                  if (rowNganhHang !== rtFilterNganhHang) return false;
                }

                return true;
              });

              const dsTinhList = [
                'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                'Bến Tre', 'Đồng Tháp', 'An Giang'
              ];

              const aggregated: Record<string, { target: number, real: number }> = {};
              dsTinhList.forEach(t => aggregated[t.toUpperCase()] = { target: 0, real: 0 });

              const parseNum = (str: any) => {
                if (!str) return 0;
                const clean = str.toString().replace(/,/g, '').replace(/ /g, '').replace(/[^0-9.-]/g, '');
                return parseFloat(clean) || 0;
              };

              filteredKho.forEach(row => {
                const tinh = (row[0] || '').trim().toUpperCase();
                if (!aggregated[tinh]) return;
                
                const target = parseNum(row[3]);
                const real = parseNum(row[2]);

                aggregated[tinh].target += target;
                aggregated[tinh].real += real;
              });

              const tableData = dsTinhList.map(tinh => {
                const data = aggregated[tinh.toUpperCase()];
                const ht = data.target > 0 ? (data.real / data.target) * 100 : (data.real > 0 ? 100 : 0);
                return {
                  tinh,
                  target: data.target,
                  real: data.real,
                  ht
                };
              });

              tableData.sort((a, b) => {
                if (b.ht !== a.ht) return b.ht - a.ht;
                return b.real - a.real;
              });

              // Forecast calculation for LUỸ KẾ mode
              const nowCalc = new Date();
              const totalDaysInMonth = new Date(nowCalc.getFullYear(), nowCalc.getMonth() + 1, 0).getDate();
              const daysPassed = Math.max(1, nowCalc.getDate() - 1); // Luỹ kế đến hôm qua

              let totalTarget = 0;
              let totalReal = 0;
              tableData.forEach(r => {
                totalTarget += r.target;
                totalReal += r.real;
              });
              const totalHtRaw = totalTarget > 0 ? (totalReal / totalTarget) * 100 : 0;
              const totalForecast = totalTarget > 0 ? ((totalReal / daysPassed) * totalDaysInMonth / totalTarget) * 100 : 0;
              const totalHtDisplay = isLuyKeMode ? totalForecast : totalHtRaw;

              const now = new Date();
              const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
              const timeStr = isLuyKeMode
                ? `${String(new Date(now.getTime() - 86400000).getDate()).padStart(2, '0')}/${String(new Date(now.getTime() - 86400000).getMonth() + 1).padStart(2, '0')}`
                : `${todayStr} || ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

              return (
                <div className="flex flex-col lg:flex-row gap-6 items-start mt-8">
                  <div className="w-full lg:w-auto bg-white p-4 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="mb-4 flex flex-col gap-2">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button 
                          onClick={() => exportImageShort(khoTableRef)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                        >
                          <Download size={16} /> XUẤT ẢNH
                        </button>
                      </div>
                      <p className="text-[13px] italic text-slate-500 font-medium ml-1 uppercase">
                        * CHỈ TÍNH {sieuThiFilterKenh.length === 0 ? 'TẤT CẢ KÊNH ĐMX, TGD, AAR' : (sieuThiFilterKenh.includes('TGD') ? sieuThiFilterKenh.join(', ') + ', AAR' : sieuThiFilterKenh.join(', '))}
                      </p>
                    </div>
                    
                    <div ref={khoTableRef} className="w-full overflow-hidden bg-white p-6">
                      <table className="w-full border-collapse text-[18px] font-sans bg-white border border-slate-300 shadow-sm rounded-lg overflow-hidden">
                      <thead>
                        <tr>
                          <th colSpan={5} style={{ backgroundColor: '#10b981' }} className="text-slate-900 px-4 py-3 text-center font-black text-[24px] uppercase tracking-wider whitespace-nowrap">
                            {isLuyKeMode ? 'LUỸ KẾ THI ĐUA' : 'REALTIME THI ĐUA'} {timeStr}
                          </th>
                        </tr>
                        <tr>
                          <th colSpan={5} className="bg-white text-[#c00000] px-4 py-2 border-b-2 border-slate-300 text-center font-black text-[22px] uppercase">
                            {rtFilterNganhHang ? rtFilterNganhHang : 'TẤT CẢ NGÀNH HÀNG'}
                          </th>
                        </tr>
                        <tr className="text-[18px]">
                          <th className="bg-emerald-500 text-slate-900 px-3 py-2 text-center font-black uppercase border-r border-b border-emerald-600 min-w-[120px] max-w-[120px] w-[120px]">Tỉnh</th>
                          <th className="bg-amber-500 text-slate-900 px-3 py-2 text-center font-black uppercase border-r border-b border-amber-600 min-w-[80px] max-w-[80px] w-[80px]">Target</th>
                          <th className="bg-amber-500 text-slate-900 px-3 py-2 text-center font-black uppercase border-r border-b border-amber-600 min-w-[80px] max-w-[80px] w-[80px]">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                          <th className="bg-amber-500 text-slate-900 px-3 py-2 text-center font-black uppercase border-r border-b border-amber-600 min-w-[80px] max-w-[80px] w-[80px]">{isLuyKeMode ? '% D.KIẾN' : '%HT'}</th>
                          <th className="bg-amber-500 text-slate-900 px-3 py-2 text-center font-black uppercase border-b border-amber-600 min-w-[60px] max-w-[60px] w-[60px]">T/B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, idx) => {
                          const isTop = idx < 3;
                          const isBot = idx >= tableData.length - 3;
                          
                          const forecastHt = row.target > 0 ? ((row.real / daysPassed) * totalDaysInMonth / row.target) * 100 : (row.real > 0 ? 100 : 0);
                          const displayHt = isLuyKeMode ? forecastHt : row.ht;
                          const htDisplay = `${displayHt.toFixed(1)}%`;
                          
                          return (
                            <tr key={idx} className="border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2 text-[#0369a1] font-black border-r border-slate-300 text-[17px]">{row.tinh}</td>
                              <td className="px-3 py-2 text-center text-slate-900 font-black border-r border-slate-300 text-[17px]">{Math.round(row.target).toLocaleString()}</td>
                              <td className="px-3 py-2 text-center text-[#c00000] font-black border-r border-slate-300 text-[17px]">{Math.round(row.real).toLocaleString()}</td>
                              <td className={`px-3 py-2 text-center font-black border-r border-slate-300 text-[17px] ${isTop ? 'bg-[#dcfce7] text-[#16a34a]' : (isBot ? 'text-red-600' : 'text-slate-900')}`}>{htDisplay}</td>
                              <td className={`px-3 py-2 text-center font-black border-slate-300 text-[17px] ${isTop ? 'text-[#16a34a]' : (isBot ? 'text-red-600' : 'text-slate-900')}`}>{isTop ? 'Top' : (isBot ? 'Bot' : '')}</td>
                            </tr>
                          )
                        })}
                        <tr style={{ backgroundColor: '#10b981' }} className="text-slate-900">
                          <td className="px-3 py-2 text-center font-black border-r border-slate-300 text-[18px]">Tổng</td>
                          <td className="px-3 py-2 text-center font-black border-r border-slate-300 text-[18px]">{Math.round(totalTarget).toLocaleString()}</td>
                          <td className="px-3 py-2 text-center font-black border-r border-slate-300 text-[18px]">{Math.round(totalReal).toLocaleString()}</td>
                          <td className="px-3 py-2 text-center font-black border-r border-slate-300 text-[18px]">{totalHtDisplay.toFixed(1)}%</td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
              );
            };

            const renderChiTietTable = () => {
              const isLuyKeMode = tnbDataMode === 'luyke';
              const dataSrc = isLuyKeMode ? dataLkSieuThiMapped : dataRtSieuThi;
              if (dataSrc.length === 0) return null;
              
              // Extract unique Ngành Hàng for the filter
              const nganhHangSet = new Set<string>();
              dataSrc.forEach(row => {
                const nh = (row[9] || '').trim().toUpperCase(); // Ngành Hàng is row[9]
                if (nh && nh !== '-') nganhHangSet.add(nh);
              });
              const dsNganhHang = Array.from(nganhHangSet).sort();
              
              const dsTinhList = [
                'Hậu Giang', 'Cần Thơ', 'Cà Mau', 'Sóc Trăng', 'Kiên Giang', 
                'Trà Vinh', 'Bạc Liêu', 'Vĩnh Long', 'Tiền Giang', 'Long An', 
                'Bến Tre', 'Đồng Tháp', 'An Giang'
              ];

              const filtered = dataSrc.filter(row => {
                const rowTinh = (row[0] || '').trim(); // Tỉnh is row[0]
                if (!rowTinh) return false;
                
                const rowKenh = (row[7] || '').trim().toUpperCase(); // Kênh is row[7]
                const rowNganhHang = (row[9] || '').trim().toUpperCase(); // Ngành hàng is row[9]
                
                if (rtFilterTinh && rtFilterTinh !== 'TẤT CẢ TỈNH') {
                  if (rowTinh.toLowerCase() !== rtFilterTinh.toLowerCase()) return false;
                }
                if (rtFilterKenh.length > 0) {
                  if (!rtFilterKenh.includes(rowKenh)) return false;
                }
                if (rtFilterNganhHang && rtFilterNganhHang !== 'TẤT CẢ NGÀNH HÀNG') {
                  if (rowNganhHang !== rtFilterNganhHang) return false;
                }
                
                const rowTenSieuThi = (row[6] || '').trim().toLowerCase();
                if (rowTenSieuThi.includes('(kho bán hàng lưu động)')) {
                  return false;
                }
                
                return true;
              });

              const parseNum = (str: any) => {
                if (!str) return 0;
                const clean = str.toString().replace(/,/g, '').replace(/ /g, '').replace(/[^0-9.-]/g, '');
                return parseFloat(clean) || 0;
              };

              const aggregateRows = (rows: any[]) => {
                const map = new Map<string, any[]>();
                rows.forEach(row => {
                  const st = (row[6] || '').trim().toUpperCase();
                  if (!map.has(st)) {
                    map.set(st, [...row]);
                  } else {
                    const existing = map.get(st)!;
                    const dtlk = parseNum(existing[2]) + parseNum(row[2]);
                    const target = parseNum(existing[3]) + parseNum(row[3]);
                    
                    existing[2] = dtlk.toString();
                    existing[3] = target.toString();
                    if (target > 0) {
                      existing[4] = ((dtlk / target) * 100).toFixed(0) + '%';
                    } else if (dtlk > 0) {
                      existing[4] = '100%';
                    } else {
                      existing[4] = '0%';
                    }
                  }
                });
                return Array.from(map.values());
              };

              const aggregatedFiltered = aggregateRows(filtered);

              const kenhOrder: Record<string, number> = { 'ĐML': 1, 'ĐMM': 2, 'ĐMS': 3, 'TGD': 4 };
              
              // Sort by %HT desc
              const sortedData = [...aggregatedFiltered].sort((a, b) => {
                const htA = parseFloat((a[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                const htB = parseFloat((b[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                return htB - htA;
              });
              
              // Group by Kênh (row[7])
              const groups: Record<string, any[]> = {};
              sortedData.forEach(row => {
                const kenh = (row[7] || '').trim().toUpperCase();
                if (!groups[kenh]) groups[kenh] = [];
                groups[kenh].push(row);
              });
              
              const kenhListToDisplay = Object.keys(groups)
                .sort((a, b) => (kenhOrder[a] || 99) - (kenhOrder[b] || 99));
              
              const now = new Date();
              const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
              const timeStr = isLuyKeMode
                ? `${String(new Date(now.getTime() - 86400000).getDate()).padStart(2, '0')}/${String(new Date(now.getTime() - 86400000).getMonth() + 1).padStart(2, '0')}`
                : `${todayStr} || ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

              const handleNhanXet = () => {
                const targetBosses = new Set<string>();
                sortedData.forEach(row => {
                  const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                  const htVal = parseFloat(htValStr);
                  if (!isNaN(htVal) && Math.round(htVal) === 0) {
                    const bossName = row[8] || '';
                    const match = bossName.match(/\d+/);
                    if (match) {
                      targetBosses.add(`@${match[0]}`);
                    }
                  }
                });
                
                if (targetBosses.size === 0) {
                  showNotification('Không có Boss nào có %HT = 0% để nhận xét.', 'error');
                  return;
                }

                const nganhHangText = rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TẤT CẢ NGÀNH HÀNG';
                const nhanXetText = `🚨 SIÊU THỊ CHƯA HIỆU QUẢ NGÀNH HÀNG "${nganhHangText}"\n${Array.from(targetBosses).join('\n')}`;
                
                navigator.clipboard.writeText(nhanXetText).then(() => {
                  showNotification('Đã copy nhận xét vào khay nhớ tạm!', 'success');
                }).catch(err => {
                  console.error('Failed to copy: ', err);
                  showNotification('Không thể copy text, vui lòng thử lại.', 'error');
                });
              };

              // Logic cho bảng XẾP HẠNG
              const filteredXepHang = dataSrc.filter(row => {
                const rowTinh = (row[0] || '').trim();
                if (!rowTinh) return false;
                
                if (rtFilterTinhXepHang && rtFilterTinhXepHang !== 'TẤT CẢ TỈNH') {
                  if (rowTinh.toLowerCase() !== rtFilterTinhXepHang.toLowerCase()) return false;
                }
                
                const rowKenh = (row[7] || '').trim().toUpperCase();
                if (rtFilterKenhXepHang.length > 0) {
                  if (!rtFilterKenhXepHang.includes(rowKenh)) return false;
                }
                
                const rowNganhHang = (row[9] || '').trim().toUpperCase();
                if (rtFilterNganhHang && rtFilterNganhHang !== 'TẤT CẢ NGÀNH HÀNG') {
                  if (rowNganhHang !== rtFilterNganhHang) return false;
                }
                
                const rowTenSieuThi = (row[6] || '').trim().toLowerCase();
                if (rowTenSieuThi.includes('(kho bán hàng lưu động)')) {
                  return false;
                }
                
                return true;
              });

              const aggregatedXepHang = aggregateRows(filteredXepHang);

              const sortedXepHang = [...aggregatedXepHang].sort((a, b) => {
                const htA = parseFloat((a[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                const htB = parseFloat((b[4] || '0%').replace('%', '').replace(',', '.').trim()) || 0;
                return htB - htA;
              });

              const rawTop20Count = Math.round(sortedXepHang.length * 0.2);
              const top20Count = Math.min(20, rawTop20Count);
              const top20Data = sortedXepHang.slice(0, top20Count);
              const bot20Data = top20Count > 0 ? sortedXepHang.slice(-top20Count) : [];

              const handleNhanXetXepHang = () => {
                const targetBosses = new Set<string>();
                bot20Data.forEach(row => {
                  const bossName = row[8] || '';
                  const match = bossName.match(/\d+/);
                  if (match) {
                    targetBosses.add(`@${match[0]}`);
                  }
                });
                
                if (targetBosses.size === 0) {
                  showNotification('Không có Boss nào trong Bot 20% để nhận xét.', 'error');
                  return;
                }

                const nganhHangText = rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TẤT CẢ NGÀNH HÀNG';
                const nhanXetText = `🚨 SIÊU THỊ BOTTOM 20% NGÀNH HÀNG (${nganhHangText})\n${Array.from(targetBosses).join('\n')}`;
                
                navigator.clipboard.writeText(nhanXetText).then(() => {
                  showNotification('Đã copy nhận xét vào khay nhớ tạm!', 'success');
                }).catch(err => {
                  console.error('Failed to copy: ', err);
                  showNotification('Không thể copy text, vui lòng thử lại.', 'error');
                });
              };

              return (
                <div className="flex flex-col gap-6 mt-8">
                  {!isExporting && (
                    <div className="w-fit inline-block bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-2">
                        <select 
                          className="w-full sm:w-auto min-w-[200px] px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-[15px] font-black shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%231d4ed8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-no-repeat bg-[position:right_12px_center] pr-10"
                          value={rtFilterNganhHang}
                          onChange={(e) => setRtFilterNganhHang(e.target.value)}
                        >
                          <option value="" className="bg-white text-slate-800 font-bold">TẤT CẢ NGÀNH HÀNG</option>
                          {dsNganhHang.map(nh => <option key={nh} value={nh} className="bg-white text-slate-800 font-bold">{nh}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {renderKhoTable()}
                  
                  <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
                    <div className="w-full max-w-max mx-auto xl:mx-0 xl:w-auto flex flex-col gap-4">
                      {!isExporting && (
                        <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
                          <div className="flex flex-wrap items-center gap-3">
                            <select 
                              className="w-full sm:w-auto min-w-[180px] px-4 py-2.5 bg-white text-blue-700 border-2 border-blue-500 rounded-xl text-[15px] font-black shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%231d4ed8%22%20stroke-width%3D%223%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-no-repeat bg-[position:right_12px_center] pr-10"
                              value={rtFilterTinh}
                              onChange={(e) => setRtFilterTinh(e.target.value)}
                            >
                              <option value="" className="bg-white text-slate-800 font-bold">TẤT CẢ TỈNH</option>
                              {dsTinhList.map(t => <option key={t} value={t} className="bg-white text-slate-800 font-bold">{t}</option>)}
                            </select>
                            <div className="flex flex-wrap items-center gap-2">
                              {['ĐML', 'ĐMM', 'ĐMS', 'TGD'].map(k => (
                                <label key={k} className={`flex items-center gap-2 cursor-pointer bg-white px-4 py-2.5 border-2 rounded-xl text-[15px] font-black transition-all shadow-sm ${rtFilterKenh.includes(k) ? 'border-blue-500 text-blue-700 shadow-blue-500/20 bg-blue-50/30' : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                  <input 
                                    type="checkbox" 
                                    className={`w-[18px] h-[18px] rounded focus:ring-blue-500 cursor-pointer ${rtFilterKenh.includes(k) ? 'text-blue-600 border-blue-500' : 'border-slate-300'}`}
                                    checked={rtFilterKenh.includes(k)}
                                    onChange={(e) => {
                                      if (e.target.checked) setRtFilterKenh([...rtFilterKenh, k]);
                                      else setRtFilterKenh(rtFilterKenh.filter(x => x !== k));
                                    }}
                                  />
                                  <span>{k}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3">
                            <button 
                              onClick={handleNhanXet}
                              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                            >
                              <MessageSquare size={16} /> TAG TÊN BOSS
                            </button>
                            <button 
                              onClick={() => exportImageShort(chiTietTableRef)} 
                              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                            >
                              <Download size={16} /> XUẤT ẢNH
                            </button>
                          </div>
                        </div>
                      )}
                      <div ref={chiTietTableRef} className={isExporting ? 'bg-white p-6 w-max inline-block' : 'w-full overflow-hidden shadow-lg shadow-slate-200/50 rounded-xl border border-slate-200'}>
                      <div className="w-full">
                        <table className="w-full border-collapse text-[15px] font-sans bg-white">
                          <thead className="sticky top-0 z-20">
                            <tr>
                              <th colSpan={4} className="bg-emerald-500 text-slate-900 px-4 py-3.5 text-center font-black text-[26px] uppercase tracking-wider whitespace-nowrap">
                                {rtFilterTinh && rtFilterTinh !== 'TẤT CẢ TỈNH' ? `${isLuyKeMode ? 'LUỸ KẾ' : 'REALTIME'} THI ĐUA - ${rtFilterTinh.toUpperCase()}` : (isLuyKeMode ? 'LUỸ KẾ THI ĐUA' : 'REALTIME THI ĐUA')}
                              </th>
                              <th colSpan={3} className="bg-amber-500 text-slate-900 px-4 py-3.5 text-right font-black text-[26px] whitespace-nowrap">
                                {timeStr}
                              </th>
                            </tr>
                            <tr className="bg-white" style={{ height: '4px' }}>
                              <th colSpan={7} className="p-0 border-0"></th>
                            </tr>
                            <tr className="bg-emerald-100 shadow-sm">
                              <th colSpan={7} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-b border-emerald-600 bg-emerald-500 text-slate-900 text-[22px]">
                                {rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TẤT CẢ NGÀNH HÀNG'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {kenhListToDisplay.map((kenh) => {
                              const groupData = groups[kenh];
                              return (
                                <React.Fragment key={kenh}>
                                  <tr className="bg-[#f8fafc] shadow-sm sticky top-[98px] z-10">
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-emerald-600 bg-emerald-500 text-slate-900">TỈNH</th>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-emerald-600 bg-emerald-500 text-slate-900">BOSS</th>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-emerald-600 bg-emerald-500 text-slate-900">KÊNH</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-emerald-600 bg-emerald-500 text-slate-900">SIÊU THỊ</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-amber-600 min-w-[60px] max-w-[60px] w-[60px] bg-amber-500 text-slate-900">TAR</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-amber-600 min-w-[60px] max-w-[60px] w-[60px] bg-amber-500 text-slate-900">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px] bg-amber-500 text-slate-900">%HT</th>
                                  </tr>
                                  {groupData.map((row, idx) => {
                                    const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                                    const htValRaw = parseFloat(htValStr);
                                    const isRedHT = isNaN(htValRaw) || htValRaw < 100;
                                    const htDisplay = isNaN(htValRaw) ? row[4] : `${Math.round(htValRaw)}%`;
                                    
                                    const realValStr = (row[2] || '0').trim(); 
                                    const realValRaw = parseFloat(realValStr.replace(',', '.'));
                                    const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                    const realDisplay = isNaN(realValRaw) ? row[2] : Number(realValRaw.toFixed(1));

                                    const tarValStr = (row[3] || '0').replace(',', '.').trim();
                                    const tarValRaw = parseFloat(tarValStr);
                                    const tarDisplay = isNaN(tarValRaw) ? row[3] : tarValRaw.toFixed(1);

                                    return (
                                      <tr key={`${kenh}-${idx}`} className="bg-white font-black text-[15px] border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[8]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] font-black whitespace-nowrap">{row[7]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">{row[6]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{tarDisplay}</td>
                                        <td className={`px-3 py-2 border-r border-slate-200 text-center ${isZeroReal ? 'text-slate-300' : 'text-slate-900'}`}>{realDisplay}</td>
                                        <td className={`px-3 py-2 text-center ${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}`}>{htDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                    {/* BẢNG XẾP HẠNG */}
                    <div className="w-full max-w-max mx-auto xl:mx-0 xl:w-auto flex flex-col gap-4">
                      {!isExporting && (
                        <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-3">
                          <select 
                            className="hidden"
                            value={rtFilterTinhXepHang}
                            onChange={(e) => setRtFilterTinhXepHang(e.target.value)}
                          >
                            <option value="">TẤT CẢ TỈNH</option>
                            {dsTinhList.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <div className="flex flex-wrap items-center gap-2">
                            {['ĐML', 'ĐMM', 'ĐMS', 'TGD'].map(k => (
                              <label key={k} className={`flex items-center gap-2.5 cursor-pointer bg-white px-4 py-2.5 border-2 rounded-xl text-[15px] font-black transition-all shadow-sm ${rtFilterKenhXepHang.includes(k) ? 'border-blue-500 text-blue-700 shadow-blue-500/20 bg-blue-50/30' : 'border-slate-300 text-slate-600 hover:border-blue-300 hover:bg-slate-50'}`}>
                                <input 
                                  type="checkbox" 
                                  className={`w-[18px] h-[18px] rounded focus:ring-blue-500 cursor-pointer ${rtFilterKenhXepHang.includes(k) ? 'text-blue-600 border-blue-500' : 'border-slate-300'}`}
                                  checked={rtFilterKenhXepHang.includes(k)}
                                  onChange={(e) => {
                                    if (e.target.checked) setRtFilterKenhXepHang([k]);
                                    else setRtFilterKenhXepHang([]);
                                  }}
                                />
                                <span>{k}</span>
                              </label>
                            ))}
                          </div>
                          <button 
                            onClick={handleNhanXetXepHang}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                          >
                            <MessageSquare size={16} /> TAG TÊN BOSS BOT 20%
                          </button>
                          <button 
                            onClick={() => exportImageShort(xepHangTableRef)} 
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm whitespace-nowrap text-sm"
                          >
                            <Download size={16} /> XUẤT ẢNH XẾP HẠNG
                          </button>
                        </div>
                      )}

                      <div ref={xepHangTableRef} className={`w-full overflow-hidden ${isExporting ? 'bg-white p-6' : 'shadow-lg shadow-slate-200/50 rounded-xl border border-slate-200'}`}>
                        <div className="w-full">
                          <table className="w-full border-collapse text-[15px] font-sans bg-white">
                            <thead className="sticky top-0 z-20">
                              <tr>
                                <th colSpan={4} className="bg-emerald-500 text-slate-900 px-4 py-3.5 text-center font-black text-[26px] uppercase tracking-wider whitespace-nowrap">
                                  BẢNG XẾP HẠNG TOP/BOT 20% %HT
                                </th>
                                <th colSpan={3} className="bg-amber-500 text-slate-900 px-4 py-3.5 text-right font-black text-[26px] whitespace-nowrap">
                                  {timeStr}
                                </th>
                              </tr>
                              <tr className="bg-white" style={{ height: '4px' }}>
                                <th colSpan={7} className="p-0 border-0"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {top20Data.length > 0 && (
                                <React.Fragment>
                                  <tr className="bg-emerald-100 shadow-sm sticky top-[56px] z-10">
                                    <th colSpan={7} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-b border-white bg-emerald-500 text-slate-900 text-lg">
                                      {rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'TOP 20% SIÊU THỊ'}
                                    </th>
                                  </tr>
                                  <tr className="bg-[#f8fafc] shadow-sm sticky top-[95px] z-10">
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white bg-emerald-500 text-slate-900 min-w-[100px] max-w-[100px] w-[100px]">TỈNH</th>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white bg-emerald-500 text-slate-900 min-w-[140px] max-w-[140px] w-[140px]">BOSS</th>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white bg-emerald-500 text-slate-900 min-w-[70px] max-w-[70px] w-[70px]">KÊNH</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white bg-emerald-500 text-slate-900 min-w-[250px]">SIÊU THỊ</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white min-w-[60px] max-w-[60px] w-[60px] bg-amber-500 text-slate-900">TAR</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white min-w-[60px] max-w-[60px] w-[60px] bg-amber-500 text-slate-900">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px] bg-amber-500 text-slate-900">%HT</th>
                                  </tr>
                                  {top20Data.map((row, idx) => {
                                    const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                                    const htValRaw = parseFloat(htValStr);
                                    const isRedHT = isNaN(htValRaw) || htValRaw < 100;
                                    const htDisplay = isNaN(htValRaw) ? row[4] : `${Math.round(htValRaw)}%`;
                                    
                                    const realValStr = (row[2] || '0').trim(); 
                                    const realValRaw = parseFloat(realValStr.replace(',', '.'));
                                    const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                    const realDisplay = isNaN(realValRaw) ? row[2] : Number(realValRaw.toFixed(1));

                                    const tarValStr = (row[3] || '0').replace(',', '.').trim();
                                    const tarValRaw = parseFloat(tarValStr);
                                    const tarDisplay = isNaN(tarValRaw) ? row[3] : tarValRaw.toFixed(1);

                                    return (
                                      <tr key={`top-${idx}`} className="bg-white font-black text-[15px] border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[8]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] font-black whitespace-nowrap">{row[7]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">{row[6]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{tarDisplay}</td>
                                        <td className={`px-3 py-2 border-r border-slate-200 text-center ${isZeroReal ? 'text-slate-300' : 'text-slate-900'}`}>{realDisplay}</td>
                                        <td className={`px-3 py-2 text-center ${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}`}>{htDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              )}

                              {bot20Data.length > 0 && (
                                <React.Fragment>
                                  <tr className="bg-rose-100 shadow-sm sticky z-10" style={{ top: top20Data.length > 0 ? 'auto' : '56px' }}>
                                    <th colSpan={7} className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-b border-white bg-rose-500 text-white text-lg">
                                      {rtFilterNganhHang ? rtFilterNganhHang.toUpperCase() : 'BOTTOM 20% SIÊU THỊ'}
                                    </th>
                                  </tr>
                                  <tr className="bg-[#f8fafc] shadow-sm sticky z-10" style={{ top: top20Data.length > 0 ? 'auto' : '95px' }}>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white bg-rose-500 text-white min-w-[100px] max-w-[100px] w-[100px]">TỈNH</th>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white bg-rose-500 text-white min-w-[140px] max-w-[140px] w-[140px]">BOSS</th>
                                    <th className="px-3 py-2 text-left font-black uppercase whitespace-nowrap border-r border-white bg-rose-500 text-white min-w-[70px] max-w-[70px] w-[70px]">KÊNH</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white bg-rose-500 text-white min-w-[250px]">SIÊU THỊ</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white min-w-[60px] max-w-[60px] w-[60px] bg-rose-500 text-white">TAR</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap border-r border-white min-w-[60px] max-w-[60px] w-[60px] bg-rose-500 text-white">{isLuyKeMode ? 'L.KẾ' : 'Real'}</th>
                                    <th className="px-3 py-2 text-center font-black uppercase whitespace-nowrap min-w-[60px] max-w-[60px] w-[60px] bg-rose-500 text-white">%HT</th>
                                  </tr>
                                  {bot20Data.map((row, idx) => {
                                    const htValStr = (row[4] || '0%').replace('%', '').replace(',', '.').trim();
                                    const htValRaw = parseFloat(htValStr);
                                    const isRedHT = isNaN(htValRaw) || htValRaw < 100;
                                    const htDisplay = isNaN(htValRaw) ? row[4] : `${Math.round(htValRaw)}%`;
                                    
                                    const realValStr = (row[2] || '0').trim(); 
                                    const realValRaw = parseFloat(realValStr.replace(',', '.'));
                                    const isZeroReal = isNaN(realValRaw) || realValRaw === 0;
                                    const realDisplay = isNaN(realValRaw) ? row[2] : Number(realValRaw.toFixed(1));

                                    const tarValStr = (row[3] || '0').replace(',', '.').trim();
                                    const tarValRaw = parseFloat(tarValStr);
                                    const tarDisplay = isNaN(tarValRaw) ? row[3] : tarValRaw.toFixed(1);

                                    return (
                                      <tr key={`bot-${idx}`} className="bg-white font-black text-[15px] border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-900 whitespace-nowrap">{row[0]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#b45309] whitespace-nowrap">{row[8]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-[#0f766e] font-black whitespace-nowrap">{row[7]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-slate-700 whitespace-nowrap">{row[6]}</td>
                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700 bg-amber-50/20">{tarDisplay}</td>
                                        <td className={`px-3 py-2 border-r border-slate-200 text-center ${isZeroReal ? 'text-slate-300' : 'text-slate-900'}`}>{realDisplay}</td>
                                        <td className={`px-3 py-2 text-center ${isRedHT ? 'text-red-600' : 'text-[#0369a1]'}`}>{htDisplay}</td>
                                      </tr>
                                    );
                                  })}
                                </React.Fragment>
                              )}
                              
                              {top20Data.length === 0 && bot20Data.length === 0 && (
                                <tr>
                                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                                    Không có dữ liệu cho kênh này
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            const renderVungScorecard = () => {
              const isLuyKeMode = tnbDataMode === 'luyke';
              const dataSrc = isLuyKeMode ? dataLkSieuThiMapped : dataRtSieuThi;
              if (dataSrc.length === 0) return null;

              const now = new Date();
              const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
              const currentDay = Math.max(1, now.getDate() - 1);
              
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = `${String(yesterday.getDate()).padStart(2, '0')}/${String(yesterday.getMonth() + 1).padStart(2, '0')}/${yesterday.getFullYear()}`;

              const parseNum = (str: any) => {
                if (!str) return 0;
                const clean = str.toString().replace(/,/g, '').replace(/ /g, '').replace(/[^0-9.-]/g, '');
                return parseFloat(clean) || 0;
              };

              // Collect all unique categories
              const rawCategories = Array.from(new Set(
                dataSrc
                  .map(row => (row[9] || '').toString().trim())
                  .filter(cat => cat && cat !== '-')
              ));

              // Resolve group for each category
              const resolveGroup = (catName: string) => {
                const cfg = categoryConfig.find(c => c.name.trim().toUpperCase() === catName.trim().toUpperCase());
                if (cfg) {
                  const g = cfg.group.trim().toUpperCase();
                  if (g === 'CE' || g === 'C.E & GD' || g === 'C.E & GIA DỤNG') return 'CE';
                  if (g === 'ICT') return 'ICT';
                  if (g === 'DỊCH VỤ') return 'DỊCH VỤ';
                }
                const upper = catName.toUpperCase();
                if (upper.includes('SIM') || upper.includes('BẢO HIỂM') || upper.includes('VAS') || upper.includes('TRẢ CHẬM') || upper.includes('VÍ TRẢ SAU') || upper.includes('TIỀN MẶT') || upper.includes('OTT') || upper.includes('DỊCH VỤ') || upper.includes('MỞ THẺ') || upper.includes('NẠP RÚT') || upper.includes('TPBANK')) {
                  return 'DỊCH VỤ';
                }
                if (upper.includes('CAMERA') || upper.includes('LOA') || upper.includes('LAPTOP') || upper.includes('SẠC DỰ PHÒNG') || upper.includes('TAI NGHE') || upper.includes('ĐIỆN THOẠI') || upper.includes('ĐỒNG HỒ') || upper.includes('TABLET')) {
                  return 'ICT';
                }
                return 'CE';
              };

              // Aggregate function
              const aggregateForBrands = (channelBrands: string[]) => {
                const map: Record<string, { dtlk: number, target: number, percent: number | null }> = {};
                
                rawCategories.forEach(cat => {
                  map[cat] = { dtlk: 0, target: 0, percent: null };
                });

                dataSrc.forEach(row => {
                  const brand = (row[7] || '').toString().trim().toUpperCase();
                  const cat = (row[9] || '').toString().trim();
                  if (channelBrands.includes(brand) && cat && cat !== '-') {
                    if (!map[cat]) {
                      map[cat] = { dtlk: 0, target: 0, percent: null };
                    }
                    map[cat].dtlk += parseNum(row[2]);
                    map[cat].target += parseNum(row[3]);
                  }
                });

                Object.keys(map).forEach(cat => {
                  const item = map[cat];
                  if (item.target > 0) {
                    if (isLuyKeMode) {
                      item.percent = ((item.dtlk / currentDay) * totalDays) / item.target * 100;
                    } else {
                      item.percent = (item.dtlk / item.target) * 100;
                    }
                  } else {
                    item.percent = null;
                  }
                });

                return map;
              };

              const tgdDataMap = aggregateForBrands(['TGD', 'AAR']);
              const dmxDataMap = aggregateForBrands(['ĐML', 'ĐMM', 'ĐMS']);

              const prepareList = (dataMap: typeof tgdDataMap) => {
                const ictList: any[] = [];
                const dichVuList: any[] = [];
                const ceList: any[] = [];

                Object.keys(dataMap).forEach(cat => {
                  const g = resolveGroup(cat);
                  const item = { name: cat, ...dataMap[cat] };
                  if (g === 'ICT') ictList.push(item);
                  else if (g === 'DỊCH VỤ') dichVuList.push(item);
                  else ceList.push(item);
                });

                const sortFn = (a: any, b: any) => {
                  const valA = a.percent !== null ? a.percent : 0;
                  const valB = b.percent !== null ? b.percent : 0;
                  return valB - valA;
                  //
                  //
                  //
                };

                return {
                  ict: [...ictList].sort(sortFn),
                  dichVu: [...dichVuList].sort(sortFn),
                  ce: [...ceList].sort(sortFn)
                };
              };

              const tgdLists = prepareList(tgdDataMap);
              const dmxLists = prepareList(dmxDataMap);

              const getSummary = (list: any[]) => {
                const totalWithTarget = list.filter(x => x.target > 0).length;
                const achieved = list.filter(x => x.target > 0 && x.percent !== null && x.percent >= 100).length;
                const ratio = `${achieved}/${totalWithTarget}`;
                const pct = totalWithTarget > 0 ? Math.round((achieved / totalWithTarget) * 100) : 0;
                return { ratio, pct, totalWithTarget, achieved };
              };

              const renderSideTable = (
                title: string,
                channelKenh: string,
                subtitle2: string | React.ReactNode,
                lists: typeof tgdLists,
                theme: 'TGD' | 'ĐMX',
                wrapperRef: React.RefObject<HTMLDivElement>
              ) => {
                const ictSum = getSummary(lists.ict);
                const dvSum = getSummary(lists.dichVu);
                const ceSum = getSummary(lists.ce);

                const includeCE = theme !== 'TGD';

                const grandTotalWithTarget = ictSum.totalWithTarget + dvSum.totalWithTarget + (includeCE ? ceSum.totalWithTarget : 0);
                const grandAchieved = ictSum.achieved + dvSum.achieved + (includeCE ? ceSum.achieved : 0);
                const grandRatio = `${grandAchieved}/${grandTotalWithTarget}`;
                const grandPct = grandTotalWithTarget > 0 ? Math.round((grandAchieved / grandTotalWithTarget) * 100) : 0;

                const headerBg = theme === 'TGD' ? 'bg-[#fbbf24]' : 'bg-[#60a5fa]';
                const subHeaderBg = theme === 'TGD' ? 'bg-[#fde047]' : 'bg-[#93c5fd]';
                const numBg = theme === 'TGD' ? 'bg-[#fef08a]' : 'bg-[#bfdbfe]';
                const footerBg = theme === 'TGD' ? 'bg-[#fbbf24]' : 'bg-[#60a5fa]';

                const rows: { catName: string; percent: number | null; target: number; dtlk: number; group: 'ICT' | 'DỊCH VỤ' | 'C.E & GD'; isFirst: boolean; groupLength: number; summary: any }[] = [];

                lists.ict.forEach((item, idx) => {
                  rows.push({
                    catName: item.name,
                    percent: item.percent,
                    target: item.target,
                    dtlk: item.dtlk,
                    group: 'ICT',
                    isFirst: idx === 0,
                    groupLength: lists.ict.length,
                    summary: ictSum
                  });
                });

                lists.dichVu.forEach((item, idx) => {
                  rows.push({
                    catName: item.name,
                    percent: item.percent,
                    target: item.target,
                    dtlk: item.dtlk,
                    group: 'DỊCH VỤ',
                    isFirst: idx === 0,
                    groupLength: lists.dichVu.length,
                    summary: dvSum
                  });
                });

                if (includeCE) {
                  lists.ce.forEach((item, idx) => {
                    rows.push({
                      catName: item.name,
                      percent: item.percent,
                      target: item.target,
                      dtlk: item.dtlk,
                      group: 'C.E & GD',
                      isFirst: idx === 0,
                      groupLength: lists.ce.length,
                      summary: ceSum
                    });
                  });
                }

                return (
                  <div className="flex flex-col w-full border border-slate-400 rounded-[24px] overflow-hidden bg-white shadow-lg relative">
                    {/* Header */}
                    <div className={`${headerBg} p-6 flex flex-col gap-1 border-b border-slate-400 relative`}>
                      <button
                        onClick={() => exportImage(wrapperRef)}
                        className="export-btn absolute top-6 right-6 bg-black/25 hover:bg-black/35 text-white px-3 py-1.5 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download size={14} /> Xuất ảnh {title}
                      </button>
                      <h2 className="text-7xl font-black text-black tracking-tight leading-none">{title}</h2>
                      <p className="text-[14px] font-black text-black uppercase tracking-wider mt-1">{channelKenh}</p>
                      <div className="text-[13px] font-bold text-slate-905 uppercase mt-2 flex items-center gap-2">
                        <span>{isLuyKeMode ? "LUỸ KẾ ĐẾN NGÀY :" : "REALTIME ĐẾN THỜI GIAN :"}</span>
                        <span className="text-red-600 font-black">
                          {isLuyKeMode ? yesterdayStr : (() => {
                            const pad = (n: number) => String(n).padStart(2, '0');
                            return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} || NGÀY ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
                          })()}
                        </span>
                      </div>
                      {subtitle2 && (
                        <div className="text-[11px] font-bold text-slate-900 border-t border-black/15 pt-2 mt-2 leading-tight uppercase">
                          {subtitle2}
                        </div>
                      )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-400 text-[15px]">
                        <thead>
                          <tr className={`${subHeaderBg} text-black font-black uppercase text-center border-b border-slate-400`}>
                            <th className="py-2.5 px-1 border-r border-b border-slate-400 w-10"></th>
                            <th className="py-2.5 px-2 border-r border-b border-slate-400 w-28 whitespace-nowrap">NGÀNH HÀNG</th>
                            <th className="py-2.5 px-3 border-r border-b border-slate-400 text-left">NHÓM HÀNG</th>
                             <th className="py-2.5 px-2 border-r border-b border-slate-400 w-32">{isLuyKeMode ? "% DỰ KIẾN" : "% HOÀN THÀNH"}</th>
                            <th colSpan={2} className="py-2.5 px-2 w-36 leading-tight text-[12.5px] border-b border-slate-400 whitespace-nowrap">TỈ LỆ HOÀN THÀNH<br/>TRÊN 100%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, index) => {
                            const percentVal = row.percent;
                            let pctStr = '0%';
                            let pctClass = 'text-[#991b1b] font-black';
                            let bgClass = 'bg-[#fee2e2]';
                            if (percentVal !== null) {
                              pctStr = Math.round(percentVal) + '%';
                              if (percentVal >= 100) {
                                pctClass = 'text-[#166534] font-black';
                                bgClass = 'bg-[#d1fae5]';
                              } else {
                                pctClass = 'text-[#991b1b] font-black';
                                bgClass = 'bg-[#fee2e2]';
                              }
                            }

                            return (
                              <tr key={index} className="hover:bg-slate-50 font-bold text-slate-900">
                                <td className={`py-1 px-1 border-r border-b border-slate-400 text-center ${numBg} font-black`}>
                                  {index + 1}
                                </td>
                                {row.isFirst ? (
                                  <td
                                    rowSpan={row.groupLength}
                                    className="py-1 px-2 border-r border-b border-slate-400 text-center font-black text-slate-900 bg-white align-middle text-[15px] whitespace-nowrap"
                                  >
                                    {row.group}
                                  </td>
                                ) : null}
                                <td className="py-1 px-3 border-r border-b border-slate-400 text-left font-bold text-slate-900 uppercase">
                                  {row.catName}
                                </td>
                                <td className={`py-1 px-2 border-r border-b border-slate-400 text-center ${bgClass} ${pctClass}`}>
                                  {pctStr}
                                </td>
                                {row.isFirst ? (
                                  <>
                                    <td
                                      rowSpan={row.groupLength}
                                      className="py-1 px-2 border-r border-b border-slate-400 text-center font-black text-slate-900 bg-white align-middle"
                                    >
                                      {row.summary.ratio}
                                    </td>
                                    <td
                                      rowSpan={row.groupLength}
                                      className="py-1 px-2 border-r border-b border-slate-400 text-center font-black text-red-600 bg-white align-middle text-[16px]"
                                    >
                                      {row.summary.pct}%
                                    </td>
                                  </>
                                ) : null}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className={`${footerBg} text-black font-black uppercase text-[15px] h-[54px]`}>
                            <td colSpan={3} className="px-4 text-center align-middle font-black border-r border-b border-slate-400 h-[54px] leading-normal">
                              TỔNG CỘNG
                            </td>
                            <td className="px-2 border-r border-b border-slate-400 align-middle h-[54px] leading-normal"></td>
                            <td className="px-2 border-r border-b border-slate-400 text-center align-middle font-black h-[54px] leading-normal">
                              {grandRatio}
                            </td>
                            <td className="px-2 border-b border-slate-400 text-center align-middle font-black text-red-700 text-[17px] h-[54px] leading-normal">
                              {grandPct}%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                );
              };

              return (
                <div ref={vungScorecardRef} className="p-0 bg-transparent rounded-[32px]">
                  <div className="bg-slate-100 rounded-[32px] border border-slate-200 p-6 lg:p-10 mt-12 w-full max-w-[1600px] mx-auto" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
                    <div className="export-btn flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-6 bg-indigo-600 rounded-full" />
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                          BẢNG THI ĐUA VÙNG - TGD & ĐMX
                        </h3>
                      </div>
                      <button
                        onClick={() => exportImage(vungScorecardRef)}
                        className="export-btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-2xl font-black text-sm uppercase flex items-center gap-2 transition-all shadow-md shadow-indigo-150 cursor-pointer"
                      >
                        <Download size={16} /> Xuất ảnh chung 2 bảng
                      </button>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                      <div ref={tgdTableRef} className="p-0 bg-transparent rounded-[24px]">
                        {renderSideTable(
                          'TGD',
                          'KÊNH : TGD + TZ',
                          null,
                          tgdLists,
                          'TGD',
                          tgdTableRef
                        )}
                      </div>
                      <div ref={dmxTableRef} className="p-0 bg-transparent rounded-[24px]">
                        {renderSideTable(
                          'ĐMX',
                          'KÊNH : ĐML + ĐMM + ĐMS + LƯU ĐỘNG',
                          'D.THU C.E + GD DO TGD + TZ BÁN SẼ TÍNH CHO VÙNG, KHÔNG CỘNG CHO ĐMX',
                          dmxLists,
                          'ĐMX',
                          dmxTableRef
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            };

            if (activeTab === 'NHAN_VIEN') {
              return (
                <div className="flex flex-col gap-8 w-full">
                  {renderPivotTable(false)}
                </div>
              );
            }

            if (activeTab === 'VUNG') {
              const handleCopyVungSummary = () => {
                const rows = searchedRowsRef.current || [];
                if (rows.length === 0) {
                  showNotification('Chưa có dữ liệu để copy.', 'error');
                  return;
                }
                
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const isLuyKeMode = tnbDataMode === 'luyke';

                // Build kênh title
                let kenhTitle = 'TẤT CẢ KÊNH';
                if (sieuThiFilterKenh.length > 0) {
                  const hasDMX = sieuThiFilterKenh.some(k => ['ĐML', 'ĐMM', 'ĐMS'].includes(k));
                  const hasTGD = sieuThiFilterKenh.includes('TGD');
                  if (hasDMX && hasTGD) kenhTitle = 'ĐMX & TGD';
                  else if (hasDMX) kenhTitle = 'ĐMX';
                  else if (hasTGD) kenhTitle = 'TGD';
                  else kenhTitle = sieuThiFilterKenh.join(', ');
                }

                const timeStr = isLuyKeMode
                  ? (() => {
                      const yesterday = new Date(now);
                      yesterday.setDate(yesterday.getDate() - 1);
                      return `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`;
                    })()
                  : `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

                const modeText = isLuyKeMode ? 'LUỸ KẾ' : 'REALTIME';

                let text = `🏆 KẾT QUẢ THI ĐUA NGÀNH HÀNG KÊNH ${kenhTitle} – CẬP NHẬT ${modeText} ĐẾN ${timeStr}\n\n`;
                
                text += `⚠️ TỈNH CHƯA HIỆU QUẢ THI ĐUA\n\n`;

                // Filter provinces with tỷ lệ < 50%, sort ascending (worst first)
                const under50 = [...rows].filter(r => r.tyLe < 50).sort((a, b) => b.tyLe - a.tyLe);
                
                if (under50.length === 0) {
                  text += `✅ Tất cả tỉnh đều đạt trên 50%!`;
                } else {
                  under50.forEach((r, idx) => {
                    const emoji = r.tyLe >= 30 ? '🟡' : '🔴';
                    text += `${idx + 1}. ${emoji} ${r.prov}: ${r.datCount}/${r.effectiveTotalCats} (${r.tyLe.toFixed(0)}%)\n`;
                  });
                }
                
                navigator.clipboard.writeText(text).then(() => {
                  showNotification('Đã copy kết quả thi đua vào khay nhớ tạm!', 'success');
                }).catch(err => {
                  console.error('Failed to copy: ', err);
                  showNotification('Không thể copy text, vui lòng thử lại.', 'error');
                });
              };

              return (
                <div className="flex flex-col gap-8 w-full">
                  <button
                    onClick={handleCopyVungSummary}
                    className="self-start flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-black text-[15px] uppercase tracking-wide transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
                  >
                    <MessageSquare size={20} strokeWidth={2.5} />
                    <span>
                      🏆 KẾT QUẢ THI ĐUA NGÀNH HÀNG – CẬP NHẬT {tnbDataMode === 'luyke' ? 'LUỸ KẾ' : 'REALTIME'}
                    </span>
                  </button>
                  {renderPivotTable(true, rtTableRef)}
                  {renderVungScorecard()}
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-8 w-full items-start">
                {renderPivotTable(false, tableRef)}
                {renderChiTietTable()}
              </div>
            );
          })()}
            </div>
          </div>
        ) : (
        <>

        {/* Data Table */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden flex flex-col relative min-h-[500px]">
          {isSyncing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <RefreshCw className="animate-spin text-indigo-600 mb-4" size={40} />
              <p className="text-slate-800 font-bold">Đang tải và xử lý dữ liệu lớn...</p>
              <p className="text-slate-500 text-sm mt-2">Vui lòng đợi trong giây lát</p>
            </div>
          )}
          
          <div className="flex-1 w-full overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <th className="px-4 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 w-16 text-center">STT</th>
                  {currentHeaders.map((header, idx) => (
                    <th key={idx} className="px-4 py-4 text-left text-xs font-black text-slate-700 uppercase tracking-wider border-b border-r border-slate-200 bg-slate-50 min-w-[240px] max-w-[240px] w-[240px] truncate" title={header}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-500 border-r border-slate-100 text-center font-medium">
                        {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                      </td>
                      {currentHeaders.map((_, colIndex) => (
                        <td key={colIndex} className="px-4 py-3 text-sm text-slate-700 border-r border-slate-100 min-w-[240px] max-w-[240px] w-[240px] truncate" title={row[colIndex]}>
                          {row[colIndex] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={currentHeaders.length + 1} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <LayoutGrid size={40} className="text-slate-300" />
                        <p className="font-medium text-lg">Chưa có dữ liệu</p>
                        <p className="text-sm">Hãy đồng bộ từ Google Sheet để hiển thị.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-500 font-medium">
                Hiển thị <span className="font-bold text-slate-700">{((currentPage - 1) * rowsPerPage) + 1}</span> - <span className="font-bold text-slate-700">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> trên <span className="font-bold text-slate-700">{filteredData.length}</span>
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Trước
                </button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{currentPage}</span>
                  <span className="text-sm text-slate-400">/</span>
                  <span className="text-sm font-medium text-slate-500">{totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
        
        </>
        )}

        {lastSync && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium pb-8">
            <CheckCircle2 size={14} className="text-emerald-500" />
            Lần cập nhật cuối: {new Date(lastSync).toLocaleString('vi-VN')}
          </div>
        )}
      </div>
      {/* Modal for Image Preview */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
}
