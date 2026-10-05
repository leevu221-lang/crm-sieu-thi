import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Camera, RotateCcw, Info, Edit, Check, AlertCircle } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';

interface Market {
  name: string;
  actualReal?: number;
  actualVirtual?: number;
  targetQD?: number;
  percentHT?: number;
  isSummary?: boolean;
}

interface BonusCalculatorFormProps {
  activeStore: string;
  filteredMarkets: Market[];
  clusterMarkets?: Market[];
}

interface DepartmentRow {
  boPhan: string;
  gioCong: string;
}

interface SectionState {
  tongDoanhThuCum: number;
  vungSieuThiBase: string;
  soLuongStTrongCum: number;
  soLuongStHtTargetLntt: number;
  thuongChuan: number;
  htTargetCumDt: number; // in percentage, e.g. 120.0
  htTargetCumLn: number; // in percentage, e.g. 110.0
  thuongQyMoLntt: number;
  departments: DepartmentRow[];
  overrides: { [key: string]: number };
}

// Utility to clean and extract default region from store name
const detectRegionCode = (storeName?: string): string => {
  if (!storeName || typeof storeName !== 'string') return 'V02';
  const clean = storeName.toUpperCase();
  if (clean.includes('V01')) return 'V01';
  if (clean.includes('V02')) return 'V02';
  if (clean.includes('V03')) return 'V03';
  if (clean.includes('V04')) return 'V04';
  return 'V02';
};

// Region multipliers mapping
const getRegionMultiplier = (region?: string): number => {
  switch (region) {
    case 'V01': return 1.00;
    case 'V02': return 0.97;
    case 'V03': return 0.93;
    case 'V04': return 0.90;
    default: return 0.97;
  }
};

// K2 - Hệ số số lượng siêu thị trong cụm (theo SL ST + Doanh thu cụm)
const K2_TABLE: number[][] = [
  // Dưới 3 tỷ, Từ 3-5 tỷ, Từ 5-12 tỷ, Từ 12-16 tỷ, Trên 16 tỷ
  [1.0,  1.0,  1.0,  1.0,  1.0 ],  // 1 ST
  [1.1,  1.08, 1.05, 1.03, 1.0 ],  // 2 ST
  [1.4,  1.3,  1.15, 1.1,  1.03],  // 3 ST
  [1.6,  1.4,  1.2,  1.15, 1.05],  // 4 ST
  [1.6,  1.5,  1.3,  1.2,  1.1 ],  // 5+ ST
];

const getK2Multiplier = (soLuongSt: number, doanhThuCum: number): number => {
  const row = Math.min(Math.max(soLuongSt || 1, 1), 5) - 1;
  let col: number;
  const safeDt = Math.max(0, doanhThuCum || 0);
  if (safeDt < 3_000_000_000) col = 0;
  else if (safeDt < 5_000_000_000) col = 1;
  else if (safeDt < 12_000_000_000) col = 2;
  else if (safeDt < 16_000_000_000) col = 3;
  else col = 4;
  return K2_TABLE[row][col];
};

const getK2ColIndex = (doanhThuCum: number): number => {
  const safeDt = Math.max(0, doanhThuCum || 0);
  if (safeDt < 3_000_000_000) return 0;
  if (safeDt < 5_000_000_000) return 1;
  if (safeDt < 12_000_000_000) return 2;
  if (safeDt < 16_000_000_000) return 3;
  return 4;
};

// Compute Thưởng chuẩn from formula (Excel: VÍ DỤ sheet)
const computeThuongChuanFormula = (doanhThuCum: number, k1: number, k2: number, isQL: boolean): number => {
  const safeDt = Math.max(0, doanhThuCum || 0);
  const safeK1 = k1 || 0.97;
  const safeK2 = k2 || 1.0;
  if (isQL) {
    return Math.floor(((10_000_000 + Math.pow(safeDt, 0.65) * 5.5) * safeK1) * safeK2);
  } else {
    return Math.floor((Math.pow(safeDt, 0.9) * 0.016 * safeK1) * safeK2);
  }
};

// Normalize and match store prefixes starting with ĐML, ĐMM, ĐMS, TGD, AAR
const matchPrefix = (name?: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  const normName = name.trim().normalize('NFC').toUpperCase();
  const prefixes = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR', 'ÐML', 'ÐMM', 'ÐMS', 'DML', 'DMM', 'DMS'];
  return prefixes.some(pref => normName.startsWith(pref));
};

// Formats cluster revenue for display: e.g. 6977000000 -> 6,977,000,000
const formatRevenueDisplay = (val?: number): string => {
  if (!val || isNaN(val)) return '-';
  return Math.round(val).toLocaleString('en-US');
};

const formatCurrency = (val: number | string | undefined): string => {
  if (val === undefined || val === null) return '-';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return '-';
  return num.toLocaleString('en-US');
};

// Helper component to render an Excel-like editable cell (Module-scoped & Memoized for max performance)
interface ExcelCellProps {
  value: string | number;
  displayValue?: string;
  isInput?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
  isBold?: boolean;
  onChange?: (val: string) => void;
  placeholder?: string;
  onResetOverride?: () => void;
  isOverridden?: boolean;
}

