import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  Calendar, 
  Camera, 
  Download, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Award, 
  TrendingUp, 
  Users, 
  ShoppingBag,
  Sparkles,
  Info,
  X,
  Layers,
  ArrowUpDown,
  AlertTriangle,
  BarChart3,
  Check,
  ChevronsUpDown,
  CheckSquare,
  Square
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { removeAccents, normalizeStoreId } from '../utils';

export interface BrandDailyStaffSalesTableProps {
  rawYcxRows: string[][];
  filteredRawYcxRows?: string[][];
  marketFilter?: string;
  activeStore?: string;
  onCapture?: () => void;
  selectedStaffs?: string[];
  drillFilterStaff?: string[];
}

interface SaleItemDetail {
  product: string;
  qty: number;
  revenue: number;
  dateStr: string;
  orderCode?: string;
}

interface StaffBrandSales {
  staffKey: string;
  staffId: string;
  staffName: string;
  dailyQty: Record<string, number>;
  dailyRev: Record<string, number>;
  dailyItems: Record<string, SaleItemDetail[]>;
  totalQty: number;
  totalRev: number;
}

interface DayColumn {
  dateKey: string;     // YYYY-MM-DD
  dayNum: number;      // 1..31
  displayDate: string; // DD/MM
  dayOfWeek?: string;  // T2, T3...
  isWeekend?: boolean;
}

// Brand standardizer
const standardizeBrand = (brandCell?: string, prodName?: string): string => {
  const b = (brandCell || '').toUpperCase().trim();
  const p = (prodName || '').toUpperCase().trim();

  // 1. Direct keywords
  if (b.includes('PANASONIC') || p.includes('PANASONIC')) return 'PANASONIC';
  if (b.includes('SAMSUNG') || p.includes('SAMSUNG')) return 'SAMSUNG';
  if (b.includes('APPLE') || p.includes('APPLE') || p.includes('IPHONE') || p.includes('IPAD') || p.includes('MACBOOK')) return 'APPLE';
  if (b.includes('DAIKIN') || p.includes('DAIKIN')) return 'DAIKIN';
  if (b.includes('CASPER') || p.includes('CASPER')) return 'CASPER';
  if (b.includes('SONY') || p.includes('SONY')) return 'SONY';
  if (b.includes('AQUA') || p.includes('AQUA')) return 'AQUA';
  if (b.includes('TOSHIBA') || p.includes('TOSHIBA')) return 'TOSHIBA';
  if (b.includes('SHARP') || p.includes('SHARP')) return 'SHARP';
  if (b === 'LG' || b.includes(' LG ') || b.startsWith('LG ') || b.endsWith(' LG') || p.startsWith('LG ') || p.includes(' LG ')) return 'LG';
  if (b.includes('TCL') || p.includes('TCL')) return 'TCL';
  if (b.includes('XIAOMI') || p.includes('XIAOMI') || p.includes('REDMI')) return 'XIAOMI';
  if (b.includes('OPPO') || p.includes('OPPO')) return 'OPPO';
  if (b.includes('VIVO') || p.includes('VIVO')) return 'VIVO';
  if (b.includes('REALME') || p.includes('REALME')) return 'REALME';
  if (b.includes('SUNHOUSE') || p.includes('SUNHOUSE')) return 'SUNHOUSE';
  if (b.includes('KANGAROO') || p.includes('KANGAROO')) return 'KANGAROO';
  if (b.includes('SANAKY') || p.includes('SANAKY')) return 'SANAKY';
  if (b.includes('ELECTROLUX') || p.includes('ELECTROLUX')) return 'ELECTROLUX';
  if (b.includes('PHILIPS') || p.includes('PHILIPS')) return 'PHILIPS';
  if (b.includes('TEFAL') || p.includes('TEFAL')) return 'TEFAL';
  if (b.includes('COMFEE') || p.includes('COMFEE')) return 'COMFEE';
  if (b.includes('NAGAKAWA') || p.includes('NAGAKAWA')) return 'NAGAKAWA';
  if (b.includes('FUNIKI') || p.includes('FUNIKI')) return 'FUNIKI';
  if (b.includes('HAIER') || p.includes('HAIER')) return 'HAIER';
  if (b.includes('BEKO') || p.includes('BEKO')) return 'BEKO';
  if (b.includes('MIDEA') || p.includes('MIDEA')) return 'MIDEA';
  if (b.includes('HISENSE') || p.includes('HISENSE')) return 'HISENSE';
  if (b.includes('COOCAA') || p.includes('COOCAA')) return 'COOCAA';
  if (b.includes('CARRIER') || p.includes('CARRIER')) return 'CARRIER';
  if (b.includes('GREE') || p.includes('GREE')) return 'GREE';
  if (b.includes('HITACHI') || p.includes('HITACHI')) return 'HITACHI';
  if (b.includes('MITSUBISHI') || p.includes('MITSUBISHI')) return 'MITSUBISHI';
  if (b.includes('ASANZO') || p.includes('ASANZO')) return 'ASANZO';
  if (b.includes('HONOR') || p.includes('HONOR')) return 'HONOR';
  if (b.includes('DELL') || p.includes('DELL')) return 'DELL';
  if (b.includes('ASUS') || p.includes('ASUS')) return 'ASUS';
  if (b.includes('HP') || p.includes('HP ')) return 'HP';
  if (b.includes('LENOVO') || p.includes('LENOVO')) return 'LENOVO';
  if (b.includes('ACER') || p.includes('ACER')) return 'ACER';

  // 2. If clean brand string in cell
  if (b && b !== 'KHÁC' && b !== 'KHONG RO' && b !== 'NULL' && b !== 'UNDEFINED') {
    return b.replace(/^(CONG TY|CTY|TNHH|CP)\s+/i, '').trim();
  }

  return 'KHÁC';
};

// Safe date parser
const parseRowDateSafe = (rawVal: string): { dateKey: string; dayNum: number; displayDate: string; fullDate: Date } | null => {
  if (!rawVal) return null;
  const str = String(rawVal).trim();
  if (!str) return null;

  let d: Date | null = null;
  const num = parseFloat(str);
  if (!isNaN(num) && /^\d+(\.\d+)?$/.test(str) && num > 40000 && num < 60000) {
    d = new Date((Math.floor(num) - 25569) * 86400000);
  } else {
    // dd/MM/yyyy or d/M/yyyy
    const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m1) {
      d = new Date(+m1[3], +m1[2] - 1, +m1[1]);
    } else {
      // yyyy-MM-dd
      const m2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (m2) {
        d = new Date(+m2[1], +m2[2] - 1, +m2[3]);
      } else {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) d = parsed;
      }
    }
  }

  if (!d || isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    dateKey: `${y}-${pad(m)}-${pad(day)}`,
    dayNum: day,
    displayDate: `${pad(day)}/${pad(m)}`,
    fullDate: d,
  };
};

