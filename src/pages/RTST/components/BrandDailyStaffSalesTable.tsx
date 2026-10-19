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
  AlertTriangle,
  BarChart3
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

const extractName = (raw: string): string => {
  if (!raw) return raw;
  const match = raw.match(/^\s*\d+\s*[-–]\s*(.+)$/);
  return match ? match[1].trim() : raw.trim();
};

export const BrandDailyStaffSalesTable: React.FC<BrandDailyStaffSalesTableProps> = ({
  rawYcxRows,
  filteredRawYcxRows,
  onCapture,
  selectedStaffs = [],
  drillFilterStaff = []
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>('PANASONIC');
  const [hasUserSelectedBrand, setHasUserSelectedBrand] = useState(false);
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

    // Staff index (Priority to creator / sales staff, strictly exclude delivery)
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

    const { idxStaff, idxDate, idxBrand, idxProduct, idxQty, idxRevenue, idxOrder } = indices;

    const brandStats = new Map<string, { totalQty: number; totalRev: number }>();
    const staffMasterMap = new Map<string, { staffKey: string; staffId: string; staffName: string }>();
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

      if (!staffMasterMap.has(staffKey)) {
        staffMasterMap.set(staffKey, { staffKey, staffId, staffName });
      }

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

      // Ultimate fallback date if completely missing: use current date
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
        brandStats.set(brand, { totalQty: 0, totalRev: 0 });
      }
      const bStat = brandStats.get(brand)!;
      bStat.totalQty += qty;
      bStat.totalRev += rev;

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
  }, [indices, sourceRows]);

  // Auto-select initial brand
  useMemo(() => {
    if (hasUserSelectedBrand) return;
    if (parsedData.brandList.length === 0) return;
    const hasPana = parsedData.brandList.find(b => b.brand === 'PANASONIC');
    if (hasPana && hasPana.totalQty > 0) {
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

    if (selectedStaffs.length > 0) {
      staffRows = staffRows.filter(s => selectedStaffs.some(sel => s.staffName.toLowerCase().includes(sel.toLowerCase())));
    }
    if (drillFilterStaff.length > 0) {
      staffRows = staffRows.filter(s => drillFilterStaff.includes(s.staffName));
    }

    if (showOnlyWithSales) {
      staffRows = staffRows.filter(s => s.totalQty > 0);
    }

    if (staffSearchQuery.trim()) {
      const q = removeAccents(staffSearchQuery.trim());
      staffRows = staffRows.filter(s => 
        removeAccents(s.staffName).includes(q) || 
        (s.staffId && s.staffId.includes(q))
      );
    }

    // Sort: Staff with sales at top (descending), staff with 0 at bottom
    staffRows.sort((a, b) => b.totalQty - a.totalQty || b.totalRev - a.totalRev || a.staffName.localeCompare(b.staffName));

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

      // Store Total Row at bottom
      const storeRow: (string | number)[] = ['-', 'TỔNG CỘNG'];
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

  // Top brands for pills
  const topPillBrands = parsedData.brandList.slice(0, 9);

  // Render rank medal or warning icon matching Image 1
  const renderRank = (idx: number, qty: number) => {
    if (qty === 0) {
      return (
        <span className="text-[14px] text-amber-500 font-bold shrink-0" title="Chưa bán">
          ⚠️
        </span>
      );
    }
    if (idx === 0) return <span className="text-[15px] shrink-0" title="Hạng 1">🥇</span>;
    if (idx === 1) return <span className="text-[15px] shrink-0" title="Hạng 2">🥈</span>;
    if (idx === 2) return <span className="text-[15px] shrink-0" title="Hạng 3">🥉</span>;
    return <span className="text-[11px] font-black text-slate-500 shrink-0 w-4">#{idx + 1}</span>;
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
              <h3 className="text-[16px] sm:text-[18px] font-black text-red-600 tracking-tight uppercase">
                THEO DÕI BÁN HÀNG THEO HÃNG THEO NGÀY
              </h3>
              <p className="text-[10.5px] sm:text-[11px] text-slate-400 mt-0.5">
                Chi tiết số lượng bán ra theo từng ngày của từng nhân viên theo hãng ({selectedBrand === 'ALL' ? 'TẤT CẢ HÃNG' : `HÃNG ${selectedBrand}`})
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

        {/* Filter bar - EXACT SAME STYLE AS HÌNH 1 */}
        <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-3 sm:px-5 sm:py-4 no-capture">
          {/* Row 1: Brand buttons list */}
          <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto no-scrollbar items-center gap-1.5 sm:gap-2.5 pb-1">
            <span className="text-[11px] sm:text-[12px] font-black text-slate-500 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1.5 w-full sm:w-auto mb-1 sm:mb-0">
              <Filter size={13} />
              CHỌN HÃNG:
            </span>

            {/* ALL BRANDS Button */}
            <button
              onClick={() => {
                setSelectedBrand('ALL');
                setHasUserSelectedBrand(true);
              }}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10.5px] sm:text-[12px] font-black transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                selectedBrand === 'ALL'
                  ? 'bg-emerald-50 text-[#047857] border-emerald-300 shadow-sm'
                  : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>🏷️</span>
              <span>TẤT CẢ HÃNG ({parsedData.brandList.length})</span>
            </button>

            {/* Individual Brands Pills */}
            {topPillBrands.map(b => {
              const isActive = selectedBrand === b.brand;
              return (
                <button
                  key={b.brand}
                  onClick={() => {
                    setSelectedBrand(b.brand);
                    setHasUserSelectedBrand(true);
                  }}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10.5px] sm:text-[12px] font-black transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-50 text-[#047857] border-emerald-300 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span>❄️</span>
                  <span>{b.brand}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                    isActive ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {b.totalQty}
                  </span>
                </button>
              );
            })}

            {/* Dropdown for other brands */}
            {parsedData.brandList.length > 9 && (
              <div className="relative">
                <button
                  onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[10.5px] sm:text-[12px] font-black border transition-all flex items-center gap-1 whitespace-nowrap ${
                    !topPillBrands.some(b => b.brand === selectedBrand) && selectedBrand !== 'ALL'
                      ? 'bg-emerald-50 text-[#047857] border-emerald-300 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                >
                  <span>
                    {!topPillBrands.some(b => b.brand === selectedBrand) && selectedBrand !== 'ALL'
                      ? selectedBrand
                      : `Khác (${parsedData.brandList.length - 9})`}
                  </span>
                  <ChevronDown size={12} />
                </button>

                {showBrandDropdown && (
                  <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 max-h-72 overflow-y-auto">
                    <div className="p-1 mb-1 border-b border-slate-100">
                      <input
                        type="text"
                        placeholder="Tìm hãng..."
                        value={brandSearchQuery}
                        onChange={e => setBrandSearchQuery(e.target.value)}
                        className="w-full px-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
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
                              selectedBrand === b.brand ? 'bg-emerald-50 text-[#047857]' : 'hover:bg-slate-50 text-slate-700'
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

          {/* Row 2: Sub-options (like sub-category buttons in Hình 1) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200/60 pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] font-black text-[#047857] flex items-center gap-1">
                ⚙️ TÙY CHỌN:
              </span>

              {/* Qty vs Revenue */}
              <button
                onClick={() => setViewMetric('qty')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold transition-all border whitespace-nowrap ${
                  viewMetric === 'qty'
                    ? 'bg-emerald-50 text-[#047857] border-emerald-200 shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                }`}
              >
                SL BÁN
              </button>
              <button
                onClick={() => setViewMetric('revenue')}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold transition-all border whitespace-nowrap ${
                  viewMetric === 'revenue'
                    ? 'bg-emerald-50 text-[#047857] border-emerald-200 shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                }`}
              >
                DOANH THU
              </button>

              {/* Show only active staff */}
              {selectedBrand !== 'ALL' && (
                <button
                  onClick={() => setShowOnlyWithSales(!showOnlyWithSales)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold transition-all border whitespace-nowrap ${
                    showOnlyWithSales
                      ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm'
                      : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                  }`}
                >
                  {showOnlyWithSales ? '✓ Đang lọc: NV đã bán' : 'Hiện tất cả NV'}
                </button>
              )}

              {/* Show all days in month */}
              <button
                onClick={() => setShowAllDaysInMonth(!showAllDaysInMonth)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-[9.5px] sm:text-[10px] font-bold transition-all border whitespace-nowrap ${
                  showAllDaysInMonth
                    ? 'bg-blue-50 text-[#1d4ed8] border-blue-200 shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                }`}
              >
                {showAllDaysInMonth ? 'Đủ ngày 1→N' : 'Chỉ ngày có đơn'}
              </button>
            </div>

            {/* Search staff */}
            {selectedBrand !== 'ALL' && (
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên..."
                  value={staffSearchQuery}
                  onChange={e => setStaffSearchQuery(e.target.value)}
                  className="pl-7 pr-2.5 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 w-36 sm:w-48"
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
            <col style={{ width: selectedBrand === 'ALL' ? '220px' : '200px' }} />
            {dayColumns.map(c => (
              <col key={c.dateKey} style={{ width: '46px' }} />
            ))}
            <col style={{ width: viewMetric === 'qty' ? '70px' : '95px' }} />
            <col style={{ width: '65px' }} />
          </colgroup>

          <thead>
            {/* Group Header - Light mint/emerald background like SP CHÍNH in Hình 1 */}
            <tr className="border-b border-slate-200">
              <th 
                rowSpan={2} 
                className="py-2.5 px-4 text-left font-black text-slate-800 text-[12px] border-r border-slate-200/60 sticky left-0 z-20 bg-white"
              >
                <div className="flex items-center gap-1.5">
                  <span>NHÂN VIÊN</span>
                  <span className="text-slate-400 text-[11px]">⇅</span>
                </div>
              </th>

              <th 
                colSpan={dayColumns.length} 
                className="py-2 px-3 text-center bg-[#d1fae5] text-[#047857] font-black uppercase text-[12px] border-r border-slate-200/60 tracking-wider"
              >
                {selectedBrand === 'ALL' ? 'TẤT CẢ HÃNG - SẢN LƯỢNG THEO NGÀY' : `HÃNG ${selectedBrand} - SẢN LƯỢNG THEO NGÀY`}
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
            {/* EMPLOYEES ROWS (When specific brand selected) */}
            {!tableData.isAllMode && 'staffRows' in tableData && (
              tableData.staffRows.map((staff, idx) => {
                const grand = viewMetric === 'qty' ? tableData.grandTotalQty : tableData.grandTotalRev;
                const rowVal = viewMetric === 'qty' ? staff.totalQty : staff.totalRev;
                const pct = grand > 0 ? ((rowVal / grand) * 100).toFixed(1) : '0';

                return (
                  <tr 
                    key={staff.staffKey}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors bg-white"
                  >
                    {/* Staff Name with medal / warning icon */}
                    <td className="py-2 px-4 text-left font-bold text-[13px] text-slate-800 border-r border-slate-200/50 sticky left-0 z-10 bg-white">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {renderRank(idx, staff.totalQty)}
                        <span className="truncate" title={staff.staffName}>
                          {staff.staffName}
                        </span>
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
                          className={`py-2 px-1 text-center border-r border-slate-200/50 text-[13px] ${
                            items.length > 0 ? 'cursor-pointer hover:bg-emerald-50/80 transition-colors' : ''
                          }`}
                          title={items.length > 0 ? `Nhấp để xem chi tiết (${items.length} sp)` : undefined}
                        >
                          {viewMetric === 'qty' ? (
                            qty > 0 ? (
                              <span className="font-black text-[#047857]">{qty}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )
                          ) : (
                            rev > 0 ? (
                              <span className="font-black text-[#1d4ed8]">{(rev / 1000000).toFixed(1)}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )
                          )}
                        </td>
                      );
                    })}

                    {/* Row Total */}
                    <td className="py-2 px-3 text-center text-[13.5px] font-black text-[#047857] bg-emerald-50/40 border-r border-slate-200/50">
                      {rowVal > 0 ? (
                        viewMetric === 'qty' ? rowVal : `${(rowVal / 1000000).toFixed(1)} tr`
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* % Contribution */}
                    <td className="py-2 px-2 text-center text-[11px] font-bold text-slate-500">
                      {rowVal > 0 ? `${pct}%` : '-'}
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
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors bg-white cursor-pointer"
                    onClick={() => {
                      setSelectedBrand(brandRow.brandName);
                      setHasUserSelectedBrand(true);
                    }}
                    title={`Nhấp để xem chi tiết từng nhân viên bán hãng ${brandRow.brandName}`}
                  >
                    <td className="py-2 px-4 text-left font-bold text-[13px] text-slate-800 border-r border-slate-200/50 sticky left-0 z-10 bg-white">
                      <div className="flex items-center gap-2">
                        {renderRank(idx, brandRow.totalQty)}
                        <span className="font-black text-[#047857] hover:underline">
                          {brandRow.brandName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({brandRow.activeStaffCount} NV)
                        </span>
                      </div>
                    </td>

                    {dayColumns.map(c => {
                      const qty = brandRow.dailyQty[c.dateKey] || 0;
                      const rev = brandRow.dailyRev[c.dateKey] || 0;

                      return (
                        <td key={c.dateKey} className="py-2 px-1 text-center border-r border-slate-200/50 text-[13px]">
                          {viewMetric === 'qty' ? (
                            qty > 0 ? (
                              <span className="font-black text-[#047857]">{qty}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )
                          ) : (
                            rev > 0 ? (
                              <span className="font-black text-[#1d4ed8]">{(rev / 1000000).toFixed(1)}</span>
                            ) : (
                              <span className="text-slate-300 font-normal">-</span>
                            )
                          )}
                        </td>
                      );
                    })}

                    <td className="py-2 px-3 text-center text-[13.5px] font-black text-[#047857] bg-emerald-50/40 border-r border-slate-200/50">
                      {rowVal > 0 ? (
                        viewMetric === 'qty' ? rowVal : `${(rowVal / 1000000).toFixed(1)} tr`
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    <td className="py-2 px-2 text-center text-[11px] font-bold text-slate-500">
                      {rowVal > 0 ? `${pct}%` : '-'}
                    </td>
                  </tr>
                );
              })
            )}

            {/* Empty state when no rows */}
            {((!tableData.isAllMode && 'staffRows' in tableData && tableData.staffRows.length === 0) ||
              (tableData.isAllMode && 'brandRows' in tableData && tableData.brandRows.length === 0)) && (
              <tr>
                <td 
                  colSpan={dayColumns.length + 3} 
                  className="py-12 text-center text-slate-400 italic text-[11px]"
                >
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
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
                const dayQty = tableData.storeDailyQty[c.dateKey] || 0;
                const dayRev = tableData.storeDailyRev[c.dateKey] || 0;
                const val = viewMetric === 'qty' ? dayQty : dayRev;

                return (
                  <td key={c.dateKey} className="py-2.5 px-1 text-center font-black border-r border-emerald-300/60">
                    {val > 0 ? (
                      viewMetric === 'qty' ? val : `${Math.round(val / 1000000)}tr`
                    ) : (
                      <span className="text-slate-300 font-normal">-</span>
                    )}
                  </td>
                );
              })}

              <td className="py-2.5 px-3 text-center font-black text-[14px] border-r border-emerald-300/60 bg-emerald-100/60">
                {viewMetric === 'qty' 
                  ? (tableData.grandTotalQty > 0 ? tableData.grandTotalQty : '-')
                  : (tableData.grandTotalRev > 0 ? `${(tableData.grandTotalRev / 1000000).toFixed(1)} tr` : '-')}
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
                  CHI TIẾT ĐƠN HÀNG HÃNG {selectedBrand}
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
