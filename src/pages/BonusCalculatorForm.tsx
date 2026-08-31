import React, { useState, useEffect, useRef } from 'react';
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
const detectRegionCode = (storeName: string): string => {
  if (!storeName) return 'V02';
  const clean = storeName.toUpperCase();
  if (clean.includes('V01')) return 'V01';
  if (clean.includes('V02')) return 'V02';
  if (clean.includes('V03')) return 'V03';
  if (clean.includes('V04')) return 'V04';
  return 'V02'; // default to mockup V02
};

// Region multipliers mapping
const getRegionMultiplier = (region: string): number => {
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
  const row = Math.min(Math.max(soLuongSt, 1), 5) - 1;
  let col: number;
  if (doanhThuCum < 3_000_000_000) col = 0;
  else if (doanhThuCum < 5_000_000_000) col = 1;
  else if (doanhThuCum < 12_000_000_000) col = 2;
  else if (doanhThuCum < 16_000_000_000) col = 3;
  else col = 4;
  return K2_TABLE[row][col];
};

const getK2ColIndex = (doanhThuCum: number): number => {
  if (doanhThuCum < 3_000_000_000) return 0;
  if (doanhThuCum < 5_000_000_000) return 1;
  if (doanhThuCum < 12_000_000_000) return 2;
  if (doanhThuCum < 16_000_000_000) return 3;
  return 4;
};

// Compute Thưởng chuẩn from formula (Excel: VÍ DỤ sheet)
// QL: ((10^7 + DT^0.65 × 5.5) × K1) × K2
// TC: (DT^0.9 × 0.016 × K1) × K2
const computeThuongChuanFormula = (doanhThuCum: number, k1: number, k2: number, isQL: boolean): number => {
  const safeDt = Math.max(0, doanhThuCum);
  if (isQL) {
    // K1 multiplies the entire (10M + DT^0.65 * 5.5) sum
    return Math.floor(((10_000_000 + Math.pow(safeDt, 0.65) * 5.5) * k1) * k2);
  } else {
    return Math.floor((Math.pow(safeDt, 0.9) * 0.016 * k1) * k2);
  }
};

// Normalize and match store prefixes starting with ĐML, ĐMM, ĐMS, TGD, AAR
const matchPrefix = (name: string): boolean => {
  if (!name) return false;
  const normName = name.trim().normalize('NFC').toUpperCase();
  const prefixes = ['ĐML', 'ĐMM', 'ĐMS', 'TGD', 'AAR', 'ÐML', 'ÐMM', 'ÐMS', 'DML', 'DMM', 'DMS'];
  return prefixes.some(pref => normName.startsWith(pref));
};

// Formats cluster revenue for display: e.g. 6977000000 -> 6,977,000,000
const formatRevenueDisplay = (val: number): string => {
  if (!val) return '-';
  return Math.round(val).toLocaleString('en-US');
};