const ExcelCell: React.FC<ExcelCellProps> = React.memo(({
  value,
  displayValue,
  isInput = false,
  textColor = 'text-slate-800',
  bgColor = 'bg-white',
  align = 'right',
  isBold = false,
  onChange,
  placeholder = '',
  onResetOverride,
  isOverridden = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formattedDisplay = () => {
    if (displayValue !== undefined) {
      return displayValue;
    }
    if (typeof value === 'number') {
      return value.toLocaleString('en-US');
    }
    return value !== undefined && value !== null ? value.toString() : '';
  };

  const startEditing = () => {
    if (!onChange) return;
    setTempValue(value !== undefined && value !== null ? value.toString() : '');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const stopEditing = () => {
    setIsEditing(false);
    if (onChange) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      stopEditing();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const alignClass = align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right';
  const weightClass = isBold ? 'font-bold' : 'font-medium';

  if (isInput && onChange) {
    const displayVal = inputFocused
      ? (value ?? '').toString()
      : (typeof value === 'number' ? value.toLocaleString('en-US') : (value || placeholder || '-'));
    return (
      <td className={`p-0 border border-slate-300 ${bgColor}`}>
        <input
          type="text"
          inputMode="numeric"
          className={`w-full h-full px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] ${alignClass} font-bold text-xs sm:text-sm ${textColor} ${bgColor} transition-colors`}
          value={displayVal}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '-'}
        />
      </td>
    );
  }

  if (isEditing) {
    return (
      <td className={`p-0 border border-slate-300 ${bgColor}`}>
        <input
          ref={inputRef}
          type="text"
          className={`w-full h-full px-2 py-1 focus:outline-none ${alignClass} font-semibold ${textColor} bg-[#ffffcc] border-2 border-indigo-500 text-xs sm:text-sm`}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={stopEditing}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  return (
    <td
      onClick={startEditing}
      className={`px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm select-none relative group ${alignClass} ${weightClass} ${textColor} ${bgColor} ${onChange ? 'cursor-pointer hover:bg-slate-100/80' : ''}`}
    >
      <span>{formattedDisplay() || placeholder}</span>
      {isOverridden && (
        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" title="Đã sửa công thức" />
      )}
      {onChange && !isInput && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 no-capture">
          <Edit size={10} />
        </div>
      )}
    </td>
  );
});
ExcelCell.displayName = 'ExcelCell';

// Helper to safely parse local storage section state
const safeParseSectionState = (jsonStr: string | null, fallback: SectionState): SectionState => {
  if (!jsonStr) return fallback;
  try {
    const p = JSON.parse(jsonStr);
    return {
      ...fallback,
      ...p,
      departments: Array.isArray(p?.departments) && p.departments.length > 0 ? p.departments : fallback.departments,
      overrides: p?.overrides && typeof p.overrides === 'object' ? p.overrides : {}
    };
  } catch {
    return fallback;
  }
};

export const BonusCalculatorForm: React.FC<BonusCalculatorFormProps> = ({ 
  activeStore = '', 
  filteredMarkets = [], 
  clusterMarkets = [] 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Safe initial stores
  const storeKey = String(activeStore || 'default');
  const safeRegion = detectRegionCode(storeKey);

  // Default initial states
  const createDefaultQLState = useCallback((storeCode: string, defaultRevenue: number): SectionState => {
    const region = detectRegionCode(storeCode);
    const mult = getRegionMultiplier(region);
    return {
      tongDoanhThuCum: defaultRevenue,
      vungSieuThiBase: region,
      soLuongStTrongCum: 1,
      soLuongStHtTargetLntt: 1,
      thuongChuan: computeThuongChuanFormula(defaultRevenue, mult, getK2Multiplier(1, defaultRevenue), true),
      htTargetCumDt: 120.0,
      htTargetCumLn: 110.0,
      thuongQyMoLntt: 0,
      departments: [
        { boPhan: 'Quản Lý', gioCong: '200' },
        { boPhan: 'Quản Lý', gioCong: '' },
        { boPhan: 'NV Ủy quyền', gioCong: '' },
      ],
      overrides: {}
    };
  }, []);

  const createDefaultTCState = useCallback((storeCode: string, defaultRevenue: number): SectionState => {
    const region = detectRegionCode(storeCode);
    const mult = getRegionMultiplier(region);
    return {
      tongDoanhThuCum: defaultRevenue,
      vungSieuThiBase: region,
      soLuongStTrongCum: 1,
      soLuongStHtTargetLntt: 1,
      thuongChuan: computeThuongChuanFormula(defaultRevenue, mult, getK2Multiplier(1, defaultRevenue), false),
      htTargetCumDt: 120.0,
      htTargetCumLn: 110.0,
      thuongQyMoLntt: 0,
      departments: [
        { boPhan: 'Trưởng Ca 1', gioCong: '200' },
        { boPhan: 'Trưởng Ca 2', gioCong: '' },
        { boPhan: 'Trưởng Ca 3', gioCong: '' },
        { boPhan: 'Trưởng Ca 4', gioCong: '' },
      ],
      overrides: {}
    };
  }, []);

  const [qlState, setQlState] = useState<SectionState>(() => createDefaultQLState(safeRegion, 7000000000));
  const [tcState, setTcState] = useState<SectionState>(() => createDefaultTCState(safeRegion, 7000000000));

  // Loading state when activeStore changes
  useEffect(() => {
    if (!activeStore) return;
    const storeCode = detectRegionCode(activeStore);
    const market = (filteredMarkets || []).find(m => m && m.name === activeStore);
    const defaultRev = market?.actualReal ? Math.round(market.actualReal) : 7000000000;

    const defaultQL = createDefaultQLState(storeCode, defaultRev);
    const defaultTC = createDefaultTCState(storeCode, defaultRev);

    try {
      const savedQL = localStorage.getItem(`BONUS_CALC_QL_${activeStore}`);
      const savedTC = localStorage.getItem(`BONUS_CALC_TC_${activeStore}`);
      setQlState(safeParseSectionState(savedQL, defaultQL));
      setTcState(safeParseSectionState(savedTC, defaultTC));
    } catch {
      setQlState(defaultQL);
      setTcState(defaultTC);
    }
  }, [activeStore, createDefaultQLState, createDefaultTCState]);

  // Auto-sync computed values from pasted cluster data (clusterMarkets)
  useEffect(() => {
    if (!clusterMarkets || clusterMarkets.length === 0) return;

    const totalRow = clusterMarkets.find(m => m && (m.name === 'TỔNG' || m.isSummary));
    const rawRevenue = totalRow?.actualVirtual || totalRow?.targetQD || 0;
    const clusterRevenue = rawRevenue > 0 && rawRevenue < 1_000_000 ? rawRevenue * 1_000_000 : rawRevenue;

    const validStores = clusterMarkets.filter(m => m && !m.isSummary && m.name !== 'TỔNG' && matchPrefix(m.name));
    const storeCount = validStores.length;
    const completedLnttCount = validStores.filter(m => m.percentHT !== undefined && m.percentHT >= 100).length;
    const htTargetDt = totalRow?.percentHT || 0;

    setQlState(prev => {
      const overrides = prev.overrides || {};
      let changed = false;
      const next = { ...prev };
      if (clusterRevenue > 0 && overrides.tongDoanhThuCum === undefined && prev.tongDoanhThuCum !== clusterRevenue) {
        next.tongDoanhThuCum = clusterRevenue;
        changed = true;
      }
      if (storeCount > 0 && overrides.soLuongStTrongCum === undefined && prev.soLuongStTrongCum !== storeCount) {
        next.soLuongStTrongCum = storeCount;
        changed = true;
      }
      if (overrides.soLuongStHtTargetLntt === undefined && prev.soLuongStHtTargetLntt !== completedLnttCount) {
        next.soLuongStHtTargetLntt = completedLnttCount;
        changed = true;
      }
      if (htTargetDt > 0 && overrides.htTargetCumDt === undefined && prev.htTargetCumDt !== htTargetDt) {
        next.htTargetCumDt = htTargetDt;
        changed = true;
      }
      if (changed) {
        if (activeStore) {
          try { localStorage.setItem(`BONUS_CALC_QL_${activeStore}`, JSON.stringify(next)); } catch {}
        }
        return next;
      }
      return prev;
    });

    setTcState(prev => {
      const overrides = prev.overrides || {};
      let changed = false;
      const next = { ...prev };
      if (clusterRevenue > 0 && overrides.tongDoanhThuCum === undefined && prev.tongDoanhThuCum !== clusterRevenue) {
        next.tongDoanhThuCum = clusterRevenue;
        changed = true;
      }
      if (storeCount > 0 && overrides.soLuongStTrongCum === undefined && prev.soLuongStTrongCum !== storeCount) {
        next.soLuongStTrongCum = storeCount;
        changed = true;
      }
      if (overrides.soLuongStHtTargetLntt === undefined && prev.soLuongStHtTargetLntt !== completedLnttCount) {
        next.soLuongStHtTargetLntt = completedLnttCount;
        changed = true;
      }
      if (htTargetDt > 0 && overrides.htTargetCumDt === undefined && prev.htTargetCumDt !== htTargetDt) {
        next.htTargetCumDt = htTargetDt;
        changed = true;
      }
      if (changed) {
        if (activeStore) {
          try { localStorage.setItem(`BONUS_CALC_TC_${activeStore}`, JSON.stringify(next)); } catch {}
        }
        return next;
      }
      return prev;
    });
  }, [clusterMarkets?.length, activeStore]);

  // Persist states to LocalStorage
  const saveQLState = (newState: SectionState) => {
    setQlState(newState);
    if (activeStore) {
      try { localStorage.setItem(`BONUS_CALC_QL_${activeStore}`, JSON.stringify(newState)); } catch {}
    }
  };

  const saveTCState = (newState: SectionState) => {
    setTcState(newState);
    if (activeStore) {
      try { localStorage.setItem(`BONUS_CALC_TC_${activeStore}`, JSON.stringify(newState)); } catch {}
    }
  };

  // Capture Image
  const handleCapture = async () => {
    if (!containerRef.current) return;
    setIsCapturing(true);

    const element = containerRef.current;
    const targetWidth = Math.max(1050, element.scrollWidth + 48);

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${targetWidth}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    const clone = element.cloneNode(true) as HTMLElement;

    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, input');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    clone.style.width = `${targetWidth}px`;
    clone.style.minWidth = `${targetWidth}px`;
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '24px';
    clone.style.backgroundColor = '#ffffff';
    clone.style.display = 'inline-block';
    clone.style.boxSizing = 'border-box';
    clone.style.borderRadius = '24px';

    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = '100%';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
    });

    const tables = clone.querySelectorAll('table');
    tables.forEach(table => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.boxSizing = 'border-box';
    });

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);
    
    try {
      await ensureFontsReady();
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalWidth = targetWidth;
      const finalHeight = clone.offsetHeight || clone.scrollHeight;

      const dataUrl = await htmlToImage.toPng(clone, {
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: false,
        width: finalWidth,
        height: finalHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: `${finalWidth}px`,
          height: `${finalHeight}px`,
          ...EXPORT_FONT_STYLE,
        }
      });
      
      const link = document.createElement('a');
      link.download = `Form_Tinh_Thuong_${detectRegionCode(activeStore)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error capturing component:', error);
      alert('Không thể chụp ảnh bảng tính. Vui lòng thử lại!');
    } finally {
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      setIsCapturing(false);
    }
  };

  // Core Math Calculation Engine
  const calculateSectionValues = useCallback((state: SectionState, isTC: boolean) => {
    const {
      tongDoanhThuCum = 0,
      vungSieuThiBase = 'V02',
      soLuongStTrongCum = 1,
      soLuongStHtTargetLntt = 1,
      htTargetCumDt = 120.0,
      htTargetCumLn = 110.0,
      overrides = {}
    } = state || {};

    const k1 = getRegionMultiplier(vungSieuThiBase);
    const k2 = getK2Multiplier(soLuongStTrongCum, tongDoanhThuCum);

    const computedThuongChuan = computeThuongChuanFormula(tongDoanhThuCum, k1, k2, !isTC);
    const thuongChuan = overrides.thuongChuan !== undefined ? overrides.thuongChuan : computedThuongChuan;

    const defaultThuongChuanDt = Math.floor(thuongChuan * 0.6);
    const defaultThuongChuanLntt = Math.floor(thuongChuan * 0.4);

    const thuongChuanDt = overrides.thuongChuanDt !== undefined ? overrides.thuongChuanDt : defaultThuongChuanDt;
    const thuongChuanLntt = overrides.thuongChuanLntt !== undefined ? overrides.thuongChuanLntt : defaultThuongChuanLntt;

    const tyLeThuongDt = htTargetCumDt || 0;
    const tyLeThuongLntt = htTargetCumLn || 0;

    const defaultThuongDt = Math.floor(thuongChuanDt * (tyLeThuongDt / 100));
    const defaultThuongLntt = Math.floor(thuongChuanLntt * (tyLeThuongLntt / 100));

    const thuongDt = overrides.thuongDt !== undefined ? overrides.thuongDt : defaultThuongDt;
    const thuongLntt = overrides.thuongLntt !== undefined ? overrides.thuongLntt : defaultThuongLntt;

    const tyLeThuongQuyMo = Math.max(0, (soLuongStHtTargetLntt - 1) * 5);
    const computedThuongQyMoLntt = Math.floor(thuongChuan * 0.4 * (tyLeThuongQuyMo / 100));
    const thuongQyMoLntt = overrides.thuongQyMoLntt !== undefined ? overrides.thuongQyMoLntt : computedThuongQyMoLntt;

    const defaultQuyThuongFinal = Math.floor(thuongDt + thuongLntt + thuongQyMoLntt);
    const quyThuongFinal = overrides.quyThuongFinal !== undefined ? overrides.quyThuongFinal : defaultQuyThuongFinal;

    return {
      k1,
      k2,
      thuongChuan,
      thuongChuanDt,
      thuongChuanLntt,
      tyLeThuongDt,
      tyLeThuongLntt,
      thuongDt,
      thuongLntt,
      thuongQyMoLntt,
      tyLeThuongQuyMo,
      quyThuongFinal,
      isOverridden: (key: string) => overrides[key] !== undefined
    };
  }, []);

  const qlCalc = useMemo(() => calculateSectionValues(qlState, false), [calculateSectionValues, qlState]);
  const tcCalc = useMemo(() => calculateSectionValues(tcState, true), [calculateSectionValues, tcState]);

  const SHARED_FIELDS: (keyof SectionState)[] = [
    'tongDoanhThuCum', 'vungSieuThiBase', 'soLuongStTrongCum',
    'soLuongStHtTargetLntt', 'htTargetCumDt', 'htTargetCumLn'
  ];

  const handleInputChange = (
    section: 'QL' | 'TC',
    field: keyof SectionState,
    value: any
  ) => {
    const isQL = section === 'QL';
    const state = isQL ? qlState : tcState;
    const saveState = isQL ? saveQLState : saveTCState;

    saveState({
      ...state,
      [field]: value,
      overrides: {
        ...(state.overrides || {}),
        [field as string]: value
      }
    });

    if (SHARED_FIELDS.includes(field)) {
      const otherState = isQL ? tcState : qlState;
      const otherSave = isQL ? saveTCState : saveQLState;
      otherSave({
        ...otherState,
        [field]: value,
        overrides: {
          ...(otherState.overrides || {}),
          [field as string]: value
        }
      });
    }
  };

  const handleOverrideChange = (
    section: 'QL' | 'TC',
    field: string,
    value: string
  ) => {
    const isQL = section === 'QL';
    const state = isQL ? qlState : tcState;
    const saveState = isQL ? saveQLState : saveTCState;

    const numericVal = parseFloat(value.replace(/,/g, ''));
    const newOverrides = { ...(state.overrides || {}) };
    if (isNaN(numericVal)) {
      delete newOverrides[field];
    } else {
      newOverrides[field] = numericVal;
    }

    saveState({
      ...state,
      overrides: newOverrides
    });
  };

  const handleDeptChange = (
    section: 'QL' | 'TC',
    index: number,
    field: keyof DepartmentRow,
    value: string
  ) => {
    const isQL = section === 'QL';
    const state = isQL ? qlState : tcState;
    const saveState = isQL ? saveQLState : saveTCState;

    const currentDepts = Array.isArray(state?.departments) ? [...state.departments] : [];
    if (!currentDepts[index]) return;
    currentDepts[index] = {
      ...currentDepts[index],
      [field]: value
    };

    saveState({
      ...state,
      departments: currentDepts
    });
  };

  const renderRewardSection = (
    title: string,
    state: SectionState,
    calc: any,
    sectionKey: 'QL' | 'TC'
  ) => {
    const isQL = sectionKey === 'QL';
    const saveState = isQL ? saveQLState : saveTCState;

    const departments = Array.isArray(state?.departments) && state.departments.length > 0
      ? state.departments
      : isQL
        ? [
            { boPhan: 'Quản Lý', gioCong: '200' },
            { boPhan: 'Quản Lý', gioCong: '' },
            { boPhan: 'NV Ủy quyền', gioCong: '' }
          ]
        : [
            { boPhan: 'Trưởng Ca 1', gioCong: '200' },
            { boPhan: 'Trưởng Ca 2', gioCong: '' },
            { boPhan: 'Trưởng Ca 3', gioCong: '' },
            { boPhan: 'Trưởng Ca 4', gioCong: '' }
          ];

    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-3.5 sm:p-6 md:p-8 space-y-5 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 pb-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className={`w-2.5 sm:w-3 h-6 sm:h-8 rounded-full ${isQL ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* LEFT TABLE: Target calculation details */}
          <div className="lg:col-span-7 w-full overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[340px] border-collapse border border-slate-300">
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    className="px-3 sm:px-4 py-2 border border-slate-350 bg-[#ffff00] text-[#000000] font-black text-center text-xs sm:text-sm md:text-base tracking-wide"
                  >
                    Thưởng Target {isQL ? 'QUẢN LÝ' : 'TRƯỞNG CA'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Tổng doanh thu cụm */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50 w-2/3">
                    Tổng doanh thu cụm
                  </td>
                  <td className="p-0 border border-slate-300 bg-white relative group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full h-full px-2.5 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-right font-bold text-xs sm:text-sm text-[#ff0000] bg-white transition-colors"
                      value={formatRevenueDisplay(state.tongDoanhThuCum)}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                        saveState({ ...state, tongDoanhThuCum: num });
                        const otherState = isQL ? tcState : qlState;
                        const otherSave = isQL ? saveTCState : saveQLState;
                        otherSave({ ...otherState, tongDoanhThuCum: num });
                      }}
                      placeholder="-"
                    />
                  </td>
                </tr>

                {/* 2. Vùng siêu thị Base */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Vùng siêu thị Base
                  </td>
                  <td className="px-2 sm:px-3 py-1.5 border border-slate-300 text-center bg-white">
                    <select
                      value={state.vungSieuThiBase || 'V02'}
                      onChange={(e) => {
                        const region = e.target.value;
                        const newOverrides = { ...(state.overrides || {}) };
                        delete newOverrides.thuongChuan;
                        saveState({
                          ...state,
                          vungSieuThiBase: region,
                          overrides: newOverrides
                        });
                        const otherState = isQL ? tcState : qlState;
                        const otherSave = isQL ? saveTCState : saveQLState;
                        const otherOverrides = { ...(otherState.overrides || {}) };
                        delete otherOverrides.thuongChuan;
                        otherSave({
                          ...otherState,
                          vungSieuThiBase: region,
                          overrides: otherOverrides
                        });
                      }}
                      className="w-full text-center font-black text-[#ff0000] bg-transparent border-0 focus:outline-none focus:ring-0 text-xs sm:text-sm cursor-pointer appearance-none"
                      style={{ textAlignLast: 'center' }}
                    >
                      <option value="V01" className="text-slate-800 font-medium">V01 (100%)</option>
                      <option value="V02" className="text-slate-800 font-medium">V02 (97%)</option>
                      <option value="V03" className="text-slate-800 font-medium">V03 (93%)</option>
                      <option value="V04" className="text-slate-800 font-medium">V04 (90%)</option>
                    </select>
                  </td>
                </tr>

                {/* 3. Số lượng siêu thị trong cụm */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Số lượng siêu thị trong cụm
                  </td>
                  <ExcelCell
                    value={state.soLuongStTrongCum || 1}
                    textColor="text-[#008000]"
                    bgColor="bg-[#e2efda]"
                    align="center"
                    isBold
                    isInput
                    onChange={(val) => {
                      const num = parseInt(val) || 0;
                      handleInputChange(sectionKey, 'soLuongStTrongCum', num);
                    }}
                    isOverridden={(state.overrides || {}).soLuongStTrongCum !== undefined}
                  />
                </tr>

                {/* 3b. K2 - Hệ số SL siêu thị */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    K2 - Hệ số SL siêu thị
                  </td>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-center text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50">
                    {(calc.k2 * 100).toFixed(0)}%
                  </td>
                </tr>

                {/* 4. Số lượng siêu thị HT target LNTT */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Số lượng siêu thị HT target LNTT
                  </td>
                  <ExcelCell
                    value={state.soLuongStHtTargetLntt || 1}
                    textColor="text-[#008000]"
                    bgColor="bg-[#e2efda]"
                    align="center"
                    isBold
                    isInput
                    onChange={(val) => {
                      const num = parseInt(val) || 0;
                      handleInputChange(sectionKey, 'soLuongStHtTargetLntt', num);
                    }}
                    isOverridden={(state.overrides || {}).soLuongStHtTargetLntt !== undefined}
                  />
                </tr>

                {/* 5. Thưởng chuẩn */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Thưởng chuẩn
                    <span className="block text-[8.5px] sm:text-[9px] text-slate-400 font-medium mt-0.5">
                      {isQL ? '(10tr + DT^0.65 × 5.5 × K1) × K2' : '(DT^0.9 × 0.016 × K1) × K2'}
                    </span>
                  </td>
                  <ExcelCell
                    value={calc.thuongChuan}
                    textColor="text-slate-900"
                    bgColor="bg-[#e2efda]"
                    isBold
                    isInput
                    onChange={(val) => {
                      const num = parseFloat(val.replace(/,/g, '')) || 0;
                      handleInputChange(sectionKey, 'thuongChuan', num);
                    }}
                    isOverridden={calc.isOverridden('thuongChuan')}
                  />
                </tr>

                {/* 6. Thưởng chuẩn Doanh thu */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-medium pl-5 sm:pl-6 text-slate-600 bg-white">
                    Thưởng chuẩn Doanh thu
                  </td>
                  <ExcelCell
                    value={calc.thuongChuanDt}
                    textColor="text-slate-800"
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongChuanDt', val)}
                    isOverridden={calc.isOverridden('thuongChuanDt')}
                  />
                </tr>

                {/* 7. Thưởng chuẩn LNTT */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-medium pl-5 sm:pl-6 text-slate-600 bg-white">
                    Thưởng chuẩn LNTT
                  </td>
                  <ExcelCell
                    value={calc.thuongChuanLntt}
                    textColor="text-slate-800"
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongChuanLntt', val)}
                    isOverridden={calc.isOverridden('thuongChuanLntt')}
                  />
                </tr>

                {/* 8. %Tỷ lệ thưởng Doanh thu */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    %Tỷ lệ thưởng Doanh thu
                  </td>
                  <ExcelCell
                    value={`${(calc.tyLeThuongDt || 0).toFixed(1)}%`}
                    textColor="text-slate-800"
                    align="right"
                    isBold
                  />
                </tr>

                {/* 9. %Tỷ lệ thưởng LNTT */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    %Tỷ lệ thưởng LNTT
                  </td>
                  <ExcelCell
                    value={`${(calc.tyLeThuongLntt || 0).toFixed(1)}%`}
                    textColor="text-slate-800"
                    align="right"
                    isBold
                  />
                </tr>

                {/* 10. Thưởng Doanh thu */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-white">
                    Thưởng Doanh thu
                  </td>
                  <ExcelCell
                    value={calc.thuongDt}
                    textColor="text-slate-800"
                    isBold
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongDt', val)}
                    isOverridden={calc.isOverridden('thuongDt')}
                  />
                </tr>

                {/* 11. Thưởng LNTT */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-white">
                    Thưởng LNTT
                  </td>
                  <ExcelCell
                    value={calc.thuongLntt}
                    textColor="text-slate-800"
                    isBold
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongLntt', val)}
                    isOverridden={calc.isOverridden('thuongLntt')}
                  />
                </tr>

                {/* 12. Thưởng quy mô LNTT */}
                <tr>
                  <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-white">
                    Thưởng quy mô LNTT
                    <span className="block text-[8.5px] sm:text-[9px] text-slate-400 font-medium mt-0.5">
                      Tỷ lệ QM: {calc.tyLeThuongQuyMo}% = ({state.soLuongStHtTargetLntt} ST đạt − 1) × 5%
                    </span>
                  </td>
                  <ExcelCell
                    value={calc.thuongQyMoLntt === 0 ? '-' : calc.thuongQyMoLntt}
                    textColor="text-slate-800"
                    isBold
                    onChange={(val) => {
                      const cleanVal = val.trim() === '-' ? 0 : parseFloat(val.replace(/,/g, '')) || 0;
                      handleOverrideChange(sectionKey, 'thuongQyMoLntt', cleanVal.toString());
                    }}
                    isOverridden={calc.isOverridden('thuongQyMoLntt')}
                  />
                </tr>

                {/* 13. Quỹ thưởng Final */}
                <tr>
                  <td className="px-2.5 sm:px-2 py-2 border border-slate-300 text-xs sm:text-sm font-black bg-slate-100">
                    Quỹ thưởng Final
                  </td>
                  <ExcelCell
                    value={calc.quyThuongFinal}
                    textColor="text-slate-900"
                    bgColor="bg-slate-100"
                    isBold
                    onChange={(val) => handleOverrideChange(sectionKey, 'quyThuongFinal', val)}
                    isOverridden={calc.isOverridden('quyThuongFinal')}
                  />
                </tr>
              </tbody>
            </table>
            <div className="text-[10px] sm:text-[11px] font-black italic text-slate-800 mt-2 px-1">
              *Nhập dữ liệu tại các ô màu xanh
            </div>
          </div>

          {/* RIGHT SIDE: Two tables */}
          <div className="lg:col-span-5 space-y-5 w-full overflow-hidden">
            {/* Table 1: %HT Target lũy kế */}
            <div className="space-y-1 w-full overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[280px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black text-slate-700">
                    <th colSpan={3} className="px-2 py-1.5 border border-slate-300 text-center uppercase tracking-tight">
                      %HT Target lũy kế
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-[10.5px] sm:text-[11px] font-black text-slate-600 text-center">
                    <th className="px-2 py-1 border border-slate-300 w-1/3">Siêu thị</th>
                    <th className="px-2 py-1 border border-slate-300">Doanh thu</th>
                    <th className="px-2 py-1 border border-slate-300">Lợi Nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1.5 border border-slate-300 text-[10.5px] sm:text-[11px] font-black text-slate-800 text-center">
                      %HT target cụm
                    </td>
                    <td className="p-0 border border-slate-300 bg-[#e2efda]">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-center font-bold text-xs sm:text-sm text-[#c00000] bg-[#e2efda] transition-colors"
                        value={`${(state.htTargetCumDt || 0).toFixed(1)}%`}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value.replace(/%/g, '')) || 0;
                          handleInputChange(sectionKey, 'htTargetCumDt', num);
                        }}
                        onFocus={(e) => { e.target.value = (state.htTargetCumDt || 0).toString(); }}
                        onBlur={(e) => { e.target.value = `${(state.htTargetCumDt || 0).toFixed(1)}%`; }}
                        placeholder="-"
                      />
                    </td>
                    <td className="p-0 border border-slate-300 bg-[#e2efda]">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="w-full h-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-center font-bold text-xs sm:text-sm text-[#c00000] bg-[#e2efda] transition-colors"
                        value={`${(state.htTargetCumLn || 0).toFixed(1)}%`}
                        onChange={(e) => {
                          const num = parseFloat(e.target.value.replace(/%/g, '')) || 0;
                          handleInputChange(sectionKey, 'htTargetCumLn', num);
                        }}
                        onFocus={(e) => { e.target.value = (state.htTargetCumLn || 0).toString(); }}
                        onBlur={(e) => { e.target.value = `${(state.htTargetCumLn || 0).toFixed(1)}%`; }}
                        placeholder="-"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-slate-500 italic text-right px-1">
                Tổng thực hiện / tổng target cụm lũy kế
              </div>
            </div>

            {/* K2 Reference Table */}
            <div className="space-y-1 w-full overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[300px] border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#dce6f1]">
                    <th colSpan={6} className="px-2 py-1.5 border border-slate-300 text-center font-black text-[10.5px] sm:text-[11px] text-slate-700 uppercase tracking-tight">
                      K2 - Hệ số SL siêu thị trong cụm
                    </th>
                  </tr>
                  <tr className="bg-[#dce6f1] text-[9.5px] sm:text-[10px] font-bold text-slate-600 text-center">
                    <th className="px-1 py-1 border border-slate-300 w-[40px]">SL ST</th>
                    <th className="px-1 py-1 border border-slate-300">{'<'}3 tỷ</th>
                    <th className="px-1 py-1 border border-slate-300">3-5 tỷ</th>
                    <th className="px-1 py-1 border border-slate-300">5-12 tỷ</th>
                    <th className="px-1 py-1 border border-slate-300">12-16 tỷ</th>
                    <th className="px-1 py-1 border border-slate-300">{'>'}16 tỷ</th>
                  </tr>
                </thead>
                <tbody>
                  {K2_TABLE.map((row, rowIdx) => {
                    const stCount = rowIdx + 1;
                    const currentRow = Math.min(Math.max(state.soLuongStTrongCum || 1, 1), 5) - 1;
                    const currentCol = getK2ColIndex(state.tongDoanhThuCum || 0);
                    const isActiveRow = rowIdx === currentRow;
                    return (
                      <tr key={rowIdx} className={isActiveRow ? 'font-black' : ''}>
                        <td className={`px-1 py-0.5 border border-slate-300 text-center font-bold ${isActiveRow ? 'bg-amber-100' : 'bg-slate-50'}`}>
                          {stCount >= 5 ? '5+' : stCount}
                        </td>
                        {row.map((val, colIdx) => {
                          const isActive = isActiveRow && colIdx === currentCol;
                          return (
                            <td
                              key={colIdx}
                              className={`px-1 py-0.5 border border-slate-300 text-center ${
                                isActive
                                  ? 'bg-amber-300 font-black text-slate-900'
                                  : isActiveRow
                                  ? 'bg-amber-50'
                                  : ''
                              }`}
                            >
                              {(val * 100).toFixed(0)}%
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="text-[9.5px] sm:text-[10px] font-semibold text-slate-500 italic text-right px-1">
                K1: {state.vungSieuThiBase || 'V02'} = {((calc.k1 || 1) * 100).toFixed(0)}% · K2 = {((calc.k2 || 1) * 100).toFixed(0)}%
              </div>
            </div>

            {/* Table 2: Department Allocation */}
            <div className="space-y-1 w-full overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[280px] border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black text-slate-700 text-center">
                    <th className="px-2.5 sm:px-3 py-1.5 border border-slate-300 w-1/2">Bộ phận</th>
                    <th className="px-2 sm:px-3 py-1.5 border border-slate-300 w-1/4">Giờ công</th>
                    <th className="px-2.5 sm:px-3 py-1.5 border border-slate-300">Thưởng</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalHours = departments.reduce((sum, r) => {
                      const h = parseFloat(r?.gioCong || '0');
                      return sum + (isNaN(h) ? 0 : h);
                    }, 0);

                    return departments.map((row, idx) => {
                      const hours = parseFloat(row?.gioCong || '0');
                      const finalReward = isNaN(hours) || totalHours === 0
                        ? '-'
                        : Math.round((calc.quyThuongFinal || 0) * (hours / totalHours));

                      return (
                        <tr key={idx}>
                          <ExcelCell
                            value={row?.boPhan || ''}
                            align="left"
                            onChange={(val) => handleDeptChange(sectionKey, idx, 'boPhan', val)}
                          />
                          <td className="p-0 border border-slate-300 bg-[#e2efda]">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full h-full px-2 sm:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-center font-bold text-xs sm:text-sm text-[#c00000] bg-[#e2efda] transition-colors"
                              value={row?.gioCong || ''}
                              onChange={(e) => handleDeptChange(sectionKey, idx, 'gioCong', e.target.value)}
                              placeholder="-"
                            />
                          </td>
                          <td className="px-2.5 sm:px-3 py-1.5 border border-slate-300 text-xs sm:text-sm text-right font-black text-slate-900 bg-white">
                            {formatCurrency(finalReward)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const safeStoreName = String(activeStore || 'TẤT CẢ SIÊU THỊ');
  const storeDisplayTitle = safeStoreName.includes(' - ') ? safeStoreName.split(' - ')[0] : safeStoreName;

  return (
    <div className="w-full max-w-full space-y-6 overflow-hidden" ref={containerRef}>
      {/* Action Header card matching page style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm no-capture">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 sm:p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Info size={20} className="sm:w-[22px] sm:h-[22px]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm sm:text-base font-black text-slate-800 truncate">
              BẢNG TÍNH THƯỞNG TARGET SIÊU THỊ ({storeDisplayTitle})
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
              Chỉnh sửa các ô màu xanh hoặc click đúp vào các ô tính toán để ghi đè công thức.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-100 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Camera size={14} />
            <span>{isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH BÁO CÁO'}</span>
          </button>
        </div>
      </div>

      {/* Main calculation forms */}
      <div className="space-y-6 sm:space-y-8 max-w-full">
        {renderRewardSection('Thưởng Target QUẢN LÝ', qlState, qlCalc, 'QL')}
        {renderRewardSection('Thưởng Target TRƯỞNG CA', tcState, tcCalc, 'TC')}
      </div>
    </div>
  );
};
