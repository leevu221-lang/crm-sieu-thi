import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import { 
  Store, ArrowRight, Save, Loader2, Sparkles, Info, CheckCircle2, Copy, Check, X, ShieldCheck,
  FileSpreadsheet, Eye
} from 'lucide-react';
import { isValidStoreName, normalizeStoreId, formatMarketName } from './RTST/utils';
import * as XLSX from 'xlsx';
import { db } from '../firebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { BossStoreTableModal, BossStoreItem } from '../components/BossStoreTableModal';

interface StoreDeclarationProps {
  onComplete: () => void;
}

export default function StoreDeclaration({ onComplete }: StoreDeclarationProps) {
  const { userProfile, updateStoreName } = useAuth();
  const { setCurrentStoreId } = useStore();
  const maKho = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '';
  const isNewUser = userProfile?.declarationCompleted === false;
  
  const [store1, setStore1] = useState('');
  const [store2, setStore2] = useState('');
  const [store3, setStore3] = useState('');
  const [store4, setStore4] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Tự động chuẩn hóa & gọt mã kho nếu người dùng copy cả "1841 - ĐML_CMA_CMA - 155A..." từ báo cáo BI
  const cleanStoreInput = (val: string): string => {
    if (!val) return '';
    let cleaned = val.trim();
    cleaned = cleaned.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG)[_\s-])/i, '').trim();
    // Khắc phục lỗi dấu gạch nối chèn nhầm vào ngày/tháng/số nhà (ví dụ "Đường -19/5" -> "Đường 19/5")
    cleaned = cleaned.replace(/(Đường|Đ\.|Phố)\s*-\s*(\d+)/gi, '$1 $2').trim();
    return cleaned;
  };

  // Phân quyền: CHỈ hiển thị tính năng DS BOSS cho User 43751
  const is43751 = useMemo(() => {
    // 1. Kiểm tra từ AuthContext
    const upUsername = String(userProfile?.username || '').trim();
    const upMnv = String(userProfile?.ma_nhan_vien || '').trim();
    const upId = String(userProfile?.user_id || '').trim();
    if (upUsername === '43751' || upMnv === '43751' || upId === '43751') return true;

    // 2. Kiểm tra từ LocalStorage cache
    try {
      const stored = localStorage.getItem('userProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          String(parsed?.username || '').trim() === '43751' ||
          String(parsed?.ma_nhan_vien || '').trim() === '43751' ||
          String(parsed?.user_id || '').trim() === '43751'
        ) {
          return true;
        }
      }
    } catch {}

    const directUser = localStorage.getItem('username') || localStorage.getItem('user_id');
    if (String(directUser || '').trim() === '43751') return true;

    return false;
  }, [userProfile]);

  // State DS BOSS lưu Firebase
  const [dsBossList, setDsBossList] = useState<BossStoreItem[]>(() => {
    try {
      const cached = localStorage.getItem('rtst_ds_boss_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.rows) ? parsed.rows : [];
      }
    } catch {}
    return [];
  });
  const [dsBossHeaders, setDsBossHeaders] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('rtst_ds_boss_config');
      if (cached) {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed.headers) ? parsed.headers : [];
      }
    } catch {}
    return [];
  });
  const [isUploadingBoss, setIsUploadingBoss] = useState(false);
  const [showBossModal, setShowBossModal] = useState(false);
  const [isUpdatingBoss, setIsUpdatingBoss] = useState(false);

  // Realtime listener DS BOSS từ Firebase Firestore (Cost-optimized, 0 polling)
  useEffect(() => {
    const docRef = doc(db, 'app_settings', 'ds_boss_config');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.rows)) {
          setDsBossList(data.rows);
          if (Array.isArray(data.headers)) {
            setDsBossHeaders(data.headers);
          }
          try {
            localStorage.setItem('rtst_ds_boss_config', JSON.stringify({
              headers: data.headers || [],
              rows: data.rows,
            }));
          } catch {}
        }
      }
    }, (err) => {
      console.warn('[StoreDeclaration] Firebase DS BOSS listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  // Lọc các siêu thị khớp mã kho Cột B (MST) hoặc Cột D/E với mã kho đăng nhập
  const matchedBossStores = useMemo(() => {
    if (!maKho || dsBossList.length === 0) return [];
    const cleanTarget = String(maKho).trim().replace(/^0+/, '');
    return dsBossList.filter((r) => {
      const rowKho = String(r.maKho || '').trim().replace(/^0+/, '');
      const d = String(r.mstSieuThi || '').trim();
      const e = String(r.base || '').trim();
      return (rowKho !== '' && rowKho === cleanTarget) ||
             d.startsWith(`${cleanTarget} -`) || d.startsWith(`${maKho} -`) ||
             e.startsWith(`${cleanTarget} -`) || e.startsWith(`${maKho} -`);
    });
  }, [dsBossList, maKho]);

  // Helper kiểm tra xem giá trị có phải là placeholder không hợp lệ (như "Siêu thị 2323", "Offline Mode", ...)
  const isPlaceholderStore = (val: string) => {
    if (!val) return true;
    const v = val.trim();
    if (/^siêu\s*thị\s*\d+/i.test(v)) return true;
    if (/offline\s*mode/i.test(v)) return true;
    if (!isValidStoreName(v)) return true;
    return false;
  };

  // Hàm tự động điền các siêu thị theo thứ tự từ trên xuống dưới:
  // Dòng đầu điền vào Siêu thị 1, tương tự các dòng tiếp theo điền vào Siêu thị 2, 3, 4
  const applyAutoFill = useCallback((force = false) => {
    if (matchedBossStores.length === 0) return false;
    const m1 = cleanStoreInput(matchedBossStores[0]?.tenSieuThi || '');
    const m2 = cleanStoreInput(matchedBossStores[1]?.tenSieuThi || '');
    const m3 = cleanStoreInput(matchedBossStores[2]?.tenSieuThi || '');
    const m4 = cleanStoreInput(matchedBossStores[3]?.tenSieuThi || '');

    if (force) {
      if (m1) setStore1(m1);
      setStore2(m2);
      setStore3(m3);
      setStore4(m4);
    } else {
      setStore1((prev) => (isPlaceholderStore(prev) || !prev ? m1 : prev));
      setStore2((prev) => (isPlaceholderStore(prev) || !prev ? m2 : prev));
      setStore3((prev) => (isPlaceholderStore(prev) || !prev ? m3 : prev));
      setStore4((prev) => (isPlaceholderStore(prev) || !prev ? m4 : prev));
    }
    return true;
  }, [matchedBossStores]);

  // Tự động điền khi danh sách BOSS hoặc mã kho thay đổi:
  // Yêu cầu khi cột MST cùng mã kho đăng nhập thì dòng đầu sẽ điền vào Siêu thị 1, tương tự các dòng tiếp theo
  useEffect(() => {
    if (matchedBossStores.length > 0) {
      const m1 = cleanStoreInput(matchedBossStores[0]?.tenSieuThi || '');
      const m2 = cleanStoreInput(matchedBossStores[1]?.tenSieuThi || '');
      const m3 = cleanStoreInput(matchedBossStores[2]?.tenSieuThi || '');
      const m4 = cleanStoreInput(matchedBossStores[3]?.tenSieuThi || '');

      setStore1((prev) => {
        if (isPlaceholderStore(prev) || !prev || !matchedBossStores.some((r) => cleanStoreInput(r.tenSieuThi) === prev)) {
          return m1;
        }
        return prev;
      });

      setStore2((prev) => {
        if (isPlaceholderStore(prev) || !prev) return m2;
        return prev;
      });

      setStore3((prev) => {
        if (isPlaceholderStore(prev) || !prev) return m3;
        return prev;
      });

      setStore4((prev) => {
        if (isPlaceholderStore(prev) || !prev) return m4;
        return prev;
      });
    }
  }, [matchedBossStores]);

  // Handler tải file Excel DS BOSS (chỉ 43751) - Đọc 4 cột B, C, D, E như Hình 1
  const handleUploadBossExcel = async (file: File) => {
    if (!is43751) {
      setStatusMessage({ type: 'error', text: 'Chỉ tài khoản Quản trị viên 43751 mới có quyền tải lên DS BOSS!' });
      return;
    }
    setIsUploadingBoss(true);
    setStatusMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      if (!jsonData || jsonData.length === 0) {
        throw new Error('File Excel rỗng!');
      }

      // Tìm dòng tiêu đề và xác định chính xác vị trí 4 cột: MST, SIÊU THỊ, MST + SIÊU THỊ, BASE
      let startRowIdx = 0;
      let colIdxMst = -1;
      let colIdxSieuThi = -1;
      let colIdxMstSieuThi = -1;
      let colIdxBase = -1;
      const detectedHeaders: string[] = ['MST', 'SIÊU THỊ', 'MST + SIÊU THỊ', 'BASE'];

      for (let r = 0; r < Math.min(10, jsonData.length); r++) {
        const row = jsonData[r];
        if (!Array.isArray(row)) continue;

        let foundMst = -1;
        let foundSieuThi = -1;
        let foundMstSieuThi = -1;
        let foundBase = -1;

        row.forEach((cell, idx) => {
          const s = String(cell || '').trim().toLowerCase();
          if (s === 'mst' || s === 'mã kho' || s === 'makho' || s === 'mã số') {
            foundMst = idx;
          } else if (s === 'mst + siêu thị' || s === 'mst + sieu thi' || s === 'mst+siêu thị' || s === 'mst+sieu thi') {
            foundMstSieuThi = idx;
          } else if ((s === 'siêu thị' || s === 'sieu thi' || s === 'tên siêu thị' || s === 'ten sieu thi') && !s.includes('+')) {
            foundSieuThi = idx;
          } else if (s === 'base' && !s.includes('tỉnh') && !s.includes('kênh')) {
            foundBase = idx;
          }
        });

        if (foundMst !== -1 || (foundSieuThi !== -1 && foundBase !== -1)) {
          startRowIdx = r + 1;
          colIdxMst = foundMst;
          colIdxSieuThi = foundSieuThi;
          colIdxMstSieuThi = foundMstSieuThi;
          colIdxBase = foundBase;
          break;
        }
      }

      // Fallback nếu không thấy header cụ thể
      if (colIdxMst === -1 || colIdxSieuThi === -1) {
        const sampleRow = jsonData[startRowIdx] || jsonData[0] || [];
        const cell0 = String(sampleRow[0] || '').trim();
        const cell1 = String(sampleRow[1] || '').trim();

        if (/^\d{2,7}$/.test(cell0)) {
          colIdxMst = 0;
          colIdxSieuThi = 1;
          colIdxMstSieuThi = 2;
          colIdxBase = 3;
        } else if (/^\d{2,7}$/.test(cell1)) {
          colIdxMst = 1;
          colIdxSieuThi = 2;
          colIdxMstSieuThi = 3;
          colIdxBase = 4;
        } else {
          colIdxMst = 0;
          colIdxSieuThi = 1;
          colIdxMstSieuThi = 2;
          colIdxBase = 3;
        }
      }
      if (colIdxMstSieuThi === -1) colIdxMstSieuThi = colIdxSieuThi + 1;
      if (colIdxBase === -1) colIdxBase = colIdxMstSieuThi + 1;

      const parsedRows: BossStoreItem[] = [];
      for (let i = startRowIdx; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!Array.isArray(row) || row.length === 0) continue;

        let rawBase = String(row[colIdxBase] ?? '').trim();
        let rawTen = cleanStoreInput(String(row[colIdxSieuThi] ?? ''));
        let rawMstTen = String(row[colIdxMstSieuThi] ?? '').trim();

        // Cột MST lấy từ cột BASE (lấy các ký tự trước dấu '-')
        let rawMst = '';
        if (rawBase && rawBase.includes('-')) {
          rawMst = rawBase.split('-')[0].trim().replace(/\.0+$/, '');
        } else if (colIdxMst !== -1) {
          rawMst = String(row[colIdxMst] ?? '').replace(/\.0+$/, '').trim();
        }

        // Bỏ qua nếu rỗng cả 4 cột
        if (!rawMst && !rawTen && !rawMstTen && !rawBase) continue;
        // Bỏ qua nếu là dòng tiêu đề lặp lại
        if (/^(mst|mã kho|kho|stt)$/i.test(rawMst) && /^(siêu thị|sieu thi|tên siêu thị)$/i.test(rawTen)) continue;

        // Nếu rawMst có dạng "899 - ĐML_..." thì lấy 899
        if (/^\d+[\s\-_]/.test(rawMst)) {
          const match = rawMst.match(/^(\d+)/);
          if (match) rawMst = match[1];
        }

        // Đảm bảo rawTen không bị lặp mã kho ở đầu nếu rawTen dạng "899 - ĐML..."
        if (rawMst && rawTen.startsWith(`${rawMst} - `)) {
          rawTen = cleanStoreInput(rawTen.replace(new RegExp(`^${rawMst}\\s*-\\s*`), ''));
        }

        if (!rawMstTen && rawMst && rawTen) {
          rawMstTen = `${rawMst} - ${rawTen}`;
        }
        if (!rawBase) {
          rawBase = rawMstTen || rawTen;
        }

        parsedRows.push({
          id: `boss_${parsedRows.length + 1}_${Date.now()}_${i}`,
          maKho: rawMst,
          tenSieuThi: rawTen,
          mstSieuThi: rawMstTen,
          base: rawBase,
          rawCells: [rawMst, rawTen, rawMstTen, rawBase],
        });
      }

      if (parsedRows.length === 0) {
        throw new Error('Không tìm thấy dòng dữ liệu nào hợp lệ trong các Cột B, C, D, E! Vui lòng kiểm tra lại file Excel.');
      }

      // Lưu vào Firebase Firestore
      const docRef = doc(db, 'app_settings', 'ds_boss_config');
      await setDoc(docRef, {
        updatedAt: new Date().toISOString(),
        updatedBy: '43751',
        headers: detectedHeaders,
        rows: parsedRows,
      });

      // Cache localStorage
      localStorage.setItem('rtst_ds_boss_config', JSON.stringify({
        headers: detectedHeaders,
        rows: parsedRows,
      }));

      setDsBossList(parsedRows);
      setDsBossHeaders(detectedHeaders);

      // Đối chiếu mã kho Cột B (MST) với mã kho đăng nhập để điền tên siêu thị Cột C vào form trên
      const cleanCur = String(maKho).trim().replace(/^0+/, '');
      const matchedCur = parsedRows.filter((r) => {
        const b = String(r.maKho || '').trim().replace(/^0+/, '');
        const d = String(r.mstSieuThi || '').trim();
        const e = String(r.base || '').trim();
        return (b !== '' && b === cleanCur) || 
               d.startsWith(`${cleanCur} -`) || d.startsWith(`${maKho} -`) ||
               e.startsWith(`${cleanCur} -`) || e.startsWith(`${maKho} -`);
      });

      if (matchedCur.length > 0) {
        const m1 = cleanStoreInput(matchedCur[0]?.tenSieuThi || '');
        const m2 = cleanStoreInput(matchedCur[1]?.tenSieuThi || '');
        const m3 = cleanStoreInput(matchedCur[2]?.tenSieuThi || '');
        const m4 = cleanStoreInput(matchedCur[3]?.tenSieuThi || '');

        if (m1) setStore1(m1);
        if (m2) setStore2(m2);
        if (m3) setStore3(m3);
        if (m4) setStore4(m4);

        setStatusMessage({
          type: 'success',
          text: `Đã nạp thành công ${parsedRows.length} siêu thị từ file DS BOSS! Đã đối chiếu mã kho ${maKho} (Cột B: MST) và tự động điền "${m1}" (Cột C) vào Siêu thị 1 ở form trên.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Đã nạp thành công ${parsedRows.length} siêu thị từ file DS BOSS vào Firebase! (Mã kho đăng nhập ${maKho} chưa có trong Cột B: MST của file này).`,
        });
      }
    } catch (err: any) {
      console.error('[StoreDeclaration] Upload DS BOSS failed:', err);
      setStatusMessage({ type: 'error', text: 'Lỗi tải file DS BOSS: ' + (err.message || '') });
    } finally {
      setIsUploadingBoss(false);
    }
  };

  // Cập nhật 1 dòng dữ liệu DS BOSS (chỉ 43751) - Hỗ trợ cả 4 cột B, C, D, E
  const handleUpdateBossRow = async (id: string, newMaKho: string, newTenSieuThi: string, newMstSieuThi?: string, newBase?: string) => {
    if (!is43751) return;
    setIsUpdatingBoss(true);
    try {
      const cleanedTen = cleanStoreInput(newTenSieuThi);
      const updated = dsBossList.map((r) =>
        r.id === id ? {
          ...r,
          maKho: newMaKho.trim(),
          tenSieuThi: cleanedTen,
          mstSieuThi: newMstSieuThi ? newMstSieuThi.trim() : (newMaKho.trim() && cleanedTen ? `${newMaKho.trim()} - ${cleanedTen}` : r.mstSieuThi),
          base: newBase ? newBase.trim() : r.base,
        } : r
      );
      setDsBossList(updated);
      localStorage.setItem('rtst_ds_boss_config', JSON.stringify({ headers: dsBossHeaders, rows: updated }));

      const docRef = doc(db, 'app_settings', 'ds_boss_config');
      await setDoc(docRef, {
        updatedAt: new Date().toISOString(),
        updatedBy: '43751',
        headers: dsBossHeaders,
        rows: updated,
      }, { merge: true });

      // Nếu dòng vừa sửa khớp mã kho hiện tại, lập tức cập nhật vào Siêu thị 1 ở form trên!
      const cleanCur = String(maKho).trim().replace(/^0+/, '');
      if (String(newMaKho).trim().replace(/^0+/, '') === cleanCur && cleanedTen) {
        setStore1(cleanedTen);
      }
    } finally {
      setIsUpdatingBoss(false);
    }
  };

  // Xóa 1 dòng dữ liệu DS BOSS (chỉ 43751)
  const handleDeleteBossRow = async (id: string) => {
    if (!is43751) return;
    setIsUpdatingBoss(true);
    try {
      const updated = dsBossList.filter((r) => r.id !== id);
      setDsBossList(updated);
      localStorage.setItem('rtst_ds_boss_config', JSON.stringify({ headers: dsBossHeaders, rows: updated }));

      const docRef = doc(db, 'app_settings', 'ds_boss_config');
      await setDoc(docRef, {
        updatedAt: new Date().toISOString(),
        updatedBy: '43751',
        headers: dsBossHeaders,
        rows: updated,
      }, { merge: true });
    } finally {
      setIsUpdatingBoss(false);
    }
  };

  // Thêm 1 dòng mới vào DS BOSS (chỉ 43751) - Hỗ trợ cả 4 cột B, C, D, E
  const handleAddBossRow = async (newMaKho: string, newTenSieuThi: string, newMstSieuThi?: string, newBase?: string) => {
    if (!is43751) return;
    setIsUpdatingBoss(true);
    try {
      const cleanedTen = cleanStoreInput(newTenSieuThi);
      const newRow: BossStoreItem = {
        id: `boss_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        maKho: newMaKho.trim(),
        tenSieuThi: cleanedTen,
        mstSieuThi: newMstSieuThi ? newMstSieuThi.trim() : (newMaKho.trim() && cleanedTen ? `${newMaKho.trim()} - ${cleanedTen}` : ''),
        base: newBase ? newBase.trim() : '',
      };
      const updated = [newRow, ...dsBossList];
      setDsBossList(updated);
      localStorage.setItem('rtst_ds_boss_config', JSON.stringify({ headers: dsBossHeaders, rows: updated }));

      const docRef = doc(db, 'app_settings', 'ds_boss_config');
      await setDoc(docRef, {
        updatedAt: new Date().toISOString(),
        updatedBy: '43751',
        headers: dsBossHeaders,
        rows: updated,
      }, { merge: true });
    } finally {
      setIsUpdatingBoss(false);
    }
  };

  const handleCopyExample = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePaste = (setter: (val: string) => void) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      e.preventDefault();
      setter(cleanStoreInput(text));
    }
  };

  // Load existing declared stores on mount
  useEffect(() => {
    async function loadDeclaredStores() {
      if (!maKho) {
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('[StoreDeclaration] Loading existing stores for maKho:', maKho);
        const maKhoNum = parseInt(maKho, 10);
        let query = supabase
          .from('store')
          .select('id, ten_sieu_thi, declared_stores, updated_at');

        if (!isNaN(maKhoNum)) {
          query = query.or(`warehouse_code.eq.${maKho.trim()},warehouse_code.eq.${maKhoNum}`);
        } else {
          query = query.eq('warehouse_code', maKho.trim());
        }

        const { data, error } = await query;

        let loaded1 = '';
        let loaded2 = '';
        let loaded3 = '';
        let loaded4 = '';

        // ƯU TIÊN 1 (Tuyệt đối): Nếu có trong DS BOSS khớp mã kho đăng nhập,
        // Dòng đầu điền vào siêu thị 1, các dòng tiếp theo tương tự điền vào siêu thị 2, 3, 4
        const cleanTarget = maKho.trim().replace(/^0+/, '');
        const bossMatched = dsBossList.filter((r) => {
          const rowKho = String(r.maKho || '').trim().replace(/^0+/, '');
          const d = String(r.mstSieuThi || '').trim();
          const e = String(r.base || '').trim();
          return (rowKho !== '' && rowKho === cleanTarget) ||
                 d.startsWith(`${cleanTarget} -`) || d.startsWith(`${maKho} -`) ||
                 e.startsWith(`${cleanTarget} -`) || e.startsWith(`${maKho} -`);
        });

        if (bossMatched.length > 0) {
          loaded1 = cleanStoreInput(bossMatched[0]?.tenSieuThi || '');
          if (bossMatched[1]) loaded2 = cleanStoreInput(bossMatched[1]?.tenSieuThi || '');
          if (bossMatched[2]) loaded3 = cleanStoreInput(bossMatched[2]?.tenSieuThi || '');
          if (bossMatched[3]) loaded4 = cleanStoreInput(bossMatched[3]?.tenSieuThi || '');
        } else {
          // ƯU TIÊN 2: Nếu chưa có trong DS BOSS, mới tải từ bản ghi Supabase store
          if (!error && data && data.length > 0) {
            // Ưu tiên bản ghi cập nhật mới nhất (updated_at desc)
            const sorted = [...data].sort((a: any, b: any) => {
              const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return timeB - timeA;
            });

            const found = sorted.find((d: any) => d.declared_stores && Array.isArray(d.declared_stores) && d.declared_stores.length > 0);
            if (found) {
              const stores = (found as any).declared_stores;
              loaded1 = cleanStoreInput(stores[0] || '');
              loaded2 = cleanStoreInput(stores[1] || '');
              loaded3 = cleanStoreInput(stores[2] || '');
              loaded4 = cleanStoreInput(stores[3] || '');
            } else {
              // Chỉ lấy các ID là TÊN SIÊU THỊ HỢP LỆ (loại trừ mã kho thuần số như "7981", "10528", "Siêu thị 2323")
              const validIds = sorted.map((d: any) => d.ten_sieu_thi || d.id).filter((id: string) => id && isValidStoreName(id) && !isPlaceholderStore(id));
              loaded1 = cleanStoreInput(validIds[0] || '');
              loaded2 = cleanStoreInput(validIds[1] || '');
              loaded3 = cleanStoreInput(validIds[2] || '');
              loaded4 = cleanStoreInput(validIds[3] || '');
            }
          }

          // Dự phòng 1: Nếu chưa có trong store, kiểm tra tên siêu thị trong userProfile
          if (!loaded1 || isPlaceholderStore(loaded1)) {
            const profStore = userProfile?.ten_sieu_thi || (userProfile as any)?.selected_store;
            if (profStore && isValidStoreName(profStore) && !isPlaceholderStore(profStore)) {
              loaded1 = profStore;
            } else {
              loaded1 = '';
            }
          }

          // Dự phòng 2: Kiểm tra tên kho trong bảng warehouses
          if (!loaded1) {
            try {
              const { data: whData } = await supabase
                .from('warehouses')
                .select('ten_kho')
                .eq('ma_kho', maKho.trim())
                .maybeSingle();
              if (whData?.ten_kho && isValidStoreName(whData.ten_kho) && !isPlaceholderStore(whData.ten_kho)) {
                loaded1 = whData.ten_kho;
              }
            } catch {}
          }
        }

        if (loaded1) setStore1(loaded1);
        if (loaded2) setStore2(loaded2);
        if (loaded3) setStore3(loaded3);
        if (loaded4) setStore4(loaded4);
      } catch (err) {
        console.error('[StoreDeclaration] Failed to load stores:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDeclaredStores();
  }, [maKho, userProfile?.ten_sieu_thi]);

  const handleSave = async (shouldProceed = true) => {
    if (!maKho) return;
    
    setIsSaving(true);
    setStatusMessage(null);
    
    const s1 = cleanStoreInput(store1);
    const s2 = cleanStoreInput(store2);
    const s3 = cleanStoreInput(store3);
    const s4 = cleanStoreInput(store4);

    setStore1(s1);
    setStore2(s2);
    setStore3(s3);
    setStore4(s4);

    const declaredStores = [s1, s2, s3, s4].filter(Boolean);
    
    if (declaredStores.length === 0) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập ít nhất một tên siêu thị!' });
      setIsSaving(false);
      return;
    }

    // Validate each non-empty store name using the strict BI format validator
    for (let i = 0; i < declaredStores.length; i++) {
      const storeName = declaredStores[i];
      if (!isValidStoreName(storeName)) {
        setStatusMessage({ 
          type: 'error', 
          text: `Tên siêu thị "${storeName}" không hợp lệ! Vui lòng nhập đúng cú pháp trên BI (Ví dụ: ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH)` 
        });
        setIsSaving(false);
        return;
      }
    }

    const storesArray = [s1, s2, s3, s4];
    
    try {
      console.log('[StoreDeclaration] Saving declared stores:', declaredStores);
      
      // Fetch old maKho document (e.g. 10528) to migrate data if declaring for the first time
      const { data: oldMaKhoData } = await supabase
        .from('store')
        .select('*')
        .eq('id', maKho.trim())
        .maybeSingle();

      for (const storeName of declaredStores) {
        const normalizedId = normalizeStoreId(storeName);
        if (!normalizedId) continue;

        // Fetch existing document of the store Name to merge cleanly and preserve other fields
        const { data: existingData } = await supabase
          .from('store')
          .select('*')
          .eq('id', normalizedId)
          .maybeSingle();

        const payload: any = {
          id: normalizedId,
          warehouse_code: maKho.trim(),
          ten_sieu_thi: storeName,
          declared_stores: storesArray,
          updated_at: new Date().toISOString(),
        };

        // Dynamically merge non-null/non-undefined properties from existingData or oldMaKhoData
        const mergeField = (key: string) => {
          const val = existingData?.[key] ?? oldMaKhoData?.[key];
          if (val !== undefined && val !== null) {
            payload[key] = val;
          }
        };

        const fieldsToMigrate = [
          'lk_bi_tong_quan', 'lk_nh_sieu_thi', 'taget_doanh_thu', 'category_targets',
          'lk_dt_nv', 'lk_td_nv', 'ds_nhan_vien', 'dt_gio_cong', 'data_phan_ca',
          'tragop_matran', 'tragop_nv', 'phuc_vu', 'ban_kem_nv',
          'sticker_ce_price_data', 'sticker_ce_inventory_data',
          'sticker_lk_price_data', 'sticker_lk_inventory_data'
        ];

        fieldsToMigrate.forEach(mergeField);

        const { error } = await supabase
          .from('store')
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
      }

      // Delete the old raw maKho document (e.g. 10528) to clean up the DB
      await supabase
        .from('store')
        .delete()
        .eq('id', maKho.trim());

      // Tự động dọn dẹp các tài liệu siêu thị cũ / bị đổi tên không còn nằm trong danh sách khai báo mới
      try {
        const activeIds = declaredStores.map(s => normalizeStoreId(s)).filter(Boolean);
        const maKhoNum = parseInt(maKho, 10);
        let existingQuery = supabase.from('store').select('id');
        if (!isNaN(maKhoNum)) {
          existingQuery = existingQuery.or(`warehouse_code.eq.${maKho.trim()},warehouse_code.eq.${maKhoNum}`);
        } else {
          existingQuery = existingQuery.eq('warehouse_code', maKho.trim());
        }
        const { data: existingDocs } = await existingQuery;
        if (existingDocs && existingDocs.length > 0) {
          for (const docItem of existingDocs) {
            if (docItem.id && !activeIds.includes(docItem.id)) {
              console.log('[StoreDeclaration] Dọn dẹp tài liệu siêu thị cũ/đổi tên:', docItem.id);
              await supabase.from('store').delete().eq('id', docItem.id);
            }
          }
        }
      } catch (cleanErr) {
        console.warn('[StoreDeclaration] Lỗi khi dọn dẹp tài liệu cũ:', cleanErr);
      }

      // Update/upsert the warehouses table
      const { error: warehouseError } = await supabase
        .from('warehouses')
        .upsert({
          ma_kho: maKho.trim(),
          ten_kho: s1
        }, { onConflict: 'ma_kho' });

      if (warehouseError) {
        console.error('[StoreDeclaration] Error updating warehouses:', warehouseError);
      }

      // Update ql_nguoi_dung
      const updatePayload: any = {
        declarationCompleted: true,
        ten_sieu_thi: s1,
        selected_store: s1
      };

      if (isNewUser) {
        updatePayload.status = 'pending';
        updatePayload.paymentConfirmed = false;
      }

      if (userProfile?.username) {
        const { error: userUpdateError } = await supabase
          .from('ql_nguoi_dung')
          .update(updatePayload)
          .eq('username', userProfile.username);

        if (userUpdateError) {
          console.error('[StoreDeclaration] Error updating user status:', userUpdateError);
        }
      }

      // Update client states immediately
      if (updateStoreName) {
        updateStoreName(s1, isNewUser ? 'pending' : userProfile?.status);
      }
      if (setCurrentStoreId) {
        setCurrentStoreId(s1);
      }
      localStorage.setItem('currentStoreId', s1);
      localStorage.setItem('rtst_ma_kho', maKho.trim());

      try {
        sessionStorage.setItem('justLoggedIn', 'false');
      } catch {}
      
      setStatusMessage({ type: 'success', text: 'Cập nhật cấu hình siêu thị thành công!' });
      
      if (shouldProceed) {
        setTimeout(() => {
          onComplete();
        }, 800);
      }
    } catch (err: any) {
      console.error('[StoreDeclaration] Error saving:', err);
      setStatusMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cấu hình: ' + (err.message || '') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipOrProceed = () => {
    if (isNewUser) {
      handleSave(true);
    } else {
      try {
        sessionStorage.setItem('justLoggedIn', 'false');
      } catch {}
      onComplete();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans font-black">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 font-sans font-black selection:bg-indigo-100 selection:text-indigo-900">
      <motion.div 
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="w-full max-w-4xl bg-white rounded-[32px] shadow-2xl shadow-indigo-100/60 p-6 sm:p-8 md:p-10 border border-slate-100 relative overflow-hidden"
      >
        {/* Nút đóng cho tài khoản đã khai báo (bỏ qua nếu không muốn sửa) */}
        {!isNewUser && (
          <button
            type="button"
            onClick={handleSkipOrProceed}
            className="absolute top-5 right-5 z-30 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
            title="Đóng / Vào App"
          >
            <X size={18} />
          </button>
        )}

        {/* Hiệu ứng nền nhẹ nhàng */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/70 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Cột trái: Hướng dẫn cú pháp chuẩn (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl p-6 border border-slate-200/70 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100/80 text-indigo-600 rounded-xl shadow-sm">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Hướng dẫn khai báo
                  </h2>
                  <span className="text-[10.5px] font-bold text-slate-400">Đồng bộ dữ liệu báo cáo BI</span>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-4 sm:p-5 bg-rose-50/60 rounded-2xl border border-rose-200/80 shadow-sm relative group hover:border-rose-300 transition-colors duration-300">
                  <div className="absolute -top-3 left-4 bg-rose-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Info size={12} className="shrink-0" />
                    <span>Lưu ý quan trọng</span>
                  </div>
                  <p className="text-xs sm:text-sm font-black text-rose-800 leading-relaxed mt-1">
                    Anh / chị vui lòng nhập đúng tên siêu thị trên BI hoặc mở BC Tổng Hợp copy tên siêu thị dán vào ạ.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Cú pháp chuẩn trên BI
                  </h3>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] sm:text-xs relative group overflow-hidden border border-slate-800 shadow-inner">
                    <div className="flex justify-between items-center mb-2 text-[10px] text-slate-400 font-sans font-black uppercase tracking-wider">
                      <span>Ví dụ mẫu chuẩn</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        Hợp lệ
                      </span>
                    </div>
                    <code className="block text-indigo-300 font-sans font-black select-all whitespace-pre-wrap break-all leading-relaxed">
                      ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH
                    </code>
                    
                    <button
                      type="button"
                      onClick={() => handleCopyExample('ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH')}
                      className="absolute right-3 top-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-700/60 cursor-pointer"
                      title="Sao chép tên ví dụ"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    
                    {copied && (
                      <span className="absolute right-12 top-3.5 text-[9px] font-black text-emerald-400 bg-slate-800 px-2 py-0.5 rounded shadow border border-slate-700/40">
                        Đã sao chép!
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Quy tắc đồng bộ
                  </h3>
                  <ul className="space-y-2.5 text-[11.5px] font-black text-slate-500 leading-normal">
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>Hệ thống tự động lọc bỏ tiền tố số kho nếu copy dán từ BI.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>Không tự ý viết tắt tên tỉnh thành hoặc địa chỉ cơ sở.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>Có thể quản lý cùng lúc từ 1 đến tối đa 4 siêu thị.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Đồng bộ máy chủ 24/7</span>
              </div>
              <ShieldCheck size={14} className="text-emerald-500" />
            </div>
          </div>

          {/* Cột phải: Form nhập liệu 4 siêu thị (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-center lg:text-left mb-6">
                <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3 shadow-inner">
                  <Store size={26} strokeWidth={2.2} />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
                  Cấu hình tên siêu thị
                </h1>
                <p className="text-xs text-slate-500 font-bold tracking-wider uppercase mt-1">
                  Mã kho đăng nhập: <span className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{maKho}</span>
                </p>
              </div>

              {statusMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 text-sm font-black ${
                    statusMessage.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 animate-bounce">
                      <Check size={13} className="text-emerald-600 font-black" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-black text-rose-600">!</span>
                    </div>
                  )}
                  <p>{statusMessage.text}</p>
                </motion.div>
              )}

              <div className="space-y-4">
                {/* Siêu thị 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                      Siêu thị 1 <span className="text-indigo-500 font-black">*</span>
                    </label>
                    <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">Cơ sở chính</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store1}
                      onChange={(e) => setStore1(e.target.value)}
                      onPaste={handlePaste(setStore1)}
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-xs sm:text-sm placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Nhập hoặc dán tên siêu thị từ BI (VD: ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH)"
                    />
                    {store1 && (
                      <button
                        type="button"
                        onClick={() => setStore1('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Siêu thị 2 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">
                    Siêu thị 2 <span className="text-[10.5px] font-normal text-slate-400 lowercase">(tùy chọn)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store2}
                      onChange={(e) => setStore2(e.target.value)}
                      onPaste={handlePaste(setStore2)}
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-xs sm:text-sm placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Tên siêu thị thứ 2 (nếu quản lý đa siêu thị)"
                    />
                    {store2 && (
                      <button
                        type="button"
                        onClick={() => setStore2('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Siêu thị 3 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">
                    Siêu thị 3 <span className="text-[10.5px] font-normal text-slate-400 lowercase">(tùy chọn)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store3}
                      onChange={(e) => setStore3(e.target.value)}
                      onPaste={handlePaste(setStore3)}
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-xs sm:text-sm placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Tên siêu thị thứ 3 (nếu có)"
                    />
                    {store3 && (
                      <button
                        type="button"
                        onClick={() => setStore3('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Siêu thị 4 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">
                    Siêu thị 4 <span className="text-[10.5px] font-normal text-slate-400 lowercase">(tùy chọn)</span>
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store4}
                      onChange={(e) => setStore4(e.target.value)}
                      onPaste={handlePaste(setStore4)}
                      className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-xs sm:text-sm placeholder:text-slate-400 placeholder:font-normal"
                      placeholder="Tên siêu thị thứ 4 (nếu có)"
                    />
                    {store4 && (
                      <button
                        type="button"
                        onClick={() => setStore4('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* DÀNH RIÊNG CHO USER 43751: Ô TẢI FILE EXCEL DS BOSS + BUTTON HIỂN THỊ DANH SÁCH BOSS */}
              {is43751 && (
                <div className="mt-5 p-4 bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-slate-50 border border-indigo-200/90 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                        👑 User 43751
                      </span>
                      <span className="text-xs font-black text-slate-800">
                        Cấu hình DS BOSS ({dsBossList.length} siêu thị)
                      </span>
                    </div>
                    {isUploadingBoss && (
                      <span className="text-xs text-indigo-600 font-bold flex items-center gap-1.5 animate-pulse">
                        <Loader2 size={13} className="animate-spin" /> Đang xử lý file...
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-bold text-slate-500 mb-3 leading-relaxed">
                    Tải file Excel DS BOSS: Cột B (MST), Cột C (SIÊU THỊ), Cột D (MST + SIÊU THỊ), Cột E (BASE). Đối chiếu MST ({maKho}) để tự động điền Tên siêu thị vào form trên.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Ô tải file Excel DS BOSS */}
                    <label className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer transition-all active:scale-95 shadow-sm shadow-indigo-200">
                      <FileSpreadsheet size={16} />
                      <span>Tải file Excel DS BOSS</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadBossExcel(file);
                          e.target.value = '';
                        }}
                        className="hidden"
                        disabled={isUploadingBoss}
                      />
                    </label>

                    {/* Button hiển thị danh sách boss có thể sửa / xoá theo dòng */}
                    <button
                      type="button"
                      onClick={() => setShowBossModal(true)}
                      className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-xs font-black cursor-pointer transition-all active:scale-95 border border-indigo-200 shadow-xs"
                    >
                      <Eye size={16} className="text-indigo-600" />
                      <span>Hiển thị danh sách BOSS ({dsBossList.length})</span>
                    </button>
                  </div>

                  {/* Trạng thái đối chiếu mã kho hiện tại nếu có trong DS BOSS */}
                  {matchedBossStores.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-indigo-100 flex items-center justify-between gap-2">
                      <div className="text-[11.5px] font-bold text-slate-700 flex items-center gap-1.5 truncate">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span className="truncate">
                          Khớp kho {maKho}: <strong className="text-indigo-700">{matchedBossStores[0]?.tenSieuThi}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          applyAutoFill(true);
                          setStatusMessage({
                            type: 'success',
                            text: `Đã điền "${matchedBossStores[0]?.tenSieuThi}" vào Siêu thị 1 ở form trên!`,
                          });
                        }}
                        className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg text-[10.5px] font-black uppercase transition-colors shrink-0 cursor-pointer"
                        title="Điền lại tên siêu thị này vào form trên"
                      >
                        Điền lại vào Form
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/60 transition-all active:scale-[0.98] disabled:opacity-75 tracking-wider uppercase text-xs cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    <span>Cập nhật & Tiếp tục</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSkipOrProceed}
                disabled={isSaving}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] tracking-wider uppercase text-xs border border-slate-200 cursor-pointer"
              >
                <span>Tiếp tục vào App</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MODAL BẢNG XEM & SỬA DS BOSS (CHỈ DÀNH CHO ADMIN 43751) */}
      {is43751 && (
        <BossStoreTableModal
          isOpen={showBossModal}
          onClose={() => setShowBossModal(false)}
          rows={dsBossList}
          headers={dsBossHeaders}
          onUpdateRow={handleUpdateBossRow}
          onDeleteRow={handleDeleteBossRow}
          onAddRow={handleAddBossRow}
          onUploadExcel={handleUploadBossExcel}
          isUpdating={isUpdatingBoss}
          currentMaKho={maKho}
        />
      )}
    </div>
  );
}
