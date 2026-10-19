import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  Camera, 
  Download, 
  Filter, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  TrendingUp, 
  Users, 
  ShoppingBag,
  Sparkles,
  Info,
  X,
  Layers,
  ArrowUpDown,
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { removeAccents } from '../utils';

export interface BrandDailyStaffSalesTableProps {
  rawYcxRows: string[][];
  filteredRawYcxRows?: string[][];
  marketFilter?: string;
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
const standardizeBrand = (raw: string, prodName?: string): string => {
  let str = (raw || '').toUpperCase().trim();
  
  if (!str && prodName) {
    const p = prodName.toUpperCase();
    if (p.includes('PANASONIC')) return 'PANASONIC';
    if (p.includes('SAMSUNG')) return 'SAMSUNG';
    if (p.includes('APPLE') || p.includes('IPHONE') || p.includes('IPAD')) return 'APPLE';
    if (p.includes('DAIKIN')) return 'DAIKIN';
    if (p.includes('CASPER')) return 'CASPER';
    if (p.includes('SONY')) return 'SONY';
    if (p.includes('TOSHIBA')) return 'TOSHIBA';
    if (p.includes('SHARP')) return 'SHARP';
    if (p.includes('AQUA')) return 'AQUA';
    if (p.includes('LG')) return 'LG';
    if (p.includes('TCL')) return 'TCL';
    if (p.includes('XIAOMI')) return 'XIAOMI';
    if (p.includes('OPPO')) return 'OPPO';
    if (p.includes('VIVO')) return 'VIVO';
    if (p.includes('REALME')) return 'REALME';
    if (p.includes('SUNHOUSE')) return 'SUNHOUSE';
    if (p.includes('KANGAROO')) return 'KANGAROO';
    if (p.includes('SANAKY')) return 'SANAKY';
    if (p.includes('ELECTROLUX')) return 'ELECTROLUX';
    if (p.includes('PHILIPS')) return 'PHILIPS';
    if (p.includes('TEFAL')) return 'TEFAL';
    if (p.includes('COMFEE')) return 'COMFEE';
    if (p.includes('NAGAKAWA')) return 'NAGAKAWA';
    if (p.includes('FUNIKI')) return 'FUNIKI';
    if (p.includes('HAIER')) return 'HAIER';
    if (p.includes('BEKO')) return 'BEKO';
    if (p.includes('MIDEA')) return 'MIDEA';
    if (p.includes('HISENSE')) return 'HISENSE';
    if (p.includes('COOCAA')) return 'COOCAA';
    if (p.includes('CARRIER')) return 'CARRIER';
    if (p.includes('GREE')) return 'GREE';
    if (p.includes('HITACHI')) return 'HITACHI';
    if (p.includes('MITSUBISHI')) return 'MITSUBISHI';
  }

  // Canonicalize common brand names
  if (str.includes('PANASONIC')) return 'PANASONIC';
  if (str.includes('SAMSUNG')) return 'SAMSUNG';
  if (str.includes('APPLE') || str.includes('IPHONE')) return 'APPLE';
  if (str.includes('DAIKIN')) return 'DAIKIN';
  if (str.includes('CASPER')) return 'CASPER';
  if (str.includes('SONY')) return 'SONY';
  if (str.includes('TOSHIBA')) return 'TOSHIBA';
  if (str.includes('SHARP')) return 'SHARP';
  if (str.includes('AQUA')) return 'AQUA';
  if (str === 'LG' || str.includes(' LG ') || str.startsWith('LG ') || str.endsWith(' LG') || str.includes('LIFE\'S GOOD')) return 'LG';
  if (str.includes('TCL')) return 'TCL';
  if (str.includes('XIAOMI')) return 'XIAOMI';
  if (str.includes('OPPO')) return 'OPPO';
  if (str.includes('VIVO')) return 'VIVO';
  if (str.includes('REALME')) return 'REALME';
  if (str.includes('SUNHOUSE')) return 'SUNHOUSE';
  if (str.includes('KANGAROO')) return 'KANGAROO';
  if (str.includes('SANAKY')) return 'SANAKY';
  if (str.includes('ELECTROLUX')) return 'ELECTROLUX';
  if (str.includes('PHILIPS')) return 'PHILIPS';
  if (str.includes('TEFAL')) return 'TEFAL';
  if (str.includes('COMFEE')) return 'COMFEE';
  if (str.includes('NAGAKAWA')) return 'NAGAKAWA';
  if (str.includes('FUNIKI')) return 'FUNIKI';
  if (str.includes('HAIER')) return 'HAIER';
  if (str.includes('BEKO')) return 'BEKO';
  if (str.includes('MIDEA')) return 'MIDEA';
  if (str.includes('HISENSE')) return 'HISENSE';
  if (str.includes('COOCAA')) return 'COOCAA';
  if (str.includes('CARRIER')) return 'CARRIER';
  if (str.includes('GREE')) return 'GREE';
  if (str.includes('HITACHI')) return 'HITACHI';
  if (str.includes('MITSUBISHI')) return 'MITSUBISHI';

  return str || 'KHÁC';
};

// Safe date parser: avoids timezone offset issues & sequentially calling setDate/setMonth
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

export const BrandDailyStaffSalesTable: React.FC<BrandDailyStaffSalesTableProps> = ({
  rawYcxRows,
  filteredRawYcxRows,
  marketFilter,
  onCapture,
  selectedStaffs = [],
  drillFilterStaff = []
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>('PANASONIC');
  const [hasUserSelectedBrand, setHasUserSelectedBrand] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMetric, setViewMetric] = useState<'qty' | 'revenue'>('qty');
  const [showOnlyWithSales, setShowOnlyWithSales] = useState(false);
  const [showAllDaysInMonth, setShowAllDaysInMonth] = useState(true);
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [selectedDetailCell, setSelectedDetailCell] = useState<{
    staffName: string;
    dateDisplay: string;
    items: SaleItemDetail[];
    totalQty: number;
    totalRev: number;
  } | null>(null);

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

    // Staff index
    const idxStaff = (() => {
      const priorityList = [
        'ten nguoi tao', 'nguoi tao', 'ma/ten nguoi tao', 'user tao',
        'ten nhan vien ban hang', 'nhan vien ban hang', 'user ban hang', 'nv ban hang',
        'ten nhan vien', 'ten nv', 'nhan vien', 'nguoi ban', 'nguoi lap', 'user lap', 'nv tao'
      ];
      for (const kw of priorityList) {
        const exact = norm.findIndex(h => h === kw);
        if (exact !== -1) return exact;
      }
      for (const kw of priorityList) {
        const partial = norm.findIndex(h => h.includes(kw));
        if (partial !== -1) return partial;
      }
      return 4;
    })();

    const idxDate = findIdx(['ngay tao', 'ngay lap', 'ngay xuat', 'ngay giao', 'ngay hoan', 'ngay'], -1);
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
    const idxMarket = findIdx(['ma kho tao', 'ma kho', 'sieu thi', 'ten kho', 'dia diem', 'kho', 'cua hang'], -1);

    return { idxStaff, idxDate, idxBrand, idxProduct, idxQty, idxRevenue, idxOrder, idxMarket };
  }, [rawYcxRows]);

  // Rows to process: prioritize filteredRawYcxRows if provided, else rawYcxRows.slice(1)
  const sourceRows = useMemo(() => {
    if (filteredRawYcxRows && filteredRawYcxRows.length > 0) return filteredRawYcxRows;
    if (rawYcxRows && rawYcxRows.length > 1) return rawYcxRows.slice(1);
    return [];
  }, [filteredRawYcxRows, rawYcxRows]);

  // Aggregate ALL brands and ALL staff across the dataset
  const parsedData = useMemo(() => {
    if (!indices || sourceRows.length === 0) {
      return {
        brandList: [] as { brand: string; totalQty: number; totalRev: number }[],
        staffMasterList: [] as { staffKey: string; staffId: string; staffName: string }[],
        brandSalesMap: new Map<string, Map<string, StaffBrandSales>>(),
        allDateKeysMap: new Map<string, DayColumn>(),
        minDate: null as Date | null,
        maxDate: null as Date | null,
      };
    }

    const { idxStaff, idxDate, idxBrand, idxProduct, idxQty, idxRevenue, idxOrder, idxMarket } = indices;

    const brandStats = new Map<string, { totalQty: number; totalRev: number }>();
    const staffMasterMap = new Map<string, { staffKey: string; staffId: string; staffName: string }>();
    const brandSalesMap = new Map<string, Map<string, StaffBrandSales>>();
    const allDateKeysMap = new Map<string, DayColumn>();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    const isSystemName = (n: string) =>
      !n || n.toLowerCase().includes('người tạo') || n.toLowerCase() === 'admin' || n.toLowerCase() === 'administrator';

    for (const row of sourceRows) {
      // Optional market filter
      if (marketFilter && idxMarket !== -1) {
        const rowMarket = String(row[idxMarket] || '').trim();
        if (rowMarket && !rowMarket.includes(marketFilter)) continue;
      }

      // Staff info
      const rawStaff = idxStaff !== -1 ? String(row[idxStaff] || '').trim() : '';
      if (!rawStaff) continue;
      const staffMatch = rawStaff.match(/^\s*(\d+)\s*[-–]\s*(.+)$/);
      const staffId = staffMatch ? staffMatch[1].trim() : '';
      const staffName = staffMatch ? staffMatch[2].trim() : rawStaff;
      if (isSystemName(staffName)) continue;

      const staffKey = staffId ? `${staffId} - ${staffName}` : staffName;
      if (!staffMasterMap.has(staffKey)) {
        staffMasterMap.set(staffKey, { staffKey, staffId, staffName });
      }

      // Product & Brand info
      const rawProdName = idxProduct !== -1 ? String(row[idxProduct] || '').trim() : '';
      const rawBrandVal = idxBrand !== -1 ? String(row[idxBrand] || '').trim() : '';
      const brand = standardizeBrand(rawBrandVal, rawProdName);

      // Qty & Revenue
      const rawQty = idxQty !== -1 ? Math.round(parseFloat(String(row[idxQty] || '1').replace(/,/g, '')) || 0) : 1;
      const qty = rawQty > 0 ? rawQty : 1;
      const rawRev = idxRevenue !== -1 ? parseFloat(String(row[idxRevenue] || '0').replace(/,/g, '')) || 0 : 0;
      const rev = rawRev >= 0 ? rawRev : 0;

      // Date info
      const rawDate = idxDate !== -1 ? String(row[idxDate] || '').trim() : '';
      const parsedDate = parseRowDateSafe(rawDate);
      if (!parsedDate) continue;

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

      // Update brand general totals
      if (!brandStats.has(brand)) {
        brandStats.set(brand, { totalQty: 0, totalRev: 0 });
      }
      const bStat = brandStats.get(brand)!;
      bStat.totalQty += qty;
      bStat.totalRev += rev;

      // Update brand-specific staff matrix
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
      .map(([brand, stat]) => ({ brand, totalQty: stat.totalQty, totalRev: stat.totalRev }))
      .sort((a, b) => b.totalQty - a.totalQty || a.brand.localeCompare(b.brand));

    const staffMasterList = Array.from(staffMasterMap.values())
      .sort((a, b) => a.staffName.localeCompare(b.staffName));

    return {
      brandList,
      staffMasterList,
      brandSalesMap,
      allDateKeysMap,
      minDate,
      maxDate,
    };
  }, [indices, sourceRows, marketFilter]);

  // Auto-select brand if user hasn't explicitly clicked a brand
  useMemo(() => {
    if (hasUserSelectedBrand) return;
    if (parsedData.brandList.length === 0) return;
    const hasPana = parsedData.brandList.some(b => b.brand === 'PANASONIC');
    if (hasPana) {
      setSelectedBrand('PANASONIC');
    } else {
      setSelectedBrand(parsedData.brandList[0].brand);
    }
  }, [parsedData.brandList, hasUserSelectedBrand]);

  // Generate day columns
  const dayColumns: DayColumn[] = useMemo(() => {
    if (!parsedData.minDate || !parsedData.maxDate) {
      return Array.from(parsedData.allDateKeysMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }

    const minD = parsedData.minDate;
    const maxD = parsedData.maxDate;

    // Check if dates are within the same month
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

  // Compute table rows for the selected brand
  const tableData = useMemo(() => {
    const isAllMode = selectedBrand === 'ALL';

    if (isAllMode) {
      // "ALL BRANDS" Mode: Each row is a brand
      const brandRows = parsedData.brandList.map(b => {
        const staffMap = parsedData.brandSalesMap.get(b.brand) || new Map<string, StaffBrandSales>();
        const dailyQty: Record<string, number> = {};
        const dailyRev: Record<string, number> = {};
        
        staffMap.forEach(staff => {
          Object.entries(staff.dailyQty).forEach(([dk, q]) => {
            dailyQty[dk] = (dailyQty[dk] || 0) + q;
          });
          Object.entries(staff.dailyRev).forEach(([dk, r]) => {
            dailyRev[dk] = (dailyRev[dk] || 0) + r;
          });
        });

        return {
          key: b.brand,
          brandName: b.brand,
          dailyQty,
          dailyRev,
          totalQty: b.totalQty,
          totalRev: b.totalRev,
          activeStaffCount: staffMap.size,
        };
      });

      // Filter by brand search
      const filtered = brandSearchQuery.trim()
        ? brandRows.filter(r => removeAccents(r.brandName).includes(removeAccents(brandSearchQuery)))
        : brandRows;

      // Total store row for ALL brands
      const storeDailyQty: Record<string, number> = {};
      const storeDailyRev: Record<string, number> = {};
      let grandTotalQty = 0;
      let grandTotalRev = 0;

      filtered.forEach(r => {
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
        isAllMode: true as const,
        brandRows: filtered,
        storeDailyQty,
        storeDailyRev,
        grandTotalQty,
        grandTotalRev,
      };
    }

    // Specific Brand Mode: Each row is an employee
    const staffSalesMap = parsedData.brandSalesMap.get(selectedBrand) || new Map<string, StaffBrandSales>();

    // Build complete staff list
    let staffRows: StaffBrandSales[] = parsedData.staffMasterList.map(m => {
      const existing = staffSalesMap.get(m.staffKey);
      if (existing) return existing;
      return {
        staffKey: m.staffKey,
        staffId: m.staffId,
        staffName: m.staffName,
        dailyQty: {},
        dailyRev: {},
        dailyItems: {},
        totalQty: 0,
        totalRev: 0,
      };
    });

    // Parent filter for selected staffs
    if (selectedStaffs.length > 0) {
      staffRows = staffRows.filter(s => selectedStaffs.some(sel => s.staffName.toLowerCase().includes(sel.toLowerCase())));
    }
    if (drillFilterStaff.length > 0) {
      staffRows = staffRows.filter(s => drillFilterStaff.includes(s.staffName));
    }

    // Filter: show only staff with sales
    if (showOnlyWithSales) {
      staffRows = staffRows.filter(s => s.totalQty > 0);
    }

    // Filter by staff search query
    if (staffSearchQuery.trim()) {
      const q = removeAccents(staffSearchQuery.trim());
      staffRows = staffRows.filter(s => 
        removeAccents(s.staffName).includes(q) || 
        (s.staffId && s.staffId.includes(q))
      );
    }

    // Sort by sales descending
    staffRows.sort((a, b) => b.totalQty - a.totalQty || b.totalRev - a.totalRev || a.staffName.localeCompare(b.staffName));

    // Store total row for this brand
    const storeDailyQty: Record<string, number> = {};
    const storeDailyRev: Record<string, number> = {};
    let grandTotalQty = 0;
    let grandTotalRev = 0;

    staffRows.forEach(s => {
      grandTotalQty += s.totalQty;
      grandTotalRev += s.totalRev;
      Object.entries(s.dailyQty).forEach(([dk, q]) => {
        storeDailyQty[dk] = (storeDailyQty[dk] || 0) + q;
      });
      Object.entries(s.dailyRev).forEach(([dk, r]) => {
        storeDailyRev[dk] = (storeDailyRev[dk] || 0) + r;
      });
    });

    return {
      isAllMode: false as const,
      staffRows,
      storeDailyQty,
      storeDailyRev,
      grandTotalQty,
      grandTotalRev,
    };
  }, [
    selectedBrand, 
    parsedData, 
    selectedStaffs, 
    drillFilterStaff, 
    showOnlyWithSales, 
    staffSearchQuery, 
    brandSearchQuery
  ]);

  // KPI Quick Stats
  const kpiStats = useMemo(() => {
    const isAll = selectedBrand === 'ALL';
    const totalQty = tableData.grandTotalQty;
    const totalRev = tableData.grandTotalRev;

    let topStaffName = '-';
    let topStaffQty = 0;
    let activeStaffCount = 0;
    const totalStaffCount = parsedData.staffMasterList.length;

    if (!isAll && 'staffRows' in tableData) {
      const activeStaff = tableData.staffRows.filter(s => s.totalQty > 0);
      activeStaffCount = activeStaff.length;
      if (activeStaff.length > 0) {
        topStaffName = activeStaff[0].staffName;
        topStaffQty = activeStaff[0].totalQty;
      }
    } else if (isAll && 'brandRows' in tableData) {
      if (tableData.brandRows.length > 0) {
        topStaffName = tableData.brandRows[0].brandName;
        topStaffQty = tableData.brandRows[0].totalQty;
      }
    }

    // Peak sales day
    let peakDay = '-';
    let peakDayQty = 0;
    Object.entries(tableData.storeDailyQty).forEach(([dk, q]) => {
      if (q > peakDayQty) {
        peakDayQty = q;
        const col = dayColumns.find(c => c.dateKey === dk);
        peakDay = col ? col.displayDate : dk;
      }
    });

    return {
      totalQty,
      totalRev,
      topStaffName,
      topStaffQty,
      activeStaffCount,
      totalStaffCount,
      peakDay,
      peakDayQty,
    };
  }, [selectedBrand, tableData, parsedData.staffMasterList.length, dayColumns]);

  // Export Excel handler
  const handleExportExcel = () => {
    try {
      const aoa: (string | number)[][] = [];
      const title = selectedBrand === 'ALL' 
        ? 'BẢNG THEO DÕI BÁN HÀNG TỔNG HỢP CÁC HÃNG THEO NGÀY' 
        : `BẢNG THEO DÕI BÁN HÀNG HÃNG ${selectedBrand} THEO NGÀY`;

      aoa.push([title]);
      aoa.push([]);

      // Headers
      const headerRow1 = ['STT', selectedBrand === 'ALL' ? 'Tên Hãng' : 'Nhân Viên'];
      if (selectedBrand !== 'ALL') {
        headerRow1.splice(2, 0, 'Mã NV');
      }
      dayColumns.forEach(c => headerRow1.push(c.displayDate));
      headerRow1.push(viewMetric === 'qty' ? 'TỔNG SL' : 'TỔNG DOANH THU');
      headerRow1.push('% TỔNG');
      aoa.push(headerRow1);

      // Store Total Row
      const storeRow: (string | number)[] = ['-', 'TỔNG TOÀN SIÊU THỊ'];
      if (selectedBrand !== 'ALL') storeRow.push('-');
      dayColumns.forEach(c => {
        const val = viewMetric === 'qty'
          ? (tableData.storeDailyQty[c.dateKey] || 0)
          : (tableData.storeDailyRev[c.dateKey] || 0);
        storeRow.push(val);
      });
      storeRow.push(viewMetric === 'qty' ? tableData.grandTotalQty : tableData.grandTotalRev);
      storeRow.push('100%');
      aoa.push(storeRow);

      // Data Rows
      if (!tableData.isAllMode && 'staffRows' in tableData) {
        tableData.staffRows.forEach((s, idx) => {
          const row: (string | number)[] = [idx + 1, s.staffName, s.staffId || ''];
          dayColumns.forEach(c => {
            const val = viewMetric === 'qty'
              ? (s.dailyQty[c.dateKey] || 0)
              : (s.dailyRev[c.dateKey] || 0);
            row.push(val);
          });
          const rowTotal = viewMetric === 'qty' ? s.totalQty : s.totalRev;
          row.push(rowTotal);
          const grand = viewMetric === 'qty' ? tableData.grandTotalQty : tableData.grandTotalRev;
          const pct = grand > 0 ? `${((rowTotal / grand) * 100).toFixed(1)}%` : '0%';
          row.push(pct);
          aoa.push(row);
        });
      } else if (tableData.isAllMode && 'brandRows' in tableData) {
        tableData.brandRows.forEach((b, idx) => {
          const row: (string | number)[] = [idx + 1, b.brandName];
          dayColumns.forEach(c => {
            const val = viewMetric === 'qty'
              ? (b.dailyQty[c.dateKey] || 0)
              : (b.dailyRev[c.dateKey] || 0);
            row.push(val);
          });
          const rowTotal = viewMetric === 'qty' ? b.totalQty : b.totalRev;
          row.push(rowTotal);
          const grand = viewMetric === 'qty' ? tableData.grandTotalQty : tableData.grandTotalRev;
          const pct = grand > 0 ? `${((rowTotal / grand) * 100).toFixed(1)}%` : '0%';
          row.push(pct);
          aoa.push(row);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TheoDoi_Hang_Ngay');
      const filename = `TheoDoi_${selectedBrand}_TheoNgay_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Error exporting Excel:', err);
    }
  };

  if (!rawYcxRows || rawYcxRows.length <= 1) {
    return null;
  }

  // Top 8 brands for quick pills
  const topPillBrands = parsedData.brandList.slice(0, 8);

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6 mb-8"
      id="brand-daily-staff-sales-container"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 border-b border-indigo-950/40 relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-black shadow-md shadow-amber-500/20">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[15px] sm:text-[17px] font-black uppercase tracking-wider text-amber-300">
                  THEO DÕI BÁN HÀNG THEO HÃNG THEO NGÀY
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-800/80 text-indigo-200 border border-indigo-700/60 uppercase">
                  Từng nhân viên
                </span>
              </div>
              <p className="text-[10.5px] sm:text-[11px] text-slate-300 mt-0.5 font-medium">
                Ma trận tiến độ sản lượng theo ngày của từng nhân viên theo hãng sản xuất ({selectedBrand === 'ALL' ? 'Tất cả hãng' : `Hãng ${selectedBrand}`})
              </p>
            </div>
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto no-capture">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-[11px] font-black flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Xuất bảng này ra file Excel (.xlsx)"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Xuất Excel</span>
            </button>

            {onCapture && (
              <button
                onClick={onCapture}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all text-[11px] font-black flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Chụp ảnh toàn bộ bảng này để gửi Zalo / báo cáo"
              >
                <Camera size={13} />
                <span>Chụp ảnh</span>
              </button>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center justify-center shrink-0"
              title={isExpanded ? 'Thu gọn bảng' : 'Mở rộng bảng'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 sm:p-5 space-y-4">
          {/* Quick KPI Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="bg-gradient-to-br from-indigo-50/80 to-indigo-100/40 rounded-xl p-3 border border-indigo-100/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                <ShoppingBag size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-indigo-700 uppercase block truncate">
                  {selectedBrand === 'ALL' ? 'TỔNG TẤT CẢ HÃNG' : `HÃNG ${selectedBrand}`}
                </span>
                <div className="text-[17px] font-black text-slate-900 leading-tight">
                  {kpiStats.totalQty} <span className="text-[11px] font-bold text-slate-500">sp</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/40 rounded-xl p-3 border border-amber-200/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                <Award size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black text-amber-800 uppercase block truncate">
                  {selectedBrand === 'ALL' ? 'HÃNG TOP 1' : 'QUÁN QUÂN BÁN CHẠY'}
                </span>
                <div className="text-[14px] font-black text-slate-900 truncate leading-tight" title={kpiStats.topStaffName}>
                  {kpiStats.topStaffName}
                </div>
                <div className="text-[10.5px] font-bold text-amber-700">
                  {kpiStats.topStaffQty > 0 ? `Đã bán: ${kpiStats.topStaffQty} sp` : 'Chưa có đơn'}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 rounded-xl p-3 border border-emerald-200/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                <Users size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-emerald-800 uppercase block truncate">
                  NV ĐÃ MỞ BÁT
                </span>
                <div className="text-[17px] font-black text-slate-900 leading-tight">
                  {selectedBrand === 'ALL' ? parsedData.brandList.length : kpiStats.activeStaffCount}
                  <span className="text-[11px] font-bold text-slate-500">
                    /{selectedBrand === 'ALL' ? ' tổng hãng' : ` ${kpiStats.totalStaffCount} NV`}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/40 rounded-xl p-3 border border-purple-200/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                <Calendar size={17} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black text-purple-800 uppercase block truncate">
                  NGÀY ĐỈNH ĐIỂM
                </span>
                <div className="text-[16px] font-black text-slate-900 leading-tight">
                  {kpiStats.peakDay}
                </div>
                <div className="text-[10.5px] font-bold text-purple-700">
                  {kpiStats.peakDayQty > 0 ? `Bán ${kpiStats.peakDayQty} sp` : '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Brand Selection Pills & Dropdown */}
          <div className="space-y-2 no-capture">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
                  <Filter size={12} className="text-indigo-600" />
                  CHỌN HÃNG:
                </span>

                {/* ALL BRANDS Button */}
                <button
                  onClick={() => {
                    setSelectedBrand('ALL');
                    setHasUserSelectedBrand(true);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                    selectedBrand === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                  }`}
                >
                  <Layers size={13} />
                  <span>TẤT CẢ HÃNG ({parsedData.brandList.length})</span>
                </button>

                {/* Top Brands Pills */}
                {topPillBrands.map(b => {
                  const isActive = selectedBrand === b.brand;
                  return (
                    <button
                      key={b.brand}
                      onClick={() => {
                        setSelectedBrand(b.brand);
                        setHasUserSelectedBrand(true);
                      }}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm font-black'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span>{b.brand}</span>
                      <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {b.totalQty}
                      </span>
                    </button>
                  );
                })}

                {/* Dropdown for other brands */}
                {parsedData.brandList.length > 8 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1 ${
                        !topPillBrands.some(b => b.brand === selectedBrand) && selectedBrand !== 'ALL'
                          ? 'bg-indigo-600 text-white border-indigo-700'
                          : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span>
                        {!topPillBrands.some(b => b.brand === selectedBrand) && selectedBrand !== 'ALL'
                          ? selectedBrand
                          : `Xem thêm (${parsedData.brandList.length - 8} hãng)`}
                      </span>
                      <ChevronDown size={12} />
                    </button>

                    {showBrandDropdown && (
                      <div className="absolute left-0 sm:right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 max-h-72 overflow-y-auto">
                        <div className="p-1 mb-1 border-b border-slate-100">
                          <input
                            type="text"
                            placeholder="Tìm kiếm hãng..."
                            value={brandSearchQuery}
                            onChange={e => setBrandSearchQuery(e.target.value)}
                            className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-0.5">
                          {parsedData.brandList
                            .filter(b => removeAccents(b.brand).includes(removeAccents(brandSearchQuery)))
                            .map(b => (
                              <button
                                key={b.brand}
                                onClick={() => {
                                  setSelectedBrand(b.brand);
                                  setHasUserSelectedBrand(true);
                                  setShowBrandDropdown(false);
                                }}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-between transition-colors ${
                                  selectedBrand === b.brand ? 'bg-amber-100 text-amber-900' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span>{b.brand}</span>
                                <span className="text-[10px] text-slate-400 font-mono">({b.totalQty})</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* View options & Search */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search staff */}
                {selectedBrand !== 'ALL' && (
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm nhân viên..."
                      value={staffSearchQuery}
                      onChange={e => setStaffSearchQuery(e.target.value)}
                      className="pl-7 pr-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
                    />
                    {staffSearchQuery && (
                      <button
                        onClick={() => setStaffSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )}

                {/* Metric toggle: Qty vs Rev */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMetric('qty')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black transition-all ${
                      viewMetric === 'qty' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    SL BÁN
                  </button>
                  <button
                    onClick={() => setViewMetric('revenue')}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black transition-all ${
                      viewMetric === 'revenue' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    DOANH THU
                  </button>
                </div>

                {/* Show only active staff toggle */}
                {selectedBrand !== 'ALL' && (
                  <button
                    onClick={() => setShowOnlyWithSales(!showOnlyWithSales)}
                    className={`px-2.5 py-1.5 rounded-xl text-[10.5px] font-black border transition-all ${
                      showOnlyWithSales
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                    title="Ẩn những nhân viên chưa bán được sản phẩm nào của hãng này"
                  >
                    {showOnlyWithSales ? '✓ Đang lọc: NV đã bán' : 'Hiện tất cả NV'}
                  </button>
                )}

                {/* Day column mode toggle */}
                <button
                  onClick={() => setShowAllDaysInMonth(!showAllDaysInMonth)}
                  className={`px-2 py-1.5 rounded-xl text-[10.5px] font-bold border transition-all ${
                    showAllDaysInMonth
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-slate-500 border-slate-200'
                  }`}
                  title="Hiện đủ ngày từ Ngày 1 đến ngày hiện tại"
                >
                  {showAllDaysInMonth ? 'Đủ ngày 1→N' : 'Chỉ ngày có đơn'}
                </button>
              </div>
            </div>
          </div>

          {/* Main Matrix Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="overflow-x-auto relative">
              <table 
                className="w-full text-center border-collapse text-[12px]" 
                style={{ tableLayout: 'fixed', borderSpacing: 0 }}
              >
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ width: selectedBrand === 'ALL' ? '200px' : '190px' }} />
                  {dayColumns.map(c => (
                    <col key={c.dateKey} style={{ width: '46px' }} />
                  ))}
                  <col style={{ width: viewMetric === 'qty' ? '82px' : '105px' }} />
                  <col style={{ width: '68px' }} />
                </colgroup>

                <thead>
                  {/* Super Header */}
                  <tr className="bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider border-b border-slate-700">
                    <th rowSpan={2} className="py-2.5 px-1 border-r border-slate-700 text-center sticky left-0 z-20 bg-slate-800">
                      STT
                    </th>
                    <th rowSpan={2} className="py-2.5 px-3 border-r border-slate-700 text-left sticky left-[44px] z-20 bg-slate-800">
                      {selectedBrand === 'ALL' ? 'HÃNG SẢN XUẤT' : 'NHÂN VIÊN BÁN HÀNG'}
                    </th>
                    <th 
                      colSpan={dayColumns.length} 
                      className="py-1.5 px-2 border-r border-slate-700 text-center bg-indigo-950 text-amber-300"
                    >
                      📅 CÁC NGÀY BÁN TRONG KỲ ({dayColumns.length} ngày)
                    </th>
                    <th rowSpan={2} className="py-2.5 px-2 border-r border-slate-700 text-center bg-amber-500 text-slate-950 font-black">
                      {viewMetric === 'qty' ? 'TỔNG SL' : 'TỔNG DT'}
                    </th>
                    <th rowSpan={2} className="py-2.5 px-1 text-center bg-slate-900 text-slate-300">
                      % ĐÓNG GÓP
                    </th>
                  </tr>

                  {/* Day Sub Header */}
                  <tr className="bg-slate-100 text-slate-700 text-[10.5px] font-bold border-b border-slate-200">
                    {dayColumns.map(c => (
                      <th
                        key={c.dateKey}
                        className={`py-1.5 px-0.5 border-r border-slate-200 text-center truncate ${
                          c.isWeekend ? 'bg-amber-50/70 text-amber-900 font-black' : ''
                        }`}
                        title={`${c.displayDate} (${c.dayOfWeek || ''})`}
                      >
                        <div className="leading-tight">
                          <span className="block font-black">{c.dayNum < 10 ? `0${c.dayNum}` : c.dayNum}</span>
                          <span className="block text-[8.5px] text-slate-400 font-medium">{c.dayOfWeek}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* STORE TOTAL ROW */}
                  <tr className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 font-black border-b-2 border-amber-300 text-slate-900">
                    <td className="py-2.5 px-1 border-r border-amber-200 text-center text-amber-800 sticky left-0 z-10 bg-amber-50">
                      ∑
                    </td>
                    <td className="py-2.5 px-3 border-r border-amber-200 text-left sticky left-[44px] z-10 bg-amber-50">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-black text-amber-900 tracking-wide uppercase">TỔNG TOÀN SIÊU THỊ</span>
                      </div>
                    </td>
                    {dayColumns.map(c => {
                      const val = viewMetric === 'qty'
                        ? (tableData.storeDailyQty[c.dateKey] || 0)
                        : (tableData.storeDailyRev[c.dateKey] || 0);

                      return (
                        <td 
                          key={c.dateKey} 
                          className={`py-2 px-0.5 border-r border-amber-200/80 text-center font-black ${
                            val > 0 ? 'text-amber-950 bg-amber-100/50' : 'text-slate-300'
                          }`}
                        >
                          {viewMetric === 'qty' ? (
                            val > 0 ? (
                              <span className="inline-block px-1 py-0.5 bg-amber-200/80 text-amber-950 rounded text-[11px] font-black min-w-[22px]">
                                {val}
                              </span>
                            ) : (
                              '0'
                            )
                          ) : (
                            val > 0 ? `${Math.round(val / 1000000)}tr` : '0'
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-2 border-r border-amber-300 text-center text-[13px] font-black text-red-600 bg-amber-100">
                      {viewMetric === 'qty' 
                        ? tableData.grandTotalQty 
                        : `${(tableData.grandTotalRev / 1000000).toFixed(1)} tr`}
                    </td>
                    <td className="py-2.5 px-1 text-center font-black text-slate-700 bg-amber-50/60">
                      100%
                    </td>
                  </tr>

                  {/* EMPLOYEES ROWS (When specific brand selected) */}
                  {!tableData.isAllMode && 'staffRows' in tableData && (
                    tableData.staffRows.map((staff, idx) => {
                      const isTop1 = idx === 0 && staff.totalQty > 0;
                      const isTop2 = idx === 1 && staff.totalQty > 0;
                      const isTop3 = idx === 2 && staff.totalQty > 0;
                      const grand = viewMetric === 'qty' ? tableData.grandTotalQty : tableData.grandTotalRev;
                      const rowVal = viewMetric === 'qty' ? staff.totalQty : staff.totalRev;
                      const pct = grand > 0 ? ((rowVal / grand) * 100).toFixed(1) : '0';

                      return (
                        <tr 
                          key={staff.staffKey}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            staff.totalQty > 0 ? 'bg-white' : 'bg-slate-50/30'
                          }`}
                        >
                          {/* STT */}
                          <td className="py-2 px-1 border-r border-slate-200 text-center text-[11px] font-bold text-slate-500 sticky left-0 z-10 bg-white">
                            {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : idx + 1}
                          </td>

                          {/* Staff Name */}
                          <td className="py-2 px-3 border-r border-slate-200 text-left sticky left-[44px] z-10 bg-white">
                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                              <span 
                                className={`truncate font-bold ${
                                  staff.totalQty > 0 ? 'text-slate-900' : 'text-slate-400 font-normal'
                                }`}
                                title={staff.staffName}
                              >
                                {staff.staffName}
                              </span>
                              {staff.staffId && (
                                <span className="text-[9px] text-slate-400 font-mono shrink-0">
                                  {staff.staffId}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Day Columns */}
                          {dayColumns.map(c => {
                            const qty = staff.dailyQty[c.dateKey] || 0;
                            const rev = staff.dailyRev[c.dateKey] || 0;
                            const items = staff.dailyItems[c.dateKey] || [];

                            return (
                              <td
                                key={c.dateKey}
                                onClick={() => {
                                  if (items.length > 0) {
                                    setSelectedDetailCell({
                                      staffName: staff.staffName,
                                      dateDisplay: `${c.displayDate} (${c.dayOfWeek || ''})`,
                                      items,
                                      totalQty: qty,
                                      totalRev: rev,
                                    });
                                  }
                                }}
                                className={`py-1.5 px-0.5 border-r border-slate-100 text-center ${
                                  items.length > 0 ? 'cursor-pointer hover:bg-indigo-50/80 transition-colors' : ''
                                }`}
                                title={items.length > 0 ? `Nhấp để xem chi tiết (${items.length} sp)` : undefined}
                              >
                                {viewMetric === 'qty' ? (
                                  qty > 0 ? (
                                    <span 
                                      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-black min-w-[20px] shadow-2xs ${
                                        qty >= 3
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                                          : qty === 2
                                          ? 'bg-teal-100 text-teal-800 border border-teal-200 font-bold'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold'
                                      }`}
                                    >
                                      {qty}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">0</span>
                                  )
                                ) : (
                                  rev > 0 ? (
                                    <span className="text-[10px] font-bold text-indigo-700">
                                      {(rev / 1000000).toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 font-normal">0</span>
                                  )
                                )}
                              </td>
                            );
                          })}

                          {/* Total Column */}
                          <td className={`py-2 px-2 border-r border-slate-200 text-center font-black ${
                            staff.totalQty > 0 
                              ? 'bg-amber-50/60 text-slate-900 text-[12.5px]' 
                              : 'text-slate-300'
                          }`}>
                            {viewMetric === 'qty' 
                              ? (staff.totalQty > 0 ? staff.totalQty : '0')
                              : (staff.totalRev > 0 ? `${(staff.totalRev / 1000000).toFixed(1)} tr` : '0')}
                          </td>

                          {/* % Contribution */}
                          <td className="py-2 px-1 text-center text-[10.5px] font-medium text-slate-500">
                            {staff.totalQty > 0 ? `${pct}%` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* BRANDS ROWS (When ALL BRANDS mode selected) */}
                  {tableData.isAllMode && 'brandRows' in tableData && (
                    tableData.brandRows.map((brandRow, idx) => {
                      const grand = viewMetric === 'qty' ? tableData.grandTotalQty : tableData.grandTotalRev;
                      const rowVal = viewMetric === 'qty' ? brandRow.totalQty : brandRow.totalRev;
                      const pct = grand > 0 ? ((rowVal / grand) * 100).toFixed(1) : '0';

                      return (
                        <tr 
                          key={brandRow.key}
                          className="border-b border-slate-100 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                          onClick={() => {
                            setSelectedBrand(brandRow.brandName);
                            setHasUserSelectedBrand(true);
                          }}
                          title={`Nhấp để xem chi tiết từng nhân viên bán hãng ${brandRow.brandName}`}
                        >
                          <td className="py-2 px-1 border-r border-slate-200 text-center text-[11px] font-bold text-slate-500 sticky left-0 z-10 bg-white">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-200 text-left sticky left-[44px] z-10 bg-white">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-black text-indigo-700 hover:underline">
                                {brandRow.brandName}
                              </span>
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-bold shrink-0">
                                {brandRow.activeStaffCount} NV
                              </span>
                            </div>
                          </td>

                          {dayColumns.map(c => {
                            const qty = brandRow.dailyQty[c.dateKey] || 0;
                            const rev = brandRow.dailyRev[c.dateKey] || 0;

                            return (
                              <td key={c.dateKey} className="py-1.5 px-0.5 border-r border-slate-100 text-center">
                                {viewMetric === 'qty' ? (
                                  qty > 0 ? (
                                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-black bg-indigo-50 text-indigo-700 min-w-[20px]">
                                      {qty}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">0</span>
                                  )
                                ) : (
                                  rev > 0 ? (
                                    <span className="text-[10px] font-bold text-indigo-700">
                                      {(rev / 1000000).toFixed(1)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">0</span>
                                  )
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2 px-2 border-r border-slate-200 text-center font-black bg-amber-50/60 text-slate-900 text-[12.5px]">
                            {viewMetric === 'qty' ? brandRow.totalQty : `${(brandRow.totalRev / 1000000).toFixed(1)} tr`}
                          </td>

                          <td className="py-2 px-1 text-center text-[10.5px] font-medium text-slate-500">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Empty state when no staff matched filter */}
                  {!tableData.isAllMode && 'staffRows' in tableData && tableData.staffRows.length === 0 && (
                    <tr>
                      <td 
                        colSpan={dayColumns.length + 4} 
                        className="py-8 text-center text-slate-400 italic text-[11px]"
                      >
                        Không có nhân viên nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Guide */}
            <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 inline-block"></span>
                  SL 1: Mở bát
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-teal-200 border border-teal-400 inline-block"></span>
                  SL 2: Tốt
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-400 inline-block"></span>
                  SL ≥ 3: Đỉnh cao
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded bg-slate-200 inline-block"></span>
                  SL 0: Chưa bán
                </span>
              </div>
              <div className="text-slate-400 text-right">
                * Nhấp vào ô có số lượng bán để xem chi tiết sản phẩm & mã đơn
              </div>
            </div>
          </div>
        </div>
      )}

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
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-black uppercase text-amber-300">
                  CHI TIẾT ĐƠN HÀNG HÃNG {selectedBrand}
                </h4>
                <p className="text-[10.5px] text-slate-300 mt-0.5">
                  👤 <span className="font-bold text-white">{selectedDetailCell.staffName}</span> • 📅 {selectedDetailCell.dateDisplay}
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailCell(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] font-bold pb-2 border-b border-slate-100 text-slate-600">
                <span>Tổng sản phẩm: <strong className="text-indigo-600">{selectedDetailCell.totalQty}</strong></span>
                {selectedDetailCell.totalRev > 0 && (
                  <span>Doanh thu: <strong className="text-emerald-600">{(selectedDetailCell.totalRev / 1000000).toFixed(2)} triệu</strong></span>
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