const extractName = (raw: string): string => {
  if (!raw) return raw;
  const match = raw.match(/^\s*\d+\s*[-–]\s*(.+)$/);
  return match ? match[1].trim() : raw.trim();
};

export const BrandDailyStaffSalesTable: React.FC<BrandDailyStaffSalesTableProps> = ({
  rawYcxRows,
  filteredRawYcxRows,
  activeStore = '',
  onCapture,
  selectedStaffs = [],
  drillFilterStaff = []
}) => {
  // Store-specific settings key
  const storeKey = useMemo(() => {
    if (!activeStore) return 'default';
    return normalizeStoreId(activeStore) || activeStore;
  }, [activeStore]);

  // Selected brands state (Multi-select)
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [hasLoadedSavedConfig, setHasLoadedSavedConfig] = useState(false);

  // Expanded state for each brand row
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const [viewMetric, setViewMetric] = useState<'qty' | 'revenue'>('qty');
  const [showOnlyWithSales, setShowOnlyWithSales] = useState(false);
  const [showAllDaysInMonth, setShowAllDaysInMonth] = useState(true);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [showBrandFilterModal, setShowBrandFilterModal] = useState(false);
  const brandDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedDetailCell, setSelectedDetailCell] = useState<{
    staffName: string;
    brandName: string;
    dateDisplay: string;
    items: SaleItemDetail[];
    totalQty: number;
    totalRev: number;
  } | null>(null);

  // Close brand dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(e.target as Node)) {
        setShowBrandFilterModal(false);
      }
    };
    if (showBrandFilterModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBrandFilterModal]);

  // Parse header and indices
  const indices = useMemo(() => {
    if (!rawYcxRows || rawYcxRows.length === 0) return null;
    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const norm = headers.map(h => removeAccents(h).toLowerCase().trim());

    const findIdx = (keywords: string[], defaultIdx = -1) => {
      for (const kw of keywords) {
        const exact = norm.findIndex(h => h === kw);
        if (exact !== -1) return exact;
      }
      for (const kw of keywords) {
        const partial = norm.findIndex(h => h.includes(kw));
        if (partial !== -1) return partial;
      }
      return defaultIdx;
    };

    const idxStaff = (() => {
      const priorityList = [
        'nguoi tao', 'user tao', 'ten nguoi tao', 'ma/ten nguoi tao',
        'ten nhan vien ban hang', 'nhan vien ban hang', 'user ban hang', 'nv ban hang',
        'ten nhan vien', 'ten nv', 'nhan vien', 'nguoi ban', 'nguoi lap', 'user lap', 'nv tao'
      ];
      for (const kw of priorityList) {
        const exact = norm.findIndex(h => h === kw && !h.includes('giao'));
        if (exact !== -1) return exact;
      }
      for (const kw of priorityList) {
        const partial = norm.findIndex(h => h.includes(kw) && !h.includes('giao'));
        if (partial !== -1) return partial;
      }
      return 4;
    })();

    const idxDate = findIdx(['ngay tao', 'ngay lap', 'ngay xuat', 'ngay giao', 'ngay hoan', 'ngay', 'thoi gian tao', 'thoi gian', 'date'], -1);
    const idxBrand = findIdx(['nha san xuat', 'hang san xuat', 'hang sx', 'nha sx', 'brand', 'nsx', 'hang', 'thuong hieu'], -1);
    const idxProduct = findIdx(['ten san pham', 'ten hang', 'san pham'], -1);
    const idxQty = findIdx(['so luong xuat', 'so luong ban', 'so luong', 'sl xuat', 'sl ban', 'sl'], -1);
    
    const idxRevenue = (() => {
      const exactAK = norm.findIndex(h => h === 'gia ban' || h === 'giaban' || h === 'gia ban_1' || h === 'gia ban 1');
      if (exactAK !== -1) return exactAK;
      for (const term of ['doanh thu (-r)', 'doanh thu', 'thanh tien', 'gia ban', 'phai thu']) {
        const idx = norm.findIndex(h => h.includes(term));
        if (idx !== -1) return idx;
      }
      return 36;
    })();

    const idxOrder = findIdx(['so ycx', 'so phieu', 'ma ycx', 'ma don', 'ma phieu', 'so'], -1);

    return { idxStaff, idxDate, idxBrand, idxProduct, idxQty, idxRevenue, idxOrder };
  }, [rawYcxRows]);

  // Rows to process
  const sourceRows = useMemo(() => {
    if (filteredRawYcxRows && filteredRawYcxRows.length > 0) return filteredRawYcxRows;
    if (rawYcxRows && rawYcxRows.length > 1) return rawYcxRows.slice(1);
    return [];
  }, [filteredRawYcxRows, rawYcxRows]);

  // Aggregate ALL brands and staff
  const parsedData = useMemo(() => {
    if (!indices || sourceRows.length === 0) {
      return {
        brandList: [] as { brand: string; totalQty: number; totalRev: number; staffCount: number }[],
        brandSalesMap: new Map<string, Map<string, StaffBrandSales>>(),
        allDateKeysMap: new Map<string, DayColumn>(),
        minDate: null as Date | null,
        maxDate: null as Date | null,
      };
    }

    const { idxStaff, idxDate, idxBrand, idxProduct, idxQty, idxRevenue, idxOrder } = indices;

    const brandStats = new Map<string, { totalQty: number; totalRev: number; staffKeys: Set<string> }>();
    const brandSalesMap = new Map<string, Map<string, StaffBrandSales>>();
    const allDateKeysMap = new Map<string, DayColumn>();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const isSystemName = (n: string) =>
      !n || n.toLowerCase().includes('người tạo') || n.toLowerCase() === 'admin' || n.toLowerCase() === 'administrator';

    for (const row of sourceRows) {
      // 1. Staff info
      const rawStaff = idxStaff !== -1 ? String(row[idxStaff] || '').trim() : '';
      if (!rawStaff) continue;
      const staffName = extractName(rawStaff);
      if (isSystemName(staffName)) continue;

      const staffMatch = rawStaff.match(/^\s*(\d+)/);
      const staffId = staffMatch ? staffMatch[1].trim() : '';
      const staffKey = staffName;

      // 2. Product & Brand info
      const rawProdName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() : '';
      const rawBrandVal = idxBrand !== -1 ? String(row[idxBrand] || '').trim() : '';
      const brand = standardizeBrand(rawBrandVal, rawProdName);

      // 3. Qty & Revenue
      const rawQty = idxQty !== -1 ? Math.round(parseFloat(String(row[idxQty] || '1').replace(/,/g, '')) || 0) : 1;
      const qty = rawQty > 0 ? rawQty : 1;
      const rawRev = idxRevenue !== -1 ? parseFloat(String(row[idxRevenue] || '0').replace(/,/g, '')) || 0 : 0;
      const rev = rawRev >= 0 ? rawRev : 0;

      // 4. Date info: robust extraction with fallbacks
      let parsedDate: { dateKey: string; dayNum: number; displayDate: string; fullDate: Date } | null = null;

      if (idxDate !== -1 && row[idxDate]) {
        parsedDate = parseRowDateSafe(String(row[idxDate]).trim());
      }

      // Fallback: scan row for date if idxDate failed
      if (!parsedDate) {
        for (let c = 0; c < Math.min(row.length, 30); c++) {
          const val = String(row[c] || '').trim();
          if (!val) continue;
          if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(val) || /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(val) || (/^\d{5}(\.\d+)?$/.test(val) && parseFloat(val) > 40000 && parseFloat(val) < 60000)) {
            parsedDate = parseRowDateSafe(val);
            if (parsedDate) break;
          }
        }
      }

      // Ultimate fallback date if missing
      if (!parsedDate) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const day = now.getDate();
        const pad = (n: number) => String(n).padStart(2, '0');
        parsedDate = {
          dateKey: `${y}-${pad(m)}-${pad(day)}`,
          dayNum: day,
          displayDate: `${pad(day)}/${pad(m)}`,
          fullDate: now
        };
      }

      const { dateKey, dayNum, displayDate, fullDate } = parsedDate;

      if (!minDate || fullDate.getTime() < minDate.getTime()) minDate = fullDate;
      if (!maxDate || fullDate.getTime() > maxDate.getTime()) maxDate = fullDate;

      if (!allDateKeysMap.has(dateKey)) {
        const dayOfWeekIndex = fullDate.getDay();
        const dowNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        allDateKeysMap.set(dateKey, {
          dateKey,
          dayNum,
          displayDate,
          dayOfWeek: dowNames[dayOfWeekIndex],
          isWeekend: dayOfWeekIndex === 0 || dayOfWeekIndex === 6,
        });
      }

      // 5. Update brand totals
      if (!brandStats.has(brand)) {
        brandStats.set(brand, { totalQty: 0, totalRev: 0, staffKeys: new Set<string>() });
      }
      const bStat = brandStats.get(brand)!;
      bStat.totalQty += qty;
      bStat.totalRev += rev;
      bStat.staffKeys.add(staffKey);

      // 6. Update staff matrix for this brand
      if (!brandSalesMap.has(brand)) {
        brandSalesMap.set(brand, new Map<string, StaffBrandSales>());
      }
      const staffMapForBrand = brandSalesMap.get(brand)!;
      if (!staffMapForBrand.has(staffKey)) {
        staffMapForBrand.set(staffKey, {
          staffKey,
          staffId,
          staffName,
          dailyQty: {},
          dailyRev: {},
          dailyItems: {},
          totalQty: 0,
          totalRev: 0,
        });
      }
      const staffRec = staffMapForBrand.get(staffKey)!;
      staffRec.dailyQty[dateKey] = (staffRec.dailyQty[dateKey] || 0) + qty;
      staffRec.dailyRev[dateKey] = (staffRec.dailyRev[dateKey] || 0) + rev;
      staffRec.totalQty += qty;
      staffRec.totalRev += rev;

      if (!staffRec.dailyItems[dateKey]) {
        staffRec.dailyItems[dateKey] = [];
      }
      staffRec.dailyItems[dateKey].push({
        product: rawProdName || 'Sản phẩm khác',
        qty,
        revenue: rev,
        dateStr: displayDate,
        orderCode: idxOrder !== -1 ? String(row[idxOrder] || '').trim() : undefined,
      });
    }

    const brandList = Array.from(brandStats.entries())
      .map(([brand, stat]) => ({ 
        brand, 
        totalQty: stat.totalQty, 
        totalRev: stat.totalRev,
        staffCount: stat.staffKeys.size
      }))
      .sort((a, b) => b.totalQty - a.totalQty || a.brand.localeCompare(b.brand));

    return {
      brandList,
      brandSalesMap,
      allDateKeysMap,
      minDate,
      maxDate,
    };
  }, [indices, sourceRows]);

  // Load / Restore store-specific saved brands configuration
  useEffect(() => {
    if (!parsedData.brandList || parsedData.brandList.length === 0) return;

    const storageKey = `brandDailyStaffSales_selectedBrands_${storeKey}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Keep only brands that exist in current dataset
          const valid = parsed.filter(b => parsedData.brandList.some(item => item.brand === b));
          if (valid.length > 0) {
            setSelectedBrands(valid);
            setHasLoadedSavedConfig(true);
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read saved brand filter from localStorage', e);
    }

    // Default if no saved config: select all brands
    setSelectedBrands(parsedData.brandList.map(b => b.brand));
    setHasLoadedSavedConfig(true);
  }, [storeKey, parsedData.brandList]);

  // Helper to update selected brands and save to store config
  const updateSelectedBrands = (newBrands: string[]) => {
    setSelectedBrands(newBrands);
    const storageKey = `brandDailyStaffSales_selectedBrands_${storeKey}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(newBrands));
    } catch (e) {
      console.warn('Could not save brand filter to localStorage', e);
    }
  };

  const toggleBrandSelection = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      updateSelectedBrands(selectedBrands.filter(b => b !== brand));
    } else {
      updateSelectedBrands([...selectedBrands, brand]);
    }
  };

  const selectAllBrands = () => {
    updateSelectedBrands(parsedData.brandList.map(b => b.brand));
  };

  const clearAllBrands = () => {
    updateSelectedBrands([]);
  };

  // Toggle expand / collapse for a single brand row
  const toggleExpandBrand = (brand: string) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brand]: !prev[brand]
    }));
  };

  // Expand all / Collapse all toggle
  const allBrandsExpanded = useMemo(() => {
    if (selectedBrands.length === 0) return false;
    return selectedBrands.every(b => expandedBrands[b]);
  }, [selectedBrands, expandedBrands]);

  const toggleExpandAll = () => {
    const nextState = !allBrandsExpanded;
    const updated: Record<string, boolean> = {};
    selectedBrands.forEach(b => {
      updated[b] = nextState;
    });
    setExpandedBrands(updated);
  };

  // Generate day columns
  const dayColumns: DayColumn[] = useMemo(() => {
    if (!parsedData.minDate || !parsedData.maxDate) {
      return Array.from(parsedData.allDateKeysMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }

    const minD = parsedData.minDate;
    const maxD = parsedData.maxDate;

    const sameMonth = minD.getFullYear() === maxD.getFullYear() && minD.getMonth() === maxD.getMonth();

    if (sameMonth && showAllDaysInMonth) {
      const year = minD.getFullYear();
      const month = minD.getMonth() + 1;
      const pad = (n: number) => String(n).padStart(2, '0');
      const maxDay = maxD.getDate();

      const cols: DayColumn[] = [];
      const dowNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

      for (let day = 1; day <= maxDay; day++) {
        const d = new Date(year, month - 1, day);
        const dateKey = `${year}-${pad(month)}-${pad(day)}`;
        const dowIdx = d.getDay();
        cols.push({
          dateKey,
          dayNum: day,
          displayDate: `${pad(day)}/${pad(month)}`,
          dayOfWeek: dowNames[dowIdx],
          isWeekend: dowIdx === 0 || dowIdx === 6,
        });
      }
      return cols;
    }

    return Array.from(parsedData.allDateKeysMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [parsedData.minDate, parsedData.maxDate, parsedData.allDateKeysMap, showAllDaysInMonth]);

  // Compute displayed brands and their staff rows
  const displayedBrandsData = useMemo(() => {
    // Filter by selected brands in checklist
    let activeBrandList = parsedData.brandList.filter(b => selectedBrands.includes(b.brand));

    // If search text entered in top bar, filter activeBrandList by query as well
    if (brandSearchQuery.trim()) {
      const q = removeAccents(brandSearchQuery.trim().toLowerCase());
      const queryMatches = activeBrandList.filter(b => removeAccents(b.brand.toLowerCase()).includes(q));
      if (queryMatches.length > 0) {
        activeBrandList = queryMatches;
      } else {
        const allMatches = parsedData.brandList.filter(b => removeAccents(b.brand.toLowerCase()).includes(q));
        if (allMatches.length > 0) {
          activeBrandList = allMatches;
        }
      }
    }

    const brandRows = activeBrandList.map(b => {
      const staffMap = parsedData.brandSalesMap.get(b.brand) || new Map<string, StaffBrandSales>();
      const dailyQty: Record<string, number> = {};
      const dailyRev: Record<string, number> = {};
      
      let staffList: StaffBrandSales[] = Array.from(staffMap.values());

      // Filter staff by parent filter if any
      if (selectedStaffs.length > 0) {
        staffList = staffList.filter(s => selectedStaffs.some(sel => s.staffName.toLowerCase().includes(sel.toLowerCase())));
      }
      if (drillFilterStaff.length > 0) {
        staffList = staffList.filter(s => drillFilterStaff.includes(s.staffName));
      }

      // Filter staff with sales
      if (showOnlyWithSales) {
        staffList = staffList.filter(s => s.totalQty > 0);
      }

      // Sort staff in brand descending
      staffList.sort((s1, s2) => s2.totalQty - s1.totalQty || s2.totalRev - s1.totalRev || s1.staffName.localeCompare(s2.staffName));

      staffList.forEach(staff => {
        Object.entries(staff.dailyQty).forEach(([dk, q]) => {
          dailyQty[dk] = (dailyQty[dk] || 0) + q;
        });
        Object.entries(staff.dailyRev).forEach(([dk, r]) => {
          dailyRev[dk] = (dailyRev[dk] || 0) + r;
        });
      });

      return {
        brandName: b.brand,
        dailyQty,
        dailyRev,
        totalQty: b.totalQty,
        totalRev: b.totalRev,
        staffCount: staffList.length,
        staffList,
      };
    });

    // Store total row across all displayed brands
    const storeDailyQty: Record<string, number> = {};
    const storeDailyRev: Record<string, number> = {};
    let grandTotalQty = 0;
    let grandTotalRev = 0;

    brandRows.forEach(r => {
      grandTotalQty += r.totalQty;
      grandTotalRev += r.totalRev;
      Object.entries(r.dailyQty).forEach(([dk, q]) => {
        storeDailyQty[dk] = (storeDailyQty[dk] || 0) + q;
      });
      Object.entries(r.dailyRev).forEach(([dk, rev]) => {
        storeDailyRev[dk] = (storeDailyRev[dk] || 0) + rev;
      });
    });

    return {
      brandRows,
      storeDailyQty,
      storeDailyRev,
      grandTotalQty,
      grandTotalRev,
    };
  }, [
    parsedData,
    selectedBrands,
    brandSearchQuery,
    selectedStaffs,
    drillFilterStaff,
    showOnlyWithSales
  ]);

  // Export Excel
  const handleExportExcel = () => {
    try {
      const aoa: (string | number)[][] = [];
      const title = `BẢNG THEO DÕI BÁN HÀNG THEO HÃNG THEO NGÀY (${activeStore || 'SIÊU THỊ'})`;

      aoa.push([title]);
      aoa.push([`Các hãng được chọn: ${selectedBrands.join(', ')}`]);
      aoa.push([]);

      // Header row
      const headerRow = ['STT', 'HÃNG SẢN XUẤT / NHÂN VIÊN', 'MÃ NV'];
      dayColumns.forEach(c => headerRow.push(c.displayDate));
      headerRow.push(viewMetric === 'qty' ? 'TỔNG SL' : 'TỔNG DOANH THU');
      headerRow.push('% TỔNG');
      aoa.push(headerRow);

      // Data Rows
      let rankCounter = 1;
      displayedBrandsData.brandRows.forEach(b => {
        // Brand Row
        const brandRowData: (string | number)[] = [rankCounter++, `HÃNG ${b.brandName}`, ''];
        dayColumns.forEach(c => {
          const val = viewMetric === 'qty' ? (b.dailyQty[c.dateKey] || 0) : (b.dailyRev[c.dateKey] || 0);
          brandRowData.push(val);
        });
        const bTotal = viewMetric === 'qty' ? b.totalQty : b.totalRev;
        brandRowData.push(bTotal);
        const grand = viewMetric === 'qty' ? displayedBrandsData.grandTotalQty : displayedBrandsData.grandTotalRev;
        brandRowData.push(grand > 0 ? `${((bTotal / grand) * 100).toFixed(1)}%` : '0%');
        aoa.push(brandRowData);

        // Staff sub-rows
        b.staffList.forEach((s, sIdx) => {
          const staffRowData: (string | number)[] = [`${rankCounter - 1}.${sIdx + 1}`, `  ${s.staffName}`, s.staffId || ''];
          dayColumns.forEach(c => {
            const val = viewMetric === 'qty' ? (s.dailyQty[c.dateKey] || 0) : (s.dailyRev[c.dateKey] || 0);
            staffRowData.push(val);
          });
          const sTotal = viewMetric === 'qty' ? s.totalQty : s.totalRev;
          staffRowData.push(sTotal);
          staffRowData.push(bTotal > 0 ? `${((sTotal / bTotal) * 100).toFixed(1)}%` : '0%');
          aoa.push(staffRowData);
        });
      });

      // Total store row
      const storeRow: (string | number)[] = ['-', 'TỔNG CỘNG', ''];
      dayColumns.forEach(c => {
        const val = viewMetric === 'qty'
          ? (displayedBrandsData.storeDailyQty[c.dateKey] || 0)
          : (displayedBrandsData.storeDailyRev[c.dateKey] || 0);
        storeRow.push(val);
      });
      storeRow.push(viewMetric === 'qty' ? displayedBrandsData.grandTotalQty : displayedBrandsData.grandTotalRev);
      storeRow.push('100%');
      aoa.push(storeRow);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TheoDoi_Hang_Ngay');
      const filename = `TheoDoi_Hang_TheoNgay_${storeKey}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Error exporting Excel:', err);
    }
  };

  if (!rawYcxRows || rawYcxRows.length <= 1) {
    return null;
  }

  // Render rank medal or number with proper spacing to prevent text overlapping
  const renderRank = (idx: number, qty: number) => {
    if (qty === 0) {
      return (
        <span className="inline-flex items-center justify-center min-w-[26px] mr-1 text-[13px] text-amber-500 font-bold shrink-0" title="Chưa bán">
          ⚠️
        </span>
      );
    }
    if (idx === 0) return <span className="inline-flex items-center justify-center min-w-[26px] mr-1 text-[15px] shrink-0" title="Hạng 1">🥇</span>;
    if (idx === 1) return <span className="inline-flex items-center justify-center min-w-[26px] mr-1 text-[15px] shrink-0" title="Hạng 2">🥈</span>;
    if (idx === 2) return <span className="inline-flex items-center justify-center min-w-[26px] mr-1 text-[15px] shrink-0" title="Hạng 3">🥉</span>;
    return (
      <span className="inline-flex items-center justify-center min-w-[26px] mr-1 text-[11px] font-black text-slate-500 shrink-0">
        #{idx + 1}
      </span>
    );
  };

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6 mb-8"
      id="brand-daily-staff-sales-container"
    >
      {/* Header - EXACT SAME STYLE AS HÌNH 1 (PHÂN TÍCH KHAI THÁC) */}
      <div className="px-4 sm:px-6 pt-5 pb-4 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 font-bold border border-red-100">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[16px] sm:text-[18px] font-black text-red-600 tracking-tight uppercase">
                  THEO DÕI BÁN HÀNG THEO HÃNG THEO NGÀY
                </h3>
                {activeStore && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 uppercase">
                    {activeStore}
                  </span>
                )}
              </div>
              <p className="text-[10.5px] sm:text-[11px] text-slate-400 mt-0.5">
                Bấm vào nút mũi tên (▶) trên từng dòng Hãng để xổ danh sách nhân viên bán trong kỳ (Lưu cấu hình theo siêu thị)
              </p>
            </div>
          </div>

          {/* Action buttons matching Hình 1 */}
          <div className="flex items-center gap-2 self-end sm:self-auto no-capture">
            <button
              onClick={handleExportExcel}
              className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
              title="Xuất bảng này ra file Excel (.xlsx)"
            >
              <Download size={13} className="text-slate-500 hover:text-emerald-600" />
              <span>Xuất Excel</span>
            </button>

            {onCapture && (
              <button
                onClick={onCapture}
                className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
                title="Chụp ảnh bảng này"
              >
                <Camera size={13} className="text-slate-500 hover:text-indigo-600" />
                <span>Chụp ảnh</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar - EXACT SAME STYLE AS HÌNH & USER SCREENSHOT */}
        <div className="flex flex-col gap-2.5 bg-slate-50/90 rounded-2xl p-3 sm:px-5 sm:py-3.5 border border-slate-200/70 no-capture">
          {/* Top Row: Brand Search & Multi-select Filter Bar */}
          <div className="w-full flex justify-center pb-0.5">
            <div className="relative w-full max-w-md sm:max-w-lg" ref={brandDropdownRef}>
              <div className="relative flex items-center">
                <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={brandSearchQuery}
                  onChange={(e) => {
                    setBrandSearchQuery(e.target.value);
                    setShowBrandFilterModal(true);
                  }}
                  onFocus={() => setShowBrandFilterModal(true)}
                  placeholder={
                    selectedBrands.length === parsedData.brandList.length
                      ? '🔍 Tìm kiếm hãng (Đang chọn tất cả)...'
                      : `🔍 Tìm kiếm hãng (Đã chọn ${selectedBrands.length}/${parsedData.brandList.length} hãng)...`
                  }
                  className="w-full pl-9 pr-24 py-1.5 sm:py-2 text-[12px] sm:text-[13px] bg-white border-2 border-emerald-500 rounded-full shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-800 font-semibold placeholder:text-slate-400 placeholder:font-normal transition-all"
                />

                {/* Right controls inside search pill */}
                <div className="absolute right-2 flex items-center gap-1.5">
                  {brandSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBrandSearchQuery('')}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Xóa tìm kiếm"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowBrandFilterModal(!showBrandFilterModal)}
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#047857] border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs"
                    title="Mở danh sách chọn hãng"
                  >
                    <span>{selectedBrands.length}/{parsedData.brandList.length}</span>
                    <ChevronDown size={11} className={`transition-transform duration-200 ${showBrandFilterModal ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Multi-Select Brand Checklist Modal / Popover */}
              {showBrandFilterModal && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <CheckSquare size={13} className="text-[#047857]" />
                        BỘ LỌC HÃNG HIỂN THỊ
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {activeStore ? `Lưu tự động cho siêu thị: ${activeStore}` : 'Lưu cấu hình tự động'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowBrandFilterModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Select All / Deselect All actions */}
                  <div className="flex items-center justify-between gap-1.5 mb-2 pb-2 border-b border-slate-100 text-[10.5px]">
                    <button
                      onClick={selectAllBrands}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#047857] hover:bg-emerald-100 font-bold transition-colors"
                    >
                      Chọn tất cả ({parsedData.brandList.length})
                    </button>
                    <button
                      onClick={clearAllBrands}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold transition-colors"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>

                  {/* Checklist Items List */}
                  <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                    {parsedData.brandList
                      .filter(b => removeAccents(b.brand).includes(removeAccents(brandSearchQuery)))
                      .map(b => {
                        const isChecked = selectedBrands.includes(b.brand);
                        return (
                          <div
                            key={b.brand}
                            onClick={() => toggleBrandSelection(b.brand)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors text-[11.5px] ${
                              isChecked 
                                ? 'bg-emerald-50/80 text-emerald-900 font-bold' 
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                isChecked 
                                  ? 'bg-[#047857] border-[#047857] text-white' 
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isChecked && <Check size={11} strokeWidth={3} />}
                              </span>
                              <span className="truncate">{b.brand}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateSelectedBrands([b.brand]);
                                }}
                                className="text-[9.5px] px-1.5 py-0.5 rounded bg-white hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium transition-colors"
                                title="Chỉ xem riêng hãng này"
                              >
                                Chỉ chọn
                              </button>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white border border-slate-200 text-slate-700 font-black">
                                {b.totalQty} sp
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-medium">
                                ({b.staffCount} NV)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    {parsedData.brandList.filter(b => removeAccents(b.brand).includes(removeAccents(brandSearchQuery))).length === 0 && (
                      <div className="py-4 text-center text-[11px] text-slate-400">
                        Không tìm thấy hãng nào khớp với "{brandSearchQuery}"
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-700 font-bold">
                      ✓ Đã lưu cấu hình tự động
                    </span>
                    <button
                      onClick={() => setShowBrandFilterModal(false)}
                      className="px-3.5 py-1 rounded-xl bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Sub-options matching user's screenshot */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200/60 pt-2">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Expand All / Collapse All Button */}
              <button
                onClick={toggleExpandAll}
                className="px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap flex items-center gap-1.5 bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shadow-2xs"
                title="Xổ hoặc đóng danh sách nhân viên của tất cả các hãng"
              >
                <ChevronsUpDown size={13} className="text-indigo-600" />
                <span>{allBrandsExpanded ? 'Thu gọn tất cả (▲)' : 'Xổ tất cả nhân viên (▼)'}</span>
              </button>

              {/* Metric Toggle */}
              <button
                onClick={() => setViewMetric('qty')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap ${
                  viewMetric === 'qty'
                    ? 'bg-[#ecfdf5] text-[#047857] border-emerald-300 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
                }`}
              >
                SL BÁN
              </button>
              <button
                onClick={() => setViewMetric('revenue')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap ${
                  viewMetric === 'revenue'
                    ? 'bg-[#ecfdf5] text-[#047857] border-emerald-300 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
                }`}
              >
                DOANH THU
              </button>

              {/* Show only active staff */}
              <button
                onClick={() => setShowOnlyWithSales(!showOnlyWithSales)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap ${
                  showOnlyWithSales
                    ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
                }`}
              >
                {showOnlyWithSales ? '✓ NV đã bán' : 'Hiện tất cả NV'}
              </button>

              {/* Show all days in month */}
              <button
                onClick={() => setShowAllDaysInMonth(!showAllDaysInMonth)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap ${
                  showAllDaysInMonth
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
                }`}
              >
                {showAllDaysInMonth ? 'Đủ ngày 1→N' : 'Chỉ ngày có đơn'}
              </button>
            </div>

            <div className="text-[10.5px] text-slate-400 font-medium">
              Đang hiển thị <strong className="text-[#047857]">{displayedBrandsData.brandRows.length}</strong> hãng • Tổng sản lượng: <strong className="text-red-600">{displayedBrandsData.grandTotalQty}</strong> sp
            </div>
          </div>
        </div>
      </div>

      {/* Main Table - EXACT SAME STYLE & COLORS AS HÌNH 1 */}
      <div className="overflow-x-auto relative">
        <table 
          className="w-full text-center border-collapse text-[12px]" 
          style={{ tableLayout: 'fixed', borderSpacing: 0 }}
        >
          <colgroup>
            <col style={{ width: '220px' }} />
            {dayColumns.map(c => (
              <col key={c.dateKey} style={{ width: '46px' }} />
            ))}
            <col style={{ width: viewMetric === 'qty' ? '70px' : '95px' }} />
            <col style={{ width: '65px' }} />
          </colgroup>

          <thead>
            {/* Group Header */}
            <tr className="border-b border-slate-200">
              <th 
                rowSpan={2} 
                className="py-2.5 px-4 text-left font-black text-slate-800 text-[12px] border-r border-slate-200/60 sticky left-0 z-20 bg-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>HÃNG SẢN XUẤT / NHÂN VIÊN</span>
                  <span className="text-slate-400 text-[11px]">⇅</span>
                </div>
              </th>

              <th 
                colSpan={dayColumns.length} 
                className="py-2 px-3 text-center bg-[#d1fae5] text-[#047857] font-black uppercase text-[12px] border-r border-slate-200/60 tracking-wider"
              >
                {selectedBrands.length === 1 
                  ? `HÃNG ${selectedBrands[0]} - SẢN LƯỢNG THEO NGÀY`
                  : `THEO DÕI ${selectedBrands.length} HÃNG ĐÃ CHỌN - SẢN LƯỢNG THEO NGÀY`}
              </th>

              <th 
                rowSpan={2} 
                className="py-2.5 px-3 text-center bg-[#bbf7d0] text-[#065f46] font-black uppercase text-[12px] border-r border-slate-200/60"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>TỔNG</span>
                  <span className="text-[11px]">⇅</span>
                </div>
              </th>

              <th 
                rowSpan={2} 
                className="py-2.5 px-2 text-center bg-slate-50 text-slate-600 font-bold uppercase text-[11px]"
              >
                % TỔNG
              </th>
            </tr>

            {/* Sub-header for days */}
            <tr className="border-b border-slate-200 bg-[#e6f4ea]/70">
              {dayColumns.map(c => (
                <th
                  key={c.dateKey}
                  className="py-1.5 px-1 border-r border-slate-200/60 text-center text-[#047857] font-bold text-[10.5px] truncate"
                  title={`${c.displayDate} (${c.dayOfWeek || ''})`}
                >
                  <div className="leading-tight">
                    <span>{c.dayNum < 10 ? `0${c.dayNum}` : c.dayNum}</span>
                    <span className="text-[9px] text-slate-400 ml-0.5">⇅</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {displayedBrandsData.brandRows.map((b, bIdx) => {
              const isExpanded = !!expandedBrands[b.brandName];
              const grand = viewMetric === 'qty' ? displayedBrandsData.grandTotalQty : displayedBrandsData.grandTotalRev;
              const rowVal = viewMetric === 'qty' ? b.totalQty : b.totalRev;
              const pct = grand > 0 ? ((rowVal / grand) * 100).toFixed(1) : '0';

              return (
                <React.Fragment key={b.brandName}>
                  {/* PARENT ROW: THE BRAND */}
                  <tr 
                    className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors bg-white cursor-pointer select-none group"
                    onClick={() => toggleExpandBrand(b.brandName)}
                  >
                    {/* Brand Name Column with Expand/Collapse button and rank */}
                    <td className="py-2.5 px-3 text-left font-black text-[13px] text-slate-900 border-r border-slate-200/50 sticky left-0 z-10 bg-white group-hover:bg-slate-50/80">
                      <div className="flex items-center gap-1.5">
                        {/* Expand/Collapse Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpandBrand(b.brandName);
                          }}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                            isExpanded ? 'bg-emerald-100 text-[#047857]' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-[#047857]'
                          }`}
                          title={isExpanded ? 'Thu gọn nhân viên' : 'Xổ danh sách nhân viên'}
                        >
                          <ChevronRight 
                            size={14} 
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        </button>

                        {/* Rank medal/number with clean width to prevent overlapping */}
                        {renderRank(bIdx, b.totalQty)}

                        {/* Brand Name */}
                        <span className="font-black text-[#047857] hover:underline truncate" title={b.brandName}>
                          {b.brandName}
                        </span>

                        {/* Staff count badge */}
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-bold shrink-0 ml-1">
                          {b.staffCount} NV
                        </span>
                      </div>
                    </td>

                    {/* Day Columns for Brand */}
                    {dayColumns.map(c => {
                      const qty = b.dailyQty[c.dateKey] || 0;
                      const rev = b.dailyRev[c.dateKey] || 0;
                      const val = viewMetric === 'qty' ? qty : rev;
                      const isEmpty = val <= 0;

                      return (
                        <td 
                          key={c.dateKey} 
                          className={`py-2 px-1 text-center border-r border-slate-200/50 text-[13px] ${
                            isEmpty ? 'bg-red-100/90 text-red-600 font-bold' : ''
                          }`}
                        >
                          {viewMetric === 'qty' ? (
                            qty > 0 ? (
                              <span className="font-black text-[#047857]">{qty}</span>
                            ) : (
                              <span className="text-red-500 font-bold">-</span>
                            )
                          ) : (
                            rev > 0 ? (
                              <span className="font-black text-[#1d4ed8]">{(rev / 1000000).toFixed(1)}</span>
                            ) : (
                              <span className="text-red-500 font-bold">-</span>
                            )
                          )}
                        </td>
                      );
                    })}

                    {/* Brand Total Column */}
                    <td className="py-2 px-3 text-center text-[13.5px] font-black text-[#047857] bg-emerald-50/40 border-r border-slate-200/50">
                      {rowVal > 0 ? (
                        viewMetric === 'qty' ? rowVal : `${(rowVal / 1000000).toFixed(1)} tr`
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* Brand % Contribution */}
                    <td className="py-2 px-2 text-center text-[11px] font-bold text-slate-500">
                      {rowVal > 0 ? `${pct}%` : '-'}
                    </td>
                  </tr>

                  {/* CHILD ROWS: EMPLOYEES OF THIS BRAND (WHEN EXPANDED) */}
                  {isExpanded && (
                    <>
                      {b.staffList.length > 0 ? (
                        b.staffList.map((staff, sIdx) => {
                          const sGrand = viewMetric === 'qty' ? b.totalQty : b.totalRev;
                          const sVal = viewMetric === 'qty' ? staff.totalQty : staff.totalRev;
                          const sPct = sGrand > 0 ? ((sVal / sGrand) * 100).toFixed(1) : '0';

                          return (
                            <tr 
                              key={`${b.brandName}_${staff.staffKey}`}
                              className="border-b border-slate-100 hover:bg-slate-100/70 transition-colors bg-slate-50/50"
                            >
                              {/* Staff Name with indent and tree icon */}
                              <td className="py-1.5 px-3 text-left border-r border-slate-200/40 sticky left-0 z-10 bg-slate-50/90 pl-8 sm:pl-10">
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <span className="text-slate-400 text-[11px] font-mono shrink-0">↳</span>
                                  <span className="text-slate-400 text-[12px] shrink-0">👤</span>
                                  <span className="truncate text-[12.5px] font-bold text-slate-700" title={staff.staffName}>
                                    {staff.staffName}
                                  </span>
                                  {staff.staffId && (
                                    <span className="text-[9px] text-slate-400 font-mono shrink-0 ml-1">
                                      #{staff.staffId}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Day Columns for Staff */}
                              {dayColumns.map(c => {
                                const qty = staff.dailyQty[c.dateKey] || 0;
                                const rev = staff.dailyRev[c.dateKey] || 0;
                                const items = staff.dailyItems[c.dateKey] || [];
                                const val = viewMetric === 'qty' ? qty : rev;
                                const isEmpty = val <= 0;

                                return (
                                  <td
                                    key={c.dateKey}
                                    onClick={() => {
                                      if (items.length > 0) {
                                        setSelectedDetailCell({
                                          staffName: staff.staffName,
                                          brandName: b.brandName,
                                          dateDisplay: `${c.displayDate} (${c.dayOfWeek || ''})`,
                                          items,
                                          totalQty: qty,
                                          totalRev: rev,
                                        });
                                      }
                                    }}
                                    className={`py-1.5 px-1 text-center border-r border-slate-200/30 text-[12px] ${
                                      isEmpty ? 'bg-red-50 text-red-500 font-bold' : ''
                                    } ${
                                      items.length > 0 ? 'cursor-pointer hover:bg-emerald-100/60 transition-colors' : ''
                                    }`}
                                    title={items.length > 0 ? `Nhấp xem chi tiết: ${staff.staffName} bán ${items.length} sp ngày ${c.displayDate}` : undefined}
                                  >
                                    {viewMetric === 'qty' ? (
                                      qty > 0 ? (
                                        <span className="font-bold text-[#047857]">{qty}</span>
                                      ) : (
                                        <span className="text-red-400 font-bold">-</span>
                                      )
                                    ) : (
                                      rev > 0 ? (
                                        <span className="font-bold text-[#1d4ed8]">{(rev / 1000000).toFixed(1)}</span>
                                      ) : (
                                        <span className="text-red-400 font-bold">-</span>
                                      )
                                    )}
                                  </td>
                                );
                              })}

                              {/* Staff Total Column */}
                              <td className="py-1.5 px-3 text-center text-[12.5px] font-bold text-[#047857] bg-emerald-50/20 border-r border-slate-200/40">
                                {sVal > 0 ? (
                                  viewMetric === 'qty' ? sVal : `${(sVal / 1000000).toFixed(1)} tr`
                                ) : (
                                  <span className="text-slate-300 font-normal">-</span>
                                )}
                              </td>

                              {/* Staff % in Brand */}
                              <td className="py-1.5 px-2 text-center text-[10px] font-medium text-slate-400">
                                {sVal > 0 ? `${sPct}%` : '-'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr className="border-b border-slate-100 bg-slate-50/40">
                          <td 
                            colSpan={dayColumns.length + 3} 
                            className="py-2.5 text-center text-slate-400 italic text-[11px]"
                          >
                            Chưa có nhân viên nào phát sinh đơn hàng cho hãng {b.brandName}.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {/* Empty state when no brands match */}
            {displayedBrandsData.brandRows.length === 0 && (
              <tr>
                <td 
                  colSpan={dayColumns.length + 3} 
                  className="py-12 text-center text-slate-400 italic text-[11px]"
                >
                  Không có hãng nào được chọn hoặc dữ liệu không tồn tại. Vui lòng mở lại "Bộ lọc hãng" ở trên.
                </td>
              </tr>
            )}
          </tbody>

          {/* Footer - TỔNG CỘNG (EXACT SAME STYLE AS HÌNH 1) */}
          <tfoot className="bg-[#e6f4ea] text-[#047857] font-black text-[13px] border-t-2 border-emerald-400">
            <tr>
              <td className="py-2.5 px-4 text-left uppercase font-black text-[13.5px] border-r border-emerald-300/60 sticky left-0 z-10 bg-[#e6f4ea]">
                TỔNG CỘNG
              </td>

              {dayColumns.map(c => {
                const dayQty = displayedBrandsData.storeDailyQty[c.dateKey] || 0;
                const dayRev = displayedBrandsData.storeDailyRev[c.dateKey] || 0;
                const val = viewMetric === 'qty' ? dayQty : dayRev;
                const isEmpty = val <= 0;

                return (
                  <td 
                    key={c.dateKey} 
                    className={`py-2.5 px-1 text-center font-black border-r border-emerald-300/60 ${
                      isEmpty ? 'bg-red-100 text-red-600' : ''
                    }`}
                  >
                    {val > 0 ? (
                      viewMetric === 'qty' ? val : `${Math.round(val / 1000000)}tr`
                    ) : (
                      <span className="text-red-600 font-bold">-</span>
                    )}
                  </td>
                );
              })}

              <td className="py-2.5 px-3 text-center font-black text-[14px] border-r border-emerald-300/60 bg-emerald-100/60">
                {viewMetric === 'qty' 
                  ? (displayedBrandsData.grandTotalQty > 0 ? displayedBrandsData.grandTotalQty : '-')
                  : (displayedBrandsData.grandTotalRev > 0 ? `${(displayedBrandsData.grandTotalRev / 1000000).toFixed(1)} tr` : '-')}
              </td>

              <td className="py-2.5 px-2 text-center font-black text-slate-600 text-[11px]">
                100%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Detail Popover Modal for clicked day cell */}
      {selectedDetailCell && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-capture"
          onClick={() => setSelectedDetailCell(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-black uppercase tracking-wide">
                  CHI TIẾT ĐƠN HÀNG HÃNG {selectedDetailCell.brandName}
                </h4>
                <p className="text-[10.5px] text-red-100 mt-0.5">
                  👤 <span className="font-bold text-white">{selectedDetailCell.staffName}</span> • 📅 {selectedDetailCell.dateDisplay}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailCell(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold pb-2 border-b border-slate-100 text-slate-600">
                <span>Tổng sản phẩm: <strong className="text-emerald-700">{selectedDetailCell.totalQty}</strong></span>
                {selectedDetailCell.totalRev > 0 && (
                  <span>Doanh thu: <strong className="text-[#1d4ed8]">{(selectedDetailCell.totalRev / 1000000).toFixed(2)} triệu</strong></span>
                )}
              </div>

              <div className="space-y-2">
                {selectedDetailCell.items.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11.5px] space-y-1">
                    <div className="font-bold text-slate-800 leading-tight">
                      {idx + 1}. {item.product}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Số lượng: <strong className="text-slate-900">{item.qty}</strong></span>
                      {item.revenue > 0 && (
                        <span>Giá bán: <strong className="text-slate-700">{item.revenue.toLocaleString('vi-VN')} đ</strong></span>
                      )}
                      {item.orderCode && (
                        <span>Đơn: <span className="font-mono">{item.orderCode}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedDetailCell(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BrandDailyStaffSalesTable;