export const BonusCalculatorForm: React.FC<BonusCalculatorFormProps> = ({ activeStore, filteredMarkets, clusterMarkets }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Default initial states
  const createDefaultQLState = (storeCode: string, defaultRevenue: number): SectionState => {
    const region = detectRegionCode(activeStore);
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
  };

  const createDefaultTCState = (storeCode: string, defaultRevenue: number): SectionState => {
    const region = detectRegionCode(activeStore);
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
  };

  const [qlState, setQlState] = useState<SectionState>(() => createDefaultQLState('V02', 7000000000));
  const [tcState, setTcState] = useState<SectionState>(() => createDefaultTCState('V02', 7000000000));

  // Loading state when activeStore changes
  useEffect(() => {
    if (!activeStore) return;
    
    const storeCode = detectRegionCode(activeStore);
    const market = filteredMarkets.find(m => m.name === activeStore);
    const defaultRev = market?.actualReal ? Math.round(market.actualReal) : 7000000000;

    const savedQL = localStorage.getItem(`BONUS_CALC_QL_${activeStore}`);
    if (savedQL) {
      try {
        setQlState(JSON.parse(savedQL));
      } catch (e) {
        setQlState(createDefaultQLState(storeCode, defaultRev));
      }
    } else {
      setQlState(createDefaultQLState(storeCode, defaultRev));
    }

    const savedTC = localStorage.getItem(`BONUS_CALC_TC_${activeStore}`);
    if (savedTC) {
      try {
        setTcState(JSON.parse(savedTC));
      } catch (e) {
        setTcState(createDefaultTCState(storeCode, defaultRev));
      }
    } else {
      setTcState(createDefaultTCState(storeCode, defaultRev));
    }
  }, [activeStore, filteredMarkets]);

  // Auto-sync computed values from pasted cluster data (clusterMarkets)
  useEffect(() => {
    if (!clusterMarkets || clusterMarkets.length === 0) return;

    // 1. Fetch Cluster Total Revenue from the summary row (TỔNG)
    // Use "DOANH THU QĐ" (actualVirtual - cột thứ 3 từ trái) or fallback to targetQD
    // BI data is in triệu đồng → multiply by 1,000,000 to convert to đồng (internal unit)
    const totalRow = clusterMarkets.find(m => m.name === 'TỔNG' || m.isSummary);
    const rawRevenue = totalRow?.actualVirtual || totalRow?.targetQD || 0;
    const clusterRevenue = rawRevenue > 0 && rawRevenue < 1_000_000 ? rawRevenue * 1_000_000 : rawRevenue;

    // 2. Count parsed store counts matching ĐML, ĐMM, ĐMS, TGD, AAR
    const validStores = clusterMarkets.filter(m => !m.isSummary && m.name !== 'TỔNG' && matchPrefix(m.name));
    const storeCount = validStores.length;
    const completedLnttCount = validStores.filter(m => m.percentHT !== undefined && m.percentHT >= 100).length;

    // 3. Get %HT TARGET from TỔNG row (percentHT)
    const htTargetDt = totalRow?.percentHT || 0;

    // Update Quản Lý State
    setQlState(prev => {
      const updates: Partial<SectionState> = {};
      if (clusterRevenue > 0 && prev.overrides.tongDoanhThuCum === undefined && prev.tongDoanhThuCum !== clusterRevenue) {
        updates.tongDoanhThuCum = clusterRevenue;
      }
      if (storeCount > 0 && prev.overrides.soLuongStTrongCum === undefined && prev.soLuongStTrongCum !== storeCount) {
        updates.soLuongStTrongCum = storeCount;
      }
      if (prev.overrides.soLuongStHtTargetLntt === undefined && prev.soLuongStHtTargetLntt !== completedLnttCount) {
        updates.soLuongStHtTargetLntt = completedLnttCount;
      }
      if (htTargetDt > 0 && prev.overrides.htTargetCumDt === undefined && prev.htTargetCumDt !== htTargetDt) {
        updates.htTargetCumDt = htTargetDt;
      }
      
      if (Object.keys(updates).length > 0) {
        const next = { ...prev, ...updates };
        if (activeStore) {
          localStorage.setItem(`BONUS_CALC_QL_${activeStore}`, JSON.stringify(next));
        }
        return next;
      }
      return prev;
    });

    // Update Trưởng Ca State
    setTcState(prev => {
      const updates: Partial<SectionState> = {};
      if (clusterRevenue > 0 && prev.overrides.tongDoanhThuCum === undefined && prev.tongDoanhThuCum !== clusterRevenue) {
        updates.tongDoanhThuCum = clusterRevenue;
      }
      if (storeCount > 0 && prev.overrides.soLuongStTrongCum === undefined && prev.soLuongStTrongCum !== storeCount) {
        updates.soLuongStTrongCum = storeCount;
      }
      if (prev.overrides.soLuongStHtTargetLntt === undefined && prev.soLuongStHtTargetLntt !== completedLnttCount) {
        updates.soLuongStHtTargetLntt = completedLnttCount;
      }
      if (htTargetDt > 0 && prev.overrides.htTargetCumDt === undefined && prev.htTargetCumDt !== htTargetDt) {
        updates.htTargetCumDt = htTargetDt;
      }
      if (Object.keys(updates).length > 0) {
        const next = { ...prev, ...updates };
        if (activeStore) {
          localStorage.setItem(`BONUS_CALC_TC_${activeStore}`, JSON.stringify(next));
        }
        return next;
      }
      return prev;
    });
  }, [clusterMarkets, activeStore]);

  // Persist states to LocalStorage
  const saveQLState = (newState: SectionState) => {
    setQlState(newState);
    if (activeStore) {
      localStorage.setItem(`BONUS_CALC_QL_${activeStore}`, JSON.stringify(newState));
    }
  };

  const saveTCState = (newState: SectionState) => {
    setTcState(newState);
    if (activeStore) {
      localStorage.setItem(`BONUS_CALC_TC_${activeStore}`, JSON.stringify(newState));
    }
  };

  // Reset to default auto calculations
  const handleReset = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục tất cả công thức và giá trị mặc định?')) {
      const storeCode = detectRegionCode(activeStore);
      const market = filteredMarkets.find(m => m.name === activeStore);
      const defaultRev = market?.actualReal ? Math.round(market.actualReal) : 7000000000;

      const ql = createDefaultQLState(storeCode, defaultRev);
      const tc = createDefaultTCState(storeCode, defaultRev);
      
      saveQLState(ql);
      saveTCState(tc);
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
      // ★ Ensure UTM Avo font is fully loaded before export
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

  // Core Math Calculation Engine (with K1, K2, auto-computed thưởng chuẩn & thưởng quy mô)
  const calculateSectionValues = (state: SectionState, isTC: boolean) => {
    const {
      tongDoanhThuCum,
      vungSieuThiBase,
      soLuongStTrongCum,
      soLuongStHtTargetLntt,
      htTargetCumDt,
      htTargetCumLn,
      overrides
    } = state;

    // K1 (Hệ số Vùng) & K2 (Hệ số SL siêu thị)
    const k1 = getRegionMultiplier(vungSieuThiBase);
    const k2 = getK2Multiplier(soLuongStTrongCum, tongDoanhThuCum);

    // Thưởng chuẩn (auto-computed from formula unless overridden)
    const computedThuongChuan = computeThuongChuanFormula(tongDoanhThuCum, k1, k2, !isTC);
    const thuongChuan = overrides.thuongChuan !== undefined ? overrides.thuongChuan : computedThuongChuan;

    // 1. Thưởng chuẩn Doanh thu & LNTT (60% and 40%)
    const defaultThuongChuanDt = Math.floor(thuongChuan * 0.6);
    const defaultThuongChuanLntt = Math.floor(thuongChuan * 0.4);

    const thuongChuanDt = overrides.thuongChuanDt !== undefined ? overrides.thuongChuanDt : defaultThuongChuanDt;
    const thuongChuanLntt = overrides.thuongChuanLntt !== undefined ? overrides.thuongChuanLntt : defaultThuongChuanLntt;

    // 2. Tỷ lệ thưởng Doanh thu & LNTT
    const tyLeThuongDt = htTargetCumDt;
    const tyLeThuongLntt = htTargetCumLn;

    // 3. Thưởng Doanh thu & LNTT
    const defaultThuongDt = Math.floor(thuongChuanDt * (tyLeThuongDt / 100));
    const defaultThuongLntt = Math.floor(thuongChuanLntt * (tyLeThuongLntt / 100));

    const thuongDt = overrides.thuongDt !== undefined ? overrides.thuongDt : defaultThuongDt;
    const thuongLntt = overrides.thuongLntt !== undefined ? overrides.thuongLntt : defaultThuongLntt;

    // 4. Thưởng quy mô LNTT: (SL ST đạt target - 1) × 5%, min=0
    const tyLeThuongQuyMo = Math.max(0, (soLuongStHtTargetLntt - 1) * 5); // in %
    const computedThuongQyMoLntt = Math.floor(thuongChuan * 0.4 * (tyLeThuongQuyMo / 100));
    const thuongQyMoLntt = overrides.thuongQyMoLntt !== undefined ? overrides.thuongQyMoLntt : computedThuongQyMoLntt;

    // 5. Quỹ thưởng Final = Thưởng DT + Thưởng LNTT + Thưởng quy mô LNTT
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
  };

  const qlCalc = calculateSectionValues(qlState, false);
  const tcCalc = calculateSectionValues(tcState, true);

  // Shared fields that should sync between QL and TC
  const SHARED_FIELDS: (keyof SectionState)[] = [
    'tongDoanhThuCum', 'vungSieuThiBase', 'soLuongStTrongCum',
    'soLuongStHtTargetLntt', 'htTargetCumDt', 'htTargetCumLn'
  ];

  // Field edit handler for standard inputs (marks standard inputs as overridden)
  // Syncs shared fields bidirectionally between QL ↔ TC
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
        ...state.overrides,
        [field as string]: value
      }
    });

    // Sync shared fields to the other section
    if (SHARED_FIELDS.includes(field)) {
      const otherState = isQL ? tcState : qlState;
      const otherSave = isQL ? saveTCState : saveQLState;
      otherSave({
        ...otherState,
        [field]: value,
        overrides: {
          ...otherState.overrides,
          [field as string]: value
        }
      });
    }
  };

  // Edit handler for override values
  const handleOverrideChange = (
    section: 'QL' | 'TC',
    field: string,
    value: string
  ) => {
    const isQL = section === 'QL';
    const state = isQL ? qlState : tcState;
    const saveState = isQL ? saveQLState : saveTCState;

    const numericVal = parseFloat(value.replace(/,/g, ''));
    const newOverrides = { ...state.overrides };
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

  // Edit handler for department names & work hours
  const handleDeptChange = (
    section: 'QL' | 'TC',
    index: number,
    field: keyof DepartmentRow,
    value: string
  ) => {
    const isQL = section === 'QL';
    const state = isQL ? qlState : tcState;
    const saveState = isQL ? saveQLState : saveTCState;

    const newDepts = [...state.departments];
    newDepts[index] = {
      ...newDepts[index],
      [field]: value
    };

    saveState({
      ...state,
      departments: newDepts
    });
  };

  // Helper component to render an Excel-like editable cell
  const ExcelCell: React.FC<{
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
  }> = ({
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
      return value;
    };

    const startEditing = () => {
      if (!onChange) return;
      setTempValue(value.toString());
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

    // isInput mode: always render a visible input (no click-to-edit needed)
    // Format number with commas when displaying, show raw when editing
    if (isInput && onChange) {
      const displayVal = inputFocused
        ? value.toString()
        : (typeof value === 'number' ? value.toLocaleString('en-US') : (value || placeholder || '-'));
      return (
        <td className={`p-0 border border-slate-300 ${bgColor}`}>
          <input
            type="text"
            inputMode="numeric"
            className={`w-full h-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] ${alignClass} font-bold text-xs sm:text-sm ${textColor} ${bgColor} transition-colors`}
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
            className={`w-full h-full px-2 py-1 focus:outline-none ${alignClass} font-semibold ${textColor} bg-[#ffffcc] border-2 border-indigo-500`}
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
        className={`px-3 py-1.5 border border-slate-300 text-xs sm:text-sm select-none relative group ${alignClass} ${weightClass} ${textColor} ${bgColor} ${onChange ? 'cursor-pointer hover:bg-slate-100/80' : ''}`}
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
        {false && isOverridden && onResetOverride && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResetOverride();
            }}
            className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500 hover:text-amber-700 bg-amber-50 rounded p-0.5 no-capture"
            title="Khôi phục công thức tự động"
          >
            <RotateCcw size={10} />
          </button>
        )}
      </td>
    );
  };

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US');
  };

  // Render a Single Reward Section (Quản lý or Trưởng ca)
  const renderRewardSection = (
    title: string,
    state: SectionState,
    calc: any,
    sectionKey: 'QL' | 'TC'
  ) => {
    const isQL = sectionKey === 'QL';
    const saveState = isQL ? saveQLState : saveTCState;

    return (
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-5 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-8 rounded-full ${isQL ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          </div>
          {/* KHÔI PHỤC CÔNG THỨC button hidden */}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT TABLE: Target calculation details */}
          <div className="lg:col-span-7 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr>
                  <th
                    colSpan={2}
                    className="px-4 py-2 border border-slate-350 bg-[#ffff00] text-[#000000] font-black text-center text-sm md:text-base tracking-wide"
                  >
                    Thưởng Target {isQL ? 'QUẢN LÝ' : 'TRƯỞNG CA'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* 1. Tổng doanh thu cụm */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50 w-2/3">
                    Tổng doanh thu cụm
                  </td>
                  <td className="p-0 border border-slate-300 bg-white relative group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full h-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-right font-bold text-xs sm:text-sm text-[#ff0000] bg-white transition-colors"
                      value={formatRevenueDisplay(state.tongDoanhThuCum)}
                      onChange={(e) => {
                        const num = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                        // Update without marking as override → auto-sync from BI still works
                        saveState({ ...state, tongDoanhThuCum: num });
                        // Sync to the other section
                        const otherState = isQL ? tcState : qlState;
                        const otherSave = isQL ? saveTCState : saveQLState;
                        otherSave({ ...otherState, tongDoanhThuCum: num });
                      }}
                      placeholder="-"
                    />
                    {/* Reset button hidden */}
                  </td>
                </tr>

                {/* 2. Vùng siêu thị Base (Render select dropdown with multipliers) */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Vùng siêu thị Base
                  </td>
                  <td className="px-3 py-1.5 border border-slate-300 text-center bg-white">
                    <select
                      value={state.vungSieuThiBase}
                      onChange={(e) => {
                        const region = e.target.value;
                        // Let thuongChuan be auto-recomputed via formula with new K1
                        const newOverrides = { ...state.overrides };
                        delete newOverrides.thuongChuan;
                        saveState({
                          ...state,
                          vungSieuThiBase: region,
                          overrides: newOverrides
                        });
                        // Sync to the other section (QL ↔ TC)
                        const otherState = isQL ? tcState : qlState;
                        const otherSave = isQL ? saveTCState : saveQLState;
                        const otherOverrides = { ...otherState.overrides };
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
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Số lượng siêu thị trong cụm
                  </td>
                  <ExcelCell
                    value={state.soLuongStTrongCum}
                    textColor="text-[#008000]"
                    bgColor="bg-[#e2efda]"
                    align="center"
                    isBold
                    isInput
                    onChange={(val) => {
                      const num = parseInt(val) || 0;
                      handleInputChange(sectionKey, 'soLuongStTrongCum', num);
                    }}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.soLuongStTrongCum;
                      
                      const validStores = clusterMarkets?.filter(m => !m.isSummary && m.name !== 'TỔNG' && matchPrefix(m.name)) || [];
                      const storeCount = validStores.length || 1;
                      
                      saveState({
                        ...state,
                        soLuongStTrongCum: storeCount,
                        overrides: newOverrides
                      });
                    }}
                    isOverridden={state.overrides.soLuongStTrongCum !== undefined}
                  />
                </tr>

                {/* 3b. K2 - Hệ số SL siêu thị (auto-computed) */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    K2 - Hệ số SL siêu thị
                  </td>
                  <td className="px-3 py-1.5 border border-slate-300 text-center text-xs sm:text-sm font-black text-indigo-700 bg-indigo-50">
                    {(calc.k2 * 100).toFixed(0)}%
                  </td>
                </tr>

                {/* 4. Số lượng siêu thị HT target LNTT */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Số lượng siêu thị HT target LNTT
                  </td>
                  <ExcelCell
                    value={state.soLuongStHtTargetLntt}
                    textColor="text-[#008000]"
                    bgColor="bg-[#e2efda]"
                    align="center"
                    isBold
                    isInput
                    onChange={(val) => {
                      const num = parseInt(val) || 0;
                      handleInputChange(sectionKey, 'soLuongStHtTargetLntt', num);
                    }}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.soLuongStHtTargetLntt;
                      
                      const validStores = clusterMarkets?.filter(m => !m.isSummary && m.name !== 'TỔNG' && matchPrefix(m.name)) || [];
                      const completedLnttCount = validStores.filter(m => m.percentHT !== undefined && m.percentHT >= 100).length || 1;
                      
                      saveState({
                        ...state,
                        soLuongStHtTargetLntt: completedLnttCount,
                        overrides: newOverrides
                      });
                    }}
                    isOverridden={state.overrides.soLuongStHtTargetLntt !== undefined}
                  />
                </tr>

                {/* 5. Thưởng chuẩn */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    Thưởng chuẩn
                    <span className="block text-[9px] text-slate-400 font-medium mt-0.5">
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
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.thuongChuan;
                      saveState({
                        ...state,
                        overrides: newOverrides
                      });
                    }}
                    isOverridden={calc.isOverridden('thuongChuan')}
                  />
                </tr>

                {/* 6. Thưởng chuẩn Doanh thu */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-medium pl-6 text-slate-600 bg-white">
                    Thưởng chuẩn Doanh thu
                  </td>
                  <ExcelCell
                    value={calc.thuongChuanDt}
                    textColor="text-slate-800"
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongChuanDt', val)}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.thuongChuanDt;
                      saveState({ ...state, overrides: newOverrides });
                    }}
                    isOverridden={calc.isOverridden('thuongChuanDt')}
                  />
                </tr>

                {/* 7. Thưởng chuẩn LNTT */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-medium pl-6 text-slate-600 bg-white">
                    Thưởng chuẩn LNTT
                  </td>
                  <ExcelCell
                    value={calc.thuongChuanLntt}
                    textColor="text-slate-800"
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongChuanLntt', val)}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.thuongChuanLntt;
                      saveState({ ...state, overrides: newOverrides });
                    }}
                    isOverridden={calc.isOverridden('thuongChuanLntt')}
                  />
                </tr>

                {/* 8. %Tỷ lệ thưởng Doanh thu */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    %Tỷ lệ thưởng Doanh thu
                  </td>
                  <ExcelCell
                    value={`${calc.tyLeThuongDt.toFixed(1)}%`}
                    textColor="text-slate-800"
                    align="right"
                    isBold
                  />
                </tr>

                {/* 9. %Tỷ lệ thưởng LNTT */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-slate-50/50">
                    %Tỷ lệ thưởng LNTT
                  </td>
                  <ExcelCell
                    value={`${calc.tyLeThuongLntt.toFixed(1)}%`}
                    textColor="text-slate-800"
                    align="right"
                    isBold
                  />
                </tr>

                {/* 10. Thưởng Doanh thu */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-white">
                    Thưởng Doanh thu
                  </td>
                  <ExcelCell
                    value={calc.thuongDt}
                    textColor="text-slate-800"
                    isBold
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongDt', val)}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.thuongDt;
                      saveState({ ...state, overrides: newOverrides });
                    }}
                    isOverridden={calc.isOverridden('thuongDt')}
                  />
                </tr>

                {/* 11. Thưởng LNTT */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-white">
                    Thưởng LNTT
                  </td>
                  <ExcelCell
                    value={calc.thuongLntt}
                    textColor="text-slate-800"
                    isBold
                    onChange={(val) => handleOverrideChange(sectionKey, 'thuongLntt', val)}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.thuongLntt;
                      saveState({ ...state, overrides: newOverrides });
                    }}
                    isOverridden={calc.isOverridden('thuongLntt')}
                  />
                </tr>

                {/* 12. Thưởng quy mô LNTT */}
                <tr>
                  <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm font-semibold bg-white">
                    Thưởng quy mô LNTT
                    <span className="block text-[9px] text-slate-400 font-medium mt-0.5">
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
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.thuongQyMoLntt;
                      saveState({ ...state, overrides: newOverrides });
                    }}
                    isOverridden={calc.isOverridden('thuongQyMoLntt')}
                  />
                </tr>

                {/* 13. Quỹ thưởng Final */}
                <tr>
                  <td className="px-3 py-2 border border-slate-300 text-xs sm:text-sm font-black bg-slate-100">
                    Quỹ thưởng Final
                  </td>
                  <ExcelCell
                    value={calc.quyThuongFinal}
                    textColor="text-slate-900"
                    bgColor="bg-slate-100"
                    isBold
                    onChange={(val) => handleOverrideChange(sectionKey, 'quyThuongFinal', val)}
                    onResetOverride={() => {
                      const newOverrides = { ...state.overrides };
                      delete newOverrides.quyThuongFinal;
                      saveState({ ...state, overrides: newOverrides });
                    }}
                    isOverridden={calc.isOverridden('quyThuongFinal')}
                  />
                </tr>
              </tbody>
            </table>
            <div className="text-[11px] font-black italic text-slate-800 mt-2 px-1">
              *Nhập dữ liệu tại các ô màu xanh
            </div>
          </div>

          {/* RIGHT SIDE: Two tables */}
          <div className="lg:col-span-5 space-y-6">
            {/* Table 1: %HT Target lũy kế */}
            <div className="space-y-1">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-black text-slate-700">
                      <th colSpan={3} className="px-2 py-1.5 border border-slate-300 text-center uppercase tracking-tight">
                        %HT Target lũy kế
                      </th>
                    </tr>
                    <tr className="bg-slate-50 text-[11px] font-black text-slate-600 text-center">
                      <th className="px-2 py-1 border border-slate-300 w-1/3">Siêu thị</th>
                      <th className="px-2 py-1 border border-slate-300">Doanh thu</th>
                      <th className="px-2 py-1 border border-slate-300">Lợi Nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1.5 border border-slate-300 text-[11px] font-black text-slate-800 text-center">
                        %HT target cụm
                      </td>
                      <td className="p-0 border border-slate-300 bg-[#e2efda]">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full h-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-center font-bold text-xs sm:text-sm text-[#c00000] bg-[#e2efda] transition-colors"
                          value={`${state.htTargetCumDt.toFixed(1)}%`}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value.replace(/%/g, '')) || 0;
                            handleInputChange(sectionKey, 'htTargetCumDt', num);
                          }}
                          onFocus={(e) => { e.target.value = state.htTargetCumDt.toString(); }}
                          onBlur={(e) => { e.target.value = `${state.htTargetCumDt.toFixed(1)}%`; }}
                          placeholder="-"
                        />
                      </td>
                      <td className="p-0 border border-slate-300 bg-[#e2efda]">
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full h-full px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-center font-bold text-xs sm:text-sm text-[#c00000] bg-[#e2efda] transition-colors"
                          value={`${state.htTargetCumLn.toFixed(1)}%`}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value.replace(/%/g, '')) || 0;
                            handleInputChange(sectionKey, 'htTargetCumLn', num);
                          }}
                          onFocus={(e) => { e.target.value = state.htTargetCumLn.toString(); }}
                          onBlur={(e) => { e.target.value = `${state.htTargetCumLn.toFixed(1)}%`; }}
                          placeholder="-"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] font-semibold text-slate-500 italic text-right px-1">
                Tổng thực hiện / tổng target cụm lũy kế
              </div>
            </div>

            {/* K2 Reference Table */}
            <div className="space-y-1">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-[#dce6f1]">
                      <th colSpan={6} className="px-2 py-1.5 border border-slate-300 text-center font-black text-[11px] text-slate-700 uppercase tracking-tight">
                        K2 - Hệ số SL siêu thị trong cụm
                      </th>
                    </tr>
                    <tr className="bg-[#dce6f1] text-[10px] font-bold text-slate-600 text-center">
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
                      const currentRow = Math.min(Math.max(state.soLuongStTrongCum, 1), 5) - 1;
                      const currentCol = getK2ColIndex(state.tongDoanhThuCum);
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
              </div>
              <div className="text-[10px] font-semibold text-slate-500 italic text-right px-1">
                K1: {state.vungSieuThiBase} = {(calc.k1 * 100).toFixed(0)}% · K2 = {(calc.k2 * 100).toFixed(0)}%
              </div>
            </div>

            {/* Table 2: Department Allocation */}
            <div className="space-y-1">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-black text-slate-700 text-center">
                      <th className="px-3 py-1.5 border border-slate-300 w-1/2">Bộ phận</th>
                      <th className="px-3 py-1.5 border border-slate-300 w-1/4">Giờ công</th>
                      <th className="px-3 py-1.5 border border-slate-300">Thưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Calculate total hours across all departments for ratio-based allocation
                      const totalHours = state.departments.reduce((sum, r) => {
                        const h = parseFloat(r.gioCong);
                        return sum + (isNaN(h) ? 0 : h);
                      }, 0);

                      return state.departments.map((row, idx) => {
                        const hours = parseFloat(row.gioCong);
                        // Thưởng = (Giờ công / Tổng giờ công) × Quỹ thưởng Final
                        const finalReward = isNaN(hours) || totalHours === 0
                          ? '-'
                          : Math.round(calc.quyThuongFinal * (hours / totalHours));

                      return (
                        <tr key={idx}>
                          {/* Department Name (Editable) */}
                          <ExcelCell
                            value={row.boPhan}
                            align="left"
                            onChange={(val) => handleDeptChange(sectionKey, idx, 'boPhan', val)}
                          />
                          {/* Hours Input (Direct inline input - no ExcelCell to avoid focus loss) */}
                          <td className="p-0 border border-slate-300 bg-[#e2efda]">
                            <input
                              type="text"
                              inputMode="numeric"
                              className="w-full h-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-[#ffffcc] text-center font-bold text-xs sm:text-sm text-[#c00000] bg-[#e2efda] transition-colors"
                              value={row.gioCong}
                              onChange={(e) => handleDeptChange(sectionKey, idx, 'gioCong', e.target.value)}
                              placeholder="-"
                            />
                          </td>
                          {/* Allocated Reward (Read-only, calculated or can be overridden) */}
                          <td className="px-3 py-1.5 border border-slate-300 text-xs sm:text-sm text-right font-black text-slate-900 bg-white">
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
      </div>
    );
  };

  const selectedStoreCode = detectRegionCode(activeStore);

  return (
    <div className="space-y-8" ref={containerRef}>
      {/* Action Header card matching page style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm no-capture">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Info size={22} />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-800">
              BẢNG TÍNH THƯỞNG TARGET SIÊU THỊ ({activeStore.split(' - ')[0]})
            </h4>
            <p className="text-xs text-slate-400 font-medium">
              Chỉnh sửa các ô màu xanh hoặc click đúp vào các ô tính toán để ghi đè công thức.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* KHÔI PHỤC button hidden */}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            <Camera size={14} />
            <span>{isCapturing ? 'ĐANG CHỤP...' : 'CHỤP ẢNH BÁO CÁO'}</span>
          </button>
        </div>
      </div>

      {/* Main calculation forms */}
      <div className="space-y-8">
        {renderRewardSection('Thưởng Target QUẢN LÝ', qlState, qlCalc, 'QL')}
        {renderRewardSection('Thưởng Target TRƯỞNG CA', tcState, tcCalc, 'TC')}
      </div>
    </div>
  );
};
