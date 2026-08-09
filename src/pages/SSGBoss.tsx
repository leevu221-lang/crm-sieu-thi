/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Camera, Trophy } from 'lucide-react';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { domToPng } from 'modern-screenshot';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useStore } from '../contexts/StoreContext';
import { normalize } from './RTST/utils';

interface SSGRowData {
  dtqdNamTruoc: string;
  mucTieuSSG: string;
}

interface SSGBossProps {
  /** Parsed BI market data from CẬP NHẬT > Luỹ kế DT (displayData.markets) */
  biMarkets: any[];
  daysPassed: number;
  totalDays: number;
}

const FIREBASE_DOC = 'ssg_boss_data';

// Format number with thousand separators (Vietnamese style)
const formatNumber = (value: string | number): string => {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/[.,\s]/g, ''));
  if (isNaN(num) || num === 0) return '';
  // Vietnamese format: dot as thousand separator
  return Math.round(num).toLocaleString('vi-VN');
};

// Display value with unit suffix: >= 1000 triệu = tỷ, < 1000 = tr
const formatDisplay = (value: number): string => {
  if (!value || value === 0) return '-';
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString('vi-VN');
  return rounded >= 1000 ? `${formatted} tỷ` : `${formatted} tr`;
};

const parseNum = (s: string | number): number => {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  return parseFloat(s.replace(/[.,\s]/g, '')) || 0;
};

const cleanInput = (value: string): string => value.replace(/[^0-9]/g, '');

/* ── Styles ── */
const ssgStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800;900&display=swap');

  .ssg-table {
    font-family: 'UTM Avo', 'Be Vietnam Pro', Arial, sans-serif;
    font-size: 14px;
    border-collapse: collapse;
    width: 100%;
  }
  .ssg-table th,
  .ssg-table td {
    font-size: 14px;
    padding: 10px 12px;
    white-space: nowrap;
  }
  .ssg-table thead th {
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    border-right: 2px solid rgba(255,255,255,0.3);
  }
  .ssg-table thead th:last-child {
    border-right: none;
  }
  .ssg-table tbody td {
    border-bottom: 1px solid #e2e8f0;
    border-right: 1px solid #e2e8f0;
  }
  .ssg-table tbody td:last-child {
    border-right: none;
  }
  .ssg-input {
    width: 100%;
    padding: 6px 8px;
    background: transparent;
    border: none;
    outline: none;
    font-family: 'UTM Avo', 'Be Vietnam Pro', monospace;
    font-size: 14px;
    font-weight: 900;
    text-align: right;
    transition: background 0.15s;
    border-radius: 6px;
  }
  .ssg-input:focus {
    background: rgba(46, 158, 71, 0.08);
  }
  .ssg-input::placeholder {
    color: #cbd5e1;
    font-weight: 400;
  }
  .ssg-hint {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.7;
    display: block;
    margin-top: 2px;
  }
`;

const SSGBoss: React.FC<SSGBossProps> = ({ biMarkets, daysPassed, totalDays }) => {
  const { availableStores } = useStore();
  // Fixed order: store names from cấu hình, never reordered
  const storeNames = useMemo(() => availableStores.map(s => s.name).filter(Boolean), [availableStores]);

  const [dataMap, setDataMap] = useState<Record<string, SSGRowData>>({});
  const [savedDtqd, setSavedDtqd] = useState<Record<string, number>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const hasLoaded = useRef(false);

  // Match DTQĐ from biMarkets
  const liveDtqdMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!biMarkets || biMarkets.length === 0) return map;
    for (const store of storeNames) {
      const normStore = normalize(store);
      const market = biMarkets.find((m: any) => normalize(m.name) === normStore);
      if (market && market.actualVirtual != null && market.actualVirtual > 0) {
        map[store] = market.actualVirtual;
      }
    }
    return map;
  }, [biMarkets, storeNames]);

  // Persist DTQĐ to Firebase
  useEffect(() => {
    if (!hasLoaded.current) return;
    const newEntries = Object.entries(liveDtqdMap);
    if (newEntries.length === 0) return;
    const hasNewData = newEntries.some(([store, val]) => savedDtqd[store] !== val);
    if (hasNewData) {
      const merged = { ...savedDtqd, ...liveDtqdMap };
      setSavedDtqd(merged);
      const docRef = doc(db, 'app_settings', FIREBASE_DOC);
      setDoc(docRef, { savedDtqd: merged, updatedAt: new Date().toISOString() }, { merge: true })
        .catch(err => console.error('[SSGBoss] Error saving DTQĐ:', err));
    }
  }, [liveDtqdMap, savedDtqd]);

  const dtqdMap = useMemo(() => {
    const map: Record<string, number> = { ...savedDtqd };
    for (const [store, val] of Object.entries(liveDtqdMap)) {
      map[store] = val;
    }
    return map;
  }, [liveDtqdMap, savedDtqd]);

  // Load from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        const docRef = doc(db, 'app_settings', FIREBASE_DOC);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.dataMap) setDataMap(data.dataMap);
          if (data.savedDtqd) setSavedDtqd(data.savedDtqd);
        }
      } catch (err) {
        console.error('[SSGBoss] Error loading:', err);
      } finally {
        hasLoaded.current = true;
      }
    };
    loadData();
  }, []);

  const saveToFirebase = useCallback(async (data: Record<string, SSGRowData>) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'app_settings', FIREBASE_DOC);
      await setDoc(docRef, { dataMap: data, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (err) {
      console.error('[SSGBoss] Error saving:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSave = useCallback((data: Record<string, SSGRowData>) => {
    if (!hasLoaded.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToFirebase(data), 1500);
  }, [saveToFirebase]);

  const updateCell = (storeName: string, field: keyof SSGRowData, rawValue: string) => {
    const cleaned = field === 'mucTieuSSG' ? rawValue.replace(/[^0-9.]/g, '') : cleanInput(rawValue);
    setDataMap(prev => {
      const next = {
        ...prev,
        [storeName]: {
          ...(prev[storeName] || { dtqdNamTruoc: '', mucTieuSSG: '', tbConLai: '' }),
          [field]: cleaned,
        },
      };
      autoSave(next);
      return next;
    });
  };

  const captureOffscreen = async (
    element: HTMLElement,
    options: {
      backgroundColor?: string;
      minWidth?: string;
    } = {}
  ) => {
    // 1. Create temporary off-screen wrapper container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = 'auto';
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'visible';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    // 2. Clone the element
    const clone = element.cloneNode(true) as HTMLElement;

    // Copy input/select/textarea values from original elements to cloned elements
    const originalInputs = element.querySelectorAll('input, textarea, select');
    const clonedInputs = clone.querySelectorAll('input, textarea, select');
    originalInputs.forEach((origInput, index) => {
      const clonedInput = clonedInputs[index] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (clonedInput) {
        clonedInput.value = (origInput as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
        if (origInput instanceof HTMLInputElement && clonedInput instanceof HTMLInputElement) {
          clonedInput.checked = origInput.checked;
        }
      }
    });

    // Create and inject the style tag into the clone to preserve custom styles/fonts
    const styleTag = document.createElement('style');
    styleTag.innerHTML = ssgStyles;
    clone.appendChild(styleTag);

    try {
      // Wait for fonts to load
      if (document.fonts) {
        await document.fonts.ready;
      }

      // 3. Hide all no-capture controls and interactive elements (buttons, etc.)
      const noCaptureElements = clone.querySelectorAll('.no-capture, button');
      noCaptureElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });

      // 4. Force all overflow/scroll containers in the clone to expand fully
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.maxWidth = 'none';
        htmlEl.style.maxHeight = 'none';
      });

      // Clear any other inline overflow restrictions
      const allCloneElements = clone.querySelectorAll('*');
      allCloneElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.style.overflow || htmlEl.style.overflowX || htmlEl.style.overflowY) {
          htmlEl.style.overflow = 'visible';
          htmlEl.style.overflowX = 'visible';
          htmlEl.style.overflowY = 'visible';
          htmlEl.style.maxWidth = 'none';
          htmlEl.style.maxHeight = 'none';
        }
      });

      // 5. Style the cloned element itself
      clone.style.display = 'inline-block';
      clone.style.width = 'auto';
      if (options.minWidth) {
        clone.style.minWidth = options.minWidth;
      }
      clone.style.height = 'auto';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.overflow = 'visible';
      clone.style.overflowX = 'visible';
      clone.style.overflowY = 'visible';
      
      // Add nice padding and margins to make the screenshot look premium
      clone.style.padding = '32px';
      clone.style.borderRadius = '24px';
      if (options.backgroundColor) {
        clone.style.backgroundColor = options.backgroundColor;
      }

      // Add clone to DOM
      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      // 6. Delay for layout computation
      await new Promise(resolve => setTimeout(resolve, 200));

      const exactWidth = clone.scrollWidth;
      clone.style.width = `${exactWidth}px`;
      clone.style.minWidth = `${exactWidth}px`;
      clone.style.maxWidth = `${exactWidth}px`;
      clone.style.display = 'block';

      tempContainer.style.width = `${exactWidth + 100}px`;
      await new Promise(resolve => setTimeout(resolve, 50));

      // 7. Render screenshot
      const dataUrl = await domToPng(clone, {
        backgroundColor: options.backgroundColor || '#ffffff',
        scale: 3,
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      });

      return dataUrl;
    } finally {
      // Cleanup
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  };

  const handleCapture = async () => {
    if (!tableRef.current) return;
    try {
      const dataUrl = await captureOffscreen(tableRef.current, {
        backgroundColor: '#ffffff',
      });
      setPreviewImage(dataUrl);
    } catch (err) {
      console.error('Error capturing SSG Boss table:', err);
    }
  };

  const daysInMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  }, []);

  // Computed rows - FIXED order from availableStores
  const computedRows = useMemo(() => {
    return storeNames.map(storeName => {
      const row = dataMap[storeName] || { dtqdNamTruoc: '', mucTieuSSG: '' };
      const dtqdNamTruoc = parseNum(row.dtqdNamTruoc);
      const dtqdHienTai = dtqdMap[storeName] || 0;
      const mucTieuSSG = parseFloat(row.mucTieuSSG || '0') || 0;
      const mucTieuSSGDecimal = mucTieuSSG / 100;
      
      // TARGET HIỆN TẠI = DTQĐ Năm trước × Mục tiêu SSG
      const targetHienTai = dtqdNamTruoc > 0 && mucTieuSSG > 0 ? dtqdNamTruoc * mucTieuSSGDecimal : 0;
      
      // TB/Ngày = DTQĐ Năm trước × Mục tiêu SSG / Số ngày trong tháng
      const tbNgay = targetHienTai > 0 ? targetHienTai / daysInMonth : 0;
      
      // DỰ KIẾN = (DTQĐ hiện tại / daysPassed) × totalDays
      const duKien = daysPassed > 0 && dtqdHienTai > 0 ? (dtqdHienTai / daysPassed) * totalDays : 0;
      
      // %HT = Dự kiến / Target Hiện tại
      const phanTramHT = duKien > 0 && targetHienTai > 0 ? (duKien / targetHienTai) * 100 : 0;
      
      // SSG = (Dự kiến / DTQĐ Năm trước - 1) × 100 = % tăng trưởng so với năm trước
      const ssgPercent = duKien > 0 && dtqdNamTruoc > 0 ? ((duKien / dtqdNamTruoc) - 1) * 100 : 0;
      // Mục tiêu tăng trưởng = Mục tiêu SSG - 100 (e.g., 120% → 20% growth target)
      const ssgTargetGrowth = mucTieuSSG > 0 ? mucTieuSSG - 100 : 0;
      
      // TB CÒN LẠI = DT cần chạy hôm nay để ngày mai Dự kiến = Target hiện tại
      // Formula: targetHienTai × (daysPassed + 1) / totalDays - dtqdHienTai
      const tbConLai = targetHienTai > 0 && daysPassed > 0
        ? (targetHienTai * (daysPassed + 1) / totalDays) - dtqdHienTai
        : 0;
      
      return { storeName, dtqdNamTruoc, dtqdHienTai, mucTieuSSG, targetHienTai, tbNgay, duKien, phanTramHT, ssgPercent, ssgTargetGrowth, tbConLai, raw: row };
    });
  }, [storeNames, dataMap, dtqdMap, daysPassed, totalDays, daysInMonth]);

  const totals = useMemo(() => computedRows.reduce((acc, r) => ({
    dtqdNamTruoc: acc.dtqdNamTruoc + r.dtqdNamTruoc,
    dtqdHienTai: acc.dtqdHienTai + r.dtqdHienTai,
    targetHienTai: acc.targetHienTai + r.targetHienTai,
    duKien: acc.duKien + r.duKien,
    tbNgay: acc.tbNgay + r.tbNgay,
    tbConLai: acc.tbConLai + r.tbConLai,
  }), { dtqdNamTruoc: 0, dtqdHienTai: 0, targetHienTai: 0, duKien: 0, tbNgay: 0, tbConLai: 0 }), [computedRows]);

   const fmtTotal = (n: number) => formatDisplay(n);

  // Persist tbConLai (M.TIÊU H.NAY) to Firebase so RealtimePage can read it
  useEffect(() => {
    if (!hasLoaded.current || computedRows.length === 0) return;
    const hasTbConLai = computedRows.some(r => r.tbConLai !== 0);
    if (!hasTbConLai) return;
    const tbConLaiMap: Record<string, number> = {};
    computedRows.forEach(r => {
      tbConLaiMap[r.storeName] = r.tbConLai < 0 ? r.tbNgay : r.tbConLai;
    });
    const docRef = doc(db, 'app_settings', FIREBASE_DOC);
    setDoc(docRef, { tbConLaiMap, updatedAt: new Date().toISOString() }, { merge: true })
      .catch(err => console.error('[SSGBoss] Error saving tbConLai:', err));
  }, [computedRows]);

  // Colors
  const GREEN = '#2E9E47';
  const ORANGE = '#E8922D';

  return (
    <div className="space-y-6">
      <style>{ssgStyles}</style>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${GREEN}, ${ORANGE})` }}>
              <Trophy size={24} className="text-white" />
            </div>
            <div>
              <h2 style={{ fontFamily: "'UTM Avo', 'Be Vietnam Pro', sans-serif" }} className="text-[22px] font-black text-slate-800 tracking-tight uppercase">SSG BOSS</h2>
              <p className="text-[12px] text-slate-500 font-medium uppercase tracking-wide">
                Báo cáo DTQĐ & mục tiêu SSG • T{new Date().getMonth() + 1}/{new Date().getFullYear()} ({daysInMonth} ngày)
                {isSaving && <span className="ml-2 animate-pulse" style={{ color: ORANGE }}>• Đang lưu...</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={handleCapture} className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-[12px] uppercase tracking-wider transition-colors shadow-sm active:scale-95 cursor-pointer" style={{ background: GREEN }}>
              <Camera size={16} /> {computedRows.length > 1 ? 'CHỤP TOÀN BỘ BẢNG' : 'CHỤP ẢNH'}
            </button>
          </div>
        </div>
      </div>

      {/* Cards - Portrait Layout */}
      {storeNames.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
            <Trophy size={40} style={{ color: GREEN }} />
          </div>
          <h3 className="text-[16px] font-bold text-slate-600 mb-2">Chưa có siêu thị</h3>
          <p className="text-[13px] text-slate-400">Vui lòng khai báo siêu thị tại giao diện Cấu hình siêu thị trước.</p>
        </div>
      ) : (
        <div ref={tableRef} className="bg-white p-5" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="text-[28px]">🏆</span>
            <div>
              <h3 style={{ fontFamily: "'UTM Avo', 'Be Vietnam Pro', sans-serif", fontSize: '22px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                SSG BOSS - BẢNG XẾP HẠNG
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                {storeNames.length} siêu thị • Đơn vị: triệu đồng • T{new Date().getMonth() + 1}/{new Date().getFullYear()} ({daysInMonth} ngày)
              </p>
            </div>
          </div>

          {/* Store Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: computedRows.length >= 3 ? 'repeat(3, 1fr)' : computedRows.length === 2 ? 'repeat(2, 1fr)' : '1fr', gap: 16 }}>
          {computedRows.map((row, idx) => {
            const htPct = row.phanTramHT;
            const barWidth = Math.min(htPct, 100);
            const barColor = htPct >= 100 ? GREEN : htPct >= 80 ? ORANGE : '#dc2626';

            return (
              <div key={row.storeName} id={`ssg-card-${idx}`} style={{ borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', maxWidth: computedRows.length === 1 ? '450px' : 'none', margin: computedRows.length === 1 ? '0 auto' : '0', width: '100%' }}>
                {/* Header */}
                <div style={{ background: `linear-gradient(135deg, ${GREEN}, #22c55e)`, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: '18px 18px 0 0' }}>
                  <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 900, color: '#fff' }}>{idx + 1}</span>
                  <span style={{ color: '#000', fontWeight: 900, fontSize: 20, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>{row.storeName}</span>
                </div>

                <div style={{ padding: 16 }}>
                  {/* 3 KPI Boxes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                    <div style={{ background: '#eff6ff', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Hiện tại</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#1d4ed8', fontFamily: "'Be Vietnam Pro', monospace" }}>{row.dtqdHienTai > 0 ? formatDisplay(row.dtqdHienTai) : '-'}</div>
                    </div>
                    <div style={{ background: '#f5f3ff', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Dự kiến</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: '#7c3aed', fontFamily: "'Be Vietnam Pro', monospace" }}>{row.duKien > 0 ? formatDisplay(row.duKien) : '-'}</div>
                    </div>
                    <div style={{ background: '#fff7ed', borderRadius: 12, padding: '10px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Target SSG</div>
                      <div style={{ fontSize: 17, fontWeight: 900, color: ORANGE, fontFamily: "'Be Vietnam Pro', monospace" }}>{row.targetHienTai > 0 ? formatDisplay(row.targetHienTai) : '-'}</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>DỰ KIẾN</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: barColor, fontFamily: "'Be Vietnam Pro', monospace" }}>{htPct > 0 ? `${htPct.toFixed(1)}%` : '-'}</span>
                    </div>
                    <div style={{ background: '#f1f5f9', borderRadius: 100, height: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 100, background: `linear-gradient(90deg, ${barColor}, ${htPct >= 100 ? '#22c55e' : barColor})`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>

                  {/* 2x2 Metric Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <div style={{ background: '#fffbeb', borderRadius: 14, padding: '12px', textAlign: 'center', border: '1.5px solid #fde68a' }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>DTQĐ {new Date().getFullYear() - 1}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: '#92400e', fontFamily: "'Be Vietnam Pro', monospace" }}>{row.dtqdNamTruoc > 0 ? formatDisplay(row.dtqdNamTruoc) : '-'}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 14, padding: '12px', textAlign: 'center', border: '1.5px solid #e2e8f0' }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>SSG</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: row.ssgPercent >= row.ssgTargetGrowth ? GREEN : '#dc2626', fontFamily: "'Be Vietnam Pro', monospace" }}>
                        {row.dtqdNamTruoc > 0 && row.duKien > 0 ? `${row.ssgPercent >= 0 ? '+' : ''}${row.ssgPercent.toFixed(1)}%` : '-'}
                      </div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '12px', textAlign: 'center', border: `1.5px solid ${GREEN}40` }}>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>TB/ Ngày</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: GREEN, fontFamily: "'Be Vietnam Pro', monospace" }}>{row.tbNgay > 0 ? formatDisplay(row.tbNgay) : '-'}</div>
                    </div>
                    <div style={{ background: row.tbConLai > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 16, padding: '16px 12px', textAlign: 'center', border: `3px solid ${row.tbConLai > 0 ? '#dc2626' : GREEN}`, boxShadow: row.tbConLai > 0 ? '0 0 16px rgba(220,38,38,0.25)' : `0 0 16px rgba(74,222,128,0.25)`, gridColumn: 'span 2' }}>
                      <div style={{ fontSize: 13, color: row.tbConLai > 0 ? '#dc2626' : GREEN, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>🎯 M.TIÊU HÔM NAY</div>
                      <div style={{ fontSize: 30, fontWeight: 900, color: row.tbConLai > 0 ? '#dc2626' : GREEN, fontFamily: "'Be Vietnam Pro', monospace", lineHeight: 1 }}>
                        {row.targetHienTai > 0 ? formatDisplay(row.tbConLai < 0 ? row.tbNgay : row.tbConLai) : '-'}
                      </div>
                      {row.tbConLai < 0 && (
                        <div style={{ fontSize: 11, color: GREEN, fontWeight: 900, textTransform: 'uppercase', marginTop: 6, letterSpacing: '0.03em' }}>
                          🎉 VƯỢT M.TIÊU
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Editable Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✏️ DTQĐ NĂM TRƯỚC</div>
                      <input type="text" value={formatNumber(row.raw.dtqdNamTruoc)} onChange={e => updateCell(row.storeName, 'dtqdNamTruoc', e.target.value)} placeholder="Nhập..." className="ssg-input" style={{ color: '#92400e', width: '100%', textAlign: 'center', background: '#fffbeb', borderRadius: 10, padding: '8px', border: '1.5px solid #fde68a', fontSize: 15, fontWeight: 800 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: ORANGE, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>✏️ Mục tiêu SSG</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input type="text" value={row.raw.mucTieuSSG} onChange={e => updateCell(row.storeName, 'mucTieuSSG', e.target.value)} placeholder="0" className="ssg-input" style={{ color: ORANGE, fontWeight: 900, width: '100%', textAlign: 'center', background: '#fffbeb', borderRadius: 10, padding: '8px', border: '1.5px solid #fde68a', fontSize: 15 }} />
                        <span style={{ color: ORANGE, fontWeight: 900, fontSize: 18 }}>%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-card capture button when 2+ stores */}
                {computedRows.length > 1 && (
                  <div className="no-capture" style={{ padding: '8px 16px 12px', display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={async () => {
                        const cardEl = document.getElementById(`ssg-card-${idx}`);
                        if (!cardEl) return;
                        try {
                          const dataUrl = await captureOffscreen(cardEl, { backgroundColor: '#ffffff' });
                          setPreviewImage(dataUrl);
                        } catch (err) { console.error(err); }
                      }}
                      style={{ background: GREEN, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.03em' }}
                    >
                      <Camera size={14} /> Chụp ảnh
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          </div>

          {/* TỔNG Card */}
          {computedRows.length > 1 && (
            <div style={{ borderRadius: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `2px solid ${GREEN}` }}>
              <div style={{ background: `linear-gradient(135deg, ${GREEN}, #22c55e)`, padding: '14px 20px', textAlign: 'center', borderRadius: '18px 18px 0 0' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TỔNG CỤM</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, padding: 8 }}>
                {[
                  { label: 'DTQĐ NT', value: fmtTotal(totals.dtqdNamTruoc), color: '#92400e', bg: '#fffbeb' },
                  { label: 'Target', value: fmtTotal(totals.targetHienTai), color: ORANGE, bg: '#fff7ed' },
                  { label: 'Hiện tại', value: fmtTotal(totals.dtqdHienTai), color: '#1d4ed8', bg: '#eff6ff' },
                  { label: 'Dự kiến', value: fmtTotal(totals.duKien), color: '#7c3aed', bg: '#f5f3ff' },
                  { label: '% DỰ KIẾN', value: totals.targetHienTai > 0 ? `${((totals.duKien / totals.targetHienTai) * 100).toFixed(1)}%` : '-', color: totals.targetHienTai > 0 && (totals.duKien / totals.targetHienTai * 100) >= 100 ? GREEN : '#dc2626', bg: '#f8fafc' },
                  { label: 'SSG', value: (() => { const g = totals.dtqdNamTruoc > 0 ? ((totals.duKien / totals.dtqdNamTruoc) - 1) * 100 : 0; return g !== 0 ? `${g >= 0 ? '+' : ''}${g.toFixed(1)}%` : '-'; })(), color: GREEN, bg: '#f0fdf4' },
                  { label: 'TB/ Ngày', value: fmtTotal(totals.tbNgay), color: GREEN, bg: '#f0fdf4' },
                  { label: 'TB Còn lại', value: fmtTotal(totals.tbConLai), color: totals.tbConLai > 0 ? '#dc2626' : GREEN, bg: totals.tbConLai > 0 ? '#fef2f2' : '#f0fdf4' },
                ].map((item) => (
                  <div key={item.label} style={{ padding: '12px 8px', textAlign: 'center', background: item.bg, borderRadius: 12, margin: 4 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontWeight: 900, color: item.color, fontSize: 18, fontFamily: "'Be Vietnam Pro', monospace" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {previewImage && (
        <ImagePreviewModal
          previewImage={previewImage}
          setPreviewImage={setPreviewImage}
        />
      )}
    </div>
  );
};

export default SSGBoss;
