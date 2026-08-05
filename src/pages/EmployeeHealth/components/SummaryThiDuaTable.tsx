import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { parseCategoryData, cn, cleanCategoryName } from '../../RTST/utils';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { Download, Copy, Check, MessageSquare, ChevronDown, Search, X } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { useAuth } from '../../../contexts/AuthContext';
import { useLuykeData } from '../../RTST/hooks/useLuykeData';

const removeAccentsLocal = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

import { CategoryConfigItem } from '../../../hooks/useCategoryConfig';

export const getCategoryGroupType = (catName: string, categoryConfig?: CategoryConfigItem[]): 'ICT' | 'DICH_VU' | 'DMX' => {
  if (!catName) return 'DMX';
  
  if (categoryConfig && categoryConfig.length > 0) {
    const normName = catName.trim().toLowerCase();
    const match = categoryConfig.find(c => c.name.toLowerCase().trim() === normName);
    if (match) {
      if (match.group === 'ICT') return 'ICT';
      if (match.group === 'DỊCH VỤ') return 'DICH_VU';
      return 'DMX';
    }
  }

  const norm = removeAccentsLocal(catName).toLowerCase().trim();

  // 1. NHÓM DỊCH VỤ / VAS / TRẢ CHẬM
  if (
    norm.includes('credit') ||
    norm.includes('shinhan') ||
    norm.includes('finance') ||
    norm.includes('vi tra sau') ||
    norm.includes('cake') ||
    norm.includes('ngan hang') ||
    norm.includes('vpbank') ||
    norm.includes('tpbank') ||
    norm.includes('bao hiem') ||
    norm.includes('sim') ||
    norm.includes('vas') ||
    norm.includes('tra cham') ||
    norm.includes('vay tien') ||
    norm.includes('nap rut') ||
    norm.includes('dich vu') ||
    norm.includes('mango') ||
    norm.includes('icallme') ||
    norm.includes('icall')
  ) {
    return 'DICH_VU';
  }

  // 2. NHÓM ICT (Điện thoại, Smartphone, Tablet, Laptop, Đồng hồ, Phụ kiện, Camera, Loa, Audio, Tai nghe, Pin...)
  if (
    norm.includes('dien thoai') ||
    norm.includes('smartphone') ||
    norm.includes('tablet') ||
    norm.includes('vivo') ||
    norm.includes('realme') ||
    norm.includes('phu kien') ||
    norm.includes('dong ho') ||
    norm.includes('camera') ||
    norm.includes('pin du phong') ||
    norm.includes('pin sac') ||
    norm.includes('tai nghe') ||
    norm.includes('bluetooth') ||
    norm.includes('laptop') ||
    norm.includes('macbook') ||
    norm === 'loa' ||
    norm.startsWith('loa ') ||
    norm.includes(' am thanh') ||
    norm.includes('audio')
  ) {
    return 'ICT';
  }

  // 3. NHÓM ĐMX (Gia dụng, Nồi cơm, Quạt, Máy lọc nước, Máy lạnh, Tủ lạnh, Máy giặt, Máy sấy, Điện tử...)
  return 'DMX';
};

export const EXACT_CATEGORY_ORDER: string[] = [
  "dienthoaitabletandroid",
  "dienthoairealme",
  "dienthoaivivo",
  "donghophukien",
  "doanhthudongho",
  "loa",
  "laptop",
  "camera",
  "simtong",
  "simmobifonevinaphonesimdmx",
  "baohiem",
  "baohiemthodienmayxanh",
  "trachamhomecredit",
  "fecreditshinhansamsungfinance",
  "trachamdienmayvagiadung",
  "vitrasau",
  "chovaytienmat",
  "dichvuvas",
  "napruttientaikhoannganhang",
  "mangoplusicallme",
  "mothetindungtpbankevovavpbankmwg",
  "hisense",
  "dientu",
  "dientusamsung",
  "maygiat",
  "maysaymayruachen",
  "cehanghaiermaylanhaqua",
  "maylanhcasper",
  "maylanhnagakawa",
  "dientudienlanhdiengiadunghanglg",
  "dacquyenmaygiattulanhmaylanhsamsung",
  "tulanhdudongtumat",
  "maylocnuoc",
  "noicom",
  "quatgio",
  "maylockhongkhihutamhutbui"
];

export const getCustomCategoryIndex = (catName: string, categoryConfig?: CategoryConfigItem[]): number => {
  if (!catName) return 999;
  
  if (categoryConfig && categoryConfig.length > 0) {
    const normName = catName.trim().toLowerCase();
    const idx = categoryConfig.findIndex(c => c.name.toLowerCase().trim() === normName);
    if (idx !== -1) return idx;
  }
  
  const clean = removeAccentsLocal(catName).toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const idx = EXACT_CATEGORY_ORDER.findIndex(k => clean === k || clean.includes(k) || k.includes(clean));
  if (idx !== -1) return idx;
  
  return 500 + getCategoryGroupSortOrder(catName, categoryConfig) * 10;
};

export const getCategoryGroupSortOrder = (catName: string, categoryConfig?: CategoryConfigItem[]): number => {
  const group = getCategoryGroupType(catName, categoryConfig);
  if (group === 'ICT') return 1;
  if (group === 'DICH_VU') return 2;
  return 3; // DMX
};

export const getCategoryBadgeStyleClasses = (catName: string, categoryConfig?: CategoryConfigItem[]): { bgText: string; hover: string } => {
  const group = getCategoryGroupType(catName, categoryConfig);
  if (group === 'ICT') {
    return { bgText: 'bg-[#f59e0b] text-black', hover: 'hover:bg-[#d97706]' };
  }
  if (group === 'DICH_VU') {
    return { bgText: 'bg-[#10b981] text-white', hover: 'hover:bg-[#059669]' };
  }
  // DMX
  return { bgText: 'bg-[#2563eb] text-white', hover: 'hover:bg-[#1d4ed8]' };
};

export const parseStaffMatrixDataRefined = (
  input: string, 
  staffCount: number, 
  categoryTargets: any[], 
  luykeCategories: CategoryData[], 
  daysPassed: number, 
  totalDays: number,
  sortAlpha: boolean = false,
  categoryConfig?: CategoryConfigItem[]
): { staffMatrix: StaffMatrixData[], categories: string[] } => {
  const raw = input.trim();
  if (!raw) return { staffMatrix: [], categories: [] };

  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return { staffMatrix: [], categories: [] };

  const excludedKeywords = [
    'bp all in one', 'bp trưởng ca', 'bp truong ca', 'hỗ trợ bi', 'ho tro bi',
    'copyright', 'dashboard', 'bc ', 'hd sử dụng', 'hd su dung', 'trang chủ',
    'trang chu', 'báo cáo', 'bao cao', 'khối kinh doanh', 'khoi kinh doanh',
    'logo bi', 'avatar', 'phòng ban', 'phong ban'
  ];

  const isEmpNameStr = (str: string) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    if (excludedKeywords.some(ex => lower.includes(ex))) return false;
    return /[-–—]\s*\d{4,8}\b/.test(str) || /\b\d{4,8}\s*[-–—]/.test(str) || (str.includes(' - ') && /\d/.test(str));
  };

  // 1. Detect if input is 2D Tab-delimited Table (Horizontal category headers)
  let is2DTable = false;
  let headerLineIdx = -1;
  let firstEmpLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('\t').map(p => p.trim());
    if (parts.some(p => isEmpNameStr(p))) {
      firstEmpLineIdx = i;
      break;
    }
  }

  if (firstEmpLineIdx > 0) {
    const prevParts = lines[firstEmpLineIdx - 1].split('\t').map(p => p.trim());
    if (prevParts.length >= 2) {
      is2DTable = true;
      headerLineIdx = firstEmpLineIdx - 1;
      if (firstEmpLineIdx >= 2) {
        const lineMinus2Parts = lines[firstEmpLineIdx - 2].split('\t').map(p => p.trim());
        if (lineMinus2Parts.length >= 2 && lineMinus2Parts.some(p => p.length > 2 && !/^(DTLK|SLLK|SL|DT|Realtime|\s)+$/i.test(p))) {
          headerLineIdx = firstEmpLineIdx - 2;
        }
      }
    }
  }

  let inputCategories: string[] = [];
  const categoryToColIdx: Map<string, number> = new Map();
  const staffMatrixResults: any[] = [];

  if (is2DTable && headerLineIdx !== -1) {
    const headerParts = lines[headerLineIdx].split('\t').map(p => p.trim());
    
    const empParts = lines[firstEmpLineIdx].split('\t').map(p => p.trim());
    let empColIdx = empParts.findIndex(p => isEmpNameStr(p));
    if (empColIdx === -1) empColIdx = 0;

    let colPos = 0;
    for (let c = empColIdx + 1; c < headerParts.length; c++) {
      let catName = headerParts[c];
      if (!catName || /^[\d\s,.-]+$/.test(catName) || /^(DTLK|SLLK|SL|DT|Realtime|\s)+$/i.test(catName)) {
        colPos++;
        continue;
      }

      const lowerCatName = catName.toLowerCase();
      const normCat = lowerCatName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
      const isExcluded = excludedKeywords.some(ex => lowerCatName.includes(ex)) ||
        ((lowerCatName.includes('tổng') || lowerCatName.includes('tong')) && cleanCategoryName(catName) !== 'simtong') ||
        normCat.includes('doanh thu') || normCat.includes('dtqd') || normCat.includes('thu nhap') || normCat.includes('gio cong') || normCat.includes('ty le');

      if (isExcluded) {
        colPos++;
        continue;
      }

      const targetMatch = catName.match(/(.+?)\bTARGET\b/i);
      if (targetMatch) catName = targetMatch[1].trim();

      const cleanName = cleanCategoryName(catName);
      if (cleanName && !categoryToColIdx.has(cleanName)) {
        categoryToColIdx.set(cleanName, colPos);
        inputCategories.push(catName);
      }
      colPos++;
    }

    for (let i = firstEmpLineIdx; i < lines.length; i++) {
      const parts = lines[i].split('\t').map(p => p.trim());
      let nameIdx = parts.findIndex(p => isEmpNameStr(p));
      if (nameIdx === -1) continue;

      const namePart = parts[nameIdx];
      const nameIdParts = namePart.split(' - ').map(s => s.trim());
      const name = nameIdParts[0] || namePart;
      const id = nameIdParts[1] || '';

      const nameWords = name.trim().split(' ');
      const shortName = nameWords[nameWords.length - 1].toUpperCase();

      const rawInputValues = parts.slice(nameIdx + 1).map(v => {
        if (!v || v.trim() === '') return 0;
        const clean = v.replace(/,/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      });

      staffMatrixResults.push({
        rawLine: lines[i],
        id,
        name,
        shortName,
        parts: rawInputValues
      });
    }
  } else {
    let headerStartIdx = -1;
    let dataStartIdx = -1;
    let colPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'Phòng ban') {
        headerStartIdx = i;
        continue;
      }
      if (headerStartIdx !== -1 && isEmpNameStr(lines[i])) {
        dataStartIdx = i;
        break;
      }
      if (headerStartIdx !== -1) {
        let catName = lines[i].trim();
        const isColumnTypesLine = /^(DTLK|SLLK|SL|DT|Realtime|REALTIME|\s)+$/i.test(catName);
        const isOnlyNumbers = /^[\d\s,.-]+$/.test(catName);
        const lowerCatName = catName.toLowerCase();
        const isExcluded = excludedKeywords.some(ex => lowerCatName.includes(ex)) ||
          ((lowerCatName.includes('tổng') || lowerCatName.includes('tong')) && cleanCategoryName(catName) !== 'simtong');

        if (isColumnTypesLine || isOnlyNumbers || isExcluded) {
          colPosition++;
          continue;
        }

        const targetMatch = catName.match(/(.+?)\bTARGET\b/i);
        if (targetMatch) catName = targetMatch[1].trim();
        
        const cleanName = cleanCategoryName(catName);
        if (!categoryToColIdx.has(cleanName)) {
          categoryToColIdx.set(cleanName, colPosition);
        }
        inputCategories.push(catName);
        colPosition++;
      }
    }

    const dataLines = dataStartIdx !== -1 ? lines.slice(dataStartIdx) : lines.filter(l => isEmpNameStr(l));

    for (const line of dataLines) {
      let parts = line.split('\t').map(p => p.trim());
      if (parts.length < 3) {
        parts = line.split(/ {2,}/).map(p => p.trim()).filter(p => p.length > 0);
      }
      let nameIdx = parts.findIndex(p => isEmpNameStr(p));
      if (nameIdx === -1) continue;

      const namePart = parts[nameIdx];
      const nameIdParts = namePart.split(' - ').map(s => s.trim());
      const name = nameIdParts[0] || namePart;
      const id = nameIdParts[1] || '';

      const nameWords = name.trim().split(' ');
      const shortName = nameWords[nameWords.length - 1].toUpperCase();

      const rawInputValues = parts.slice(nameIdx + 1).map(v => {
        if (!v || v.trim() === '') return 0;
        const clean = v.replace(/,/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
      });

      staffMatrixResults.push({
        rawLine: line,
        id,
        name,
        shortName,
        parts: rawInputValues
      });
    }
  }

  let resolvedCategories: string[] = [];
  if (luykeCategories && luykeCategories.length > 0) {
    const seen = new Set<string>();
    luykeCategories.forEach(c => {
      const clean = cleanCategoryName(c.name);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        resolvedCategories.push(c.name);
      }
    });
  } else if (categoryTargets && categoryTargets.length > 0) {
    const seen = new Set<string>();
    categoryTargets.forEach(t => {
      const clean = cleanCategoryName(t.name);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        resolvedCategories.push(t.name);
      }
    });
  } else {
    const seen = new Set<string>();
    inputCategories.forEach(catName => {
      const clean = cleanCategoryName(catName);
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        resolvedCategories.push(catName);
      }
    });
  }

  // Sort categories by exact custom order specified by user
  resolvedCategories.sort((a, b) => getCustomCategoryIndex(a, categoryConfig) - getCustomCategoryIndex(b, categoryConfig));

  const targetPerStaffPerCat: Record<string, number> = {};
  if (luykeCategories && luykeCategories.length > 0) {
    luykeCategories.forEach((cat: any) => {
      const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(cat.name));
      const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
        ? matchingTarget.adjustedTarget
        : (matchingTarget?.target || cat.target || 0);
      targetPerStaffPerCat[cleanCategoryName(cat.name)] = staffCount > 0 ? baseTarget / staffCount : baseTarget;
    });
  } else if (categoryTargets && categoryTargets.length > 0) {
    categoryTargets.forEach((cat: any) => {
      const baseTarget = (typeof cat.adjustedTarget === 'number')
        ? cat.adjustedTarget
        : (cat.target || 0);
      targetPerStaffPerCat[cleanCategoryName(cat.name)] = staffCount > 0 ? baseTarget / staffCount : baseTarget;
    });
  }

  const results: StaffMatrixData[] = [];

  for (const staffRow of staffMatrixResults) {
    const rawInputValues = staffRow.parts || [];
    const values: number[] = [];
    const projectedRates: number[] = [];
    const actualPercentHTs: number[] = [];
    let achievedCount = 0;

    resolvedCategories.forEach((catName) => {
      const cleanName = cleanCategoryName(catName);
      const colIdx = categoryToColIdx.get(cleanName);
      const accumulated = (colIdx !== undefined && colIdx < rawInputValues.length) ? (rawInputValues[colIdx] || 0) : 0;
      values.push(accumulated);

      const target = targetPerStaffPerCat[cleanName] || 0;
      
      let actualRate = 0;
      if (target > 0) {
        actualRate = (accumulated / target) * 100;
      } else if (accumulated > 0) {
        actualRate = 100;
      }
      actualPercentHTs.push(actualRate);
      
      let projectedRate = 0;
      if (target > 0 && daysPassed > 0) {
        projectedRate = ((accumulated / daysPassed) * totalDays) / target * 100;
      } else {
        projectedRate = actualRate;
      }
      projectedRates.push(projectedRate);
      
      const effectiveRate = daysPassed > 0 ? projectedRate : actualRate;
      if (Math.round(effectiveRate) >= 100) achievedCount++;
    });

    results.push({
      displayName: `${staffRow.id} - ${staffRow.name.toUpperCase()}`,
      fullId: staffRow.id,
      shortName: `${staffRow.id} - ${staffRow.shortName}`,
      achieved: achievedCount,
      achievedCount: achievedCount,
      totalCats: resolvedCategories.length,
      rate: resolvedCategories.length > 0 ? achievedCount / resolvedCategories.length : 0, 
      rawValues: values,
      projectedRates,
      actualPercentHTs
    } as any);
  }

  return { staffMatrix: results, categories: resolvedCategories };
};

interface SummaryThiDuaTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  selectedStaffIds?: string[];
  categoryTargets: any[];
  luykeCategories: CategoryData[];
  categoryConfig?: CategoryConfigItem[];
}

const SummaryThiDuaTable: React.FC<SummaryThiDuaTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  selectedStaffIds,
  categoryTargets,
  luykeCategories,
  categoryConfig
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCopyingAll, setIsCopyingAll] = useState(false);
  const [visibleCategories, setVisibleCategories] = useState<string[]>([]);
  const [catSearchTerm, setCatSearchTerm] = useState('');
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useAuth();
  const { setCategoryTargets, saveLuykeData, activeStore } = useLuykeData();
  const isAdmin = userProfile?.username === '43751';

  const [draggedCat, setDraggedCat] = useState<string | null>(null);

  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = yesterdayObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  const handleDragStart = (e: React.DragEvent, catName: string) => {
    e.dataTransfer.setData('text/plain', catName);
    setDraggedCat(catName);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetCatName: string) => {
    e.preventDefault();
    const sourceCatName = e.dataTransfer.getData('text/plain') || draggedCat;
    if (!sourceCatName || sourceCatName === targetCatName) return;

    const newTargets = [...categoryTargets];
    const sourceClean = cleanCategoryName(sourceCatName);
    const targetClean = cleanCategoryName(targetCatName);
    const sourceIdx = newTargets.findIndex(t => cleanCategoryName(t.name) === sourceClean);
    const targetIdx = newTargets.findIndex(t => cleanCategoryName(t.name) === targetClean);
    
    if (sourceIdx !== -1 && targetIdx !== -1) {
      const [removed] = newTargets.splice(sourceIdx, 1);
      newTargets.splice(targetIdx, 0, removed);
      
      setCategoryTargets(newTargets);
      
      if (saveLuykeData) {
        await saveLuykeData(false, 'targets', activeStore, newTargets);
      }
    }
    setDraggedCat(null);
  };
  
  const [isCatsSortedAlpha, setIsCatsSortedAlpha] = useState(false);
  const [sortColumn, setSortColumn] = useState<{
    type: 'default' | 'name' | 'achieved' | 'rate' | 'category';
    catName?: string;
    ascending: boolean;
  }>({
    type: 'default',
    ascending: false
  });

  // Use passed luykeCategories (BC THÁNG displayed data) for staffMatrix calculation
  const { staffMatrix, categories } = parseStaffMatrixDataRefined(
    thiDuaNv || '', 
    staffCount, 
    categoryTargets, 
    luykeCategories, 
    daysPassed, 
    totalDays,
    false,
    categoryConfig
  );

  const sortedStaffMatrix = React.useMemo(() => {
    const matrix = [...staffMatrix];
    
    if (sortColumn.type === 'default') {
      return matrix.sort((a, b) => b.rate - a.rate);
    }
    
    if (sortColumn.type === 'name') {
      return matrix.sort((a, b) => {
        const cmp = a.displayName.localeCompare(b.displayName, 'vi');
        return sortColumn.ascending ? cmp : -cmp;
      });
    }
    
    if (sortColumn.type === 'achieved') {
      return matrix.sort((a, b) => {
        const getAchieved = (staff: StaffMatrixData) => {
          return categories.reduce((count, catName, idx) => {
            if (!visibleCategories.includes(catName)) return count;
            const projectedRate = staff.projectedRates[idx] || 0;
            return Math.round(projectedRate) >= 100 ? count + 1 : count;
          }, 0);
        };
        const valA = getAchieved(a);
        const valB = getAchieved(b);
        return sortColumn.ascending ? valA - valB : valB - valA;
      });
    }
    
    if (sortColumn.type === 'rate') {
      return matrix.sort((a, b) => {
        const getRate = (staff: StaffMatrixData) => {
          const visibleAchieved = categories.reduce((count, catName, idx) => {
            if (!visibleCategories.includes(catName)) return count;
            const projectedRate = staff.projectedRates[idx] || 0;
            return Math.round(projectedRate) >= 100 ? count + 1 : count;
          }, 0);
          return visibleCategories.length > 0 ? visibleAchieved / visibleCategories.length : 0;
        };
        const valA = getRate(a);
        const valB = getRate(b);
        return sortColumn.ascending ? valA - valB : valB - valA;
      });
    }
    
    if (sortColumn.type === 'category' && sortColumn.catName) {
      const catIdx = categories.indexOf(sortColumn.catName);
      return matrix.sort((a, b) => {
        const valA = catIdx !== -1 ? (a.projectedRates[catIdx] || 0) : 0;
        const valB = catIdx !== -1 ? (b.projectedRates[catIdx] || 0) : 0;
        return sortColumn.ascending ? valA - valB : valB - valA;
      });
    }
    
    return matrix;
  }, [staffMatrix, sortColumn, categories, visibleCategories]);

  const handleHeaderClick = (type: 'default' | 'name' | 'achieved' | 'rate' | 'category', catName?: string) => {
    setSortColumn(prev => {
      if (prev.type === type && prev.catName === catName) {
        return { type, catName, ascending: !prev.ascending };
      }
      return { type, catName, ascending: false };
    });
  };

  const renderSortIcon = (type: 'default' | 'name' | 'achieved' | 'rate' | 'category', catName?: string) => {
    const isActive = sortColumn.type === type && sortColumn.catName === catName;
    if (!isActive) return <span className="opacity-30 ml-1 text-[10px] select-none">↕</span>;
    return sortColumn.ascending ? <span className="ml-1 text-[10px] select-none">▲</span> : <span className="ml-1 text-[10px] select-none">▼</span>;
  };

  const getTargetPerStaff = (catName: string) => {
    const lkCat = luykeCategories.length > 0
      ? luykeCategories.find((c: any) => cleanCategoryName(c.name) === cleanCategoryName(catName))
      : null;
    const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(catName));
    const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
      ? matchingTarget.adjustedTarget
      : (lkCat ? lkCat.target : 0);
    return staffCount > 0 ? baseTarget / staffCount : 0;
  };
  
  // Initialize visible categories when categories load or change
  const serializedCats = JSON.stringify(categories);
  React.useEffect(() => {
    if (categories.length > 0) {
      const savedKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedVal = localStorage.getItem(savedKey);
      if (savedVal !== null) {
        try {
          const parsed = JSON.parse(savedVal);
          if (Array.isArray(parsed)) {
            // Filter to ensure only categories currently available are visible
            const validSaved = parsed.filter((c: string) => categories.includes(c));
            if (validSaved.length > 0) {
              setVisibleCategories(validSaved);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setVisibleCategories(categories);
    }
  }, [serializedCats, activeStore]);

  // Save selected categories when selection changes
  React.useEffect(() => {
    if (categories.length > 0 && visibleCategories.length > 0) {
      const savedKey = `EH_VISIBLE_CATEGORIES_${activeStore || 'GLOBAL'}`;
      localStorage.setItem(savedKey, JSON.stringify(visibleCategories));
    }
  }, [visibleCategories, categories, activeStore]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(event.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const toggleCategory = (cat: string) => {
    setVisibleCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const filteredCatList = categories.filter(cat =>
    cat.toLowerCase().includes(catSearchTerm.toLowerCase())
  );

  const filteredStaffMatrix = selectedStaffIds && selectedStaffIds.length > 0 
    ? sortedStaffMatrix.filter(s => selectedStaffIds.includes(s.fullId))
    : sortedStaffMatrix;

  const handleCopyStaff = (staff: StaffMatrixData) => {
    let text = `📊 BÁO CÁO THI ĐUA: ${staff.shortName}\n`;
    text += `✅ ĐẠT: ${staff.achieved}/${staff.totalCats} chỉ tiêu\n`;
    text += `📈 TỶ LỆ: ${(staff.rate * 100).toFixed(1)}%\n\n`;
    text += `CHI TIẾT % DỰ KIẾN:\n`;

    categories.forEach((catName, idx) => {
      const rate = staff.projectedRates[idx];
      const roundedRate = Math.round(rate);
      text += `- ${catName}: ${roundedRate}% ${roundedRate >= 100 ? '✅' : '⚠️'}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(staff.fullId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleCopyAll = () => {
    if (filteredStaffMatrix.length === 0) return;
    setIsCopyingAll(true);

    const total = filteredStaffMatrix.length;
    const count20 = Math.max(1, Math.round(total * 0.2));
    
    const top20 = filteredStaffMatrix.slice(0, count20);
    // Get bottom 20%, but ensure we don't overlap if total is small
    const bottom20 = filteredStaffMatrix.slice(Math.max(count20, total - count20));

    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    let text = `🌟 TỔNG HỢP THI ĐUA SIÊU THỊ (${dateStr}):\n\n`;
    
    filteredStaffMatrix.forEach((staff, sIdx) => {
      const ratePercent = (staff.rate * 100).toFixed(0);
      text += `${sIdx + 1}. ${staff.shortName} (${ratePercent}%)\n`;
    });

    text += `\n🏆 TOP 20% DẪN ĐẦU:\n`;
    top20.forEach(s => text += `- ${s.shortName} (${(s.rate * 100).toFixed(0)}%)\n`);

    text += `\n⚠️ BOTTOM 20% CẦN CỐ GẮNG:\n`;
    bottom20.forEach(s => text += `- ${s.shortName} (${(s.rate * 100).toFixed(0)}%)\n`);

    text += `\nChúc các bạn bứt phá mạnh mẽ trong các ngày còn lại! 💪`;

    navigator.clipboard.writeText(text).then(() => {
      setTimeout(() => setIsCopyingAll(false), 2000);
    });
  };

  const handleExport = async () => {
    if (tableRef.current) {
      const originalElement = tableRef.current;
      
      // Create a temporary container to hold the clone
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '15000px'; // Extremely wide to prevent wrapping
      container.style.height = 'auto';
      container.style.overflow = 'visible';
      container.style.zIndex = '-9999';
      container.style.pointerEvents = 'none';
      
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Hide buttons/controls inside the clone
      const noCaptureElements = clone.querySelectorAll('.no-capture, button');
      noCaptureElements.forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
      
      // Set clone styling to take full layout unconstrained
      clone.style.width = 'max-content';
      clone.style.height = 'auto';
      clone.style.margin = '0';
      clone.style.padding = '32px'; // 32px white border all around
      clone.style.backgroundColor = '#ffffff';
      clone.style.display = 'inline-block';
      clone.style.overflow = 'visible';
      clone.style.overflowX = 'visible';
      clone.style.overflowY = 'visible';
      
      // Make sure overflow wrappers in the clone are visible
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.width = 'auto';
        htmlEl.style.height = 'auto';
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

      const originalTable = originalElement.querySelector('table');
      const table = clone.querySelector('table') as HTMLTableElement;
      if (table && originalTable) {
        table.style.width = 'max-content';
        table.style.minWidth = 'max-content';
        table.style.tableLayout = 'auto';
        
        let parent = table.parentElement;
        while (parent && parent !== clone) {
          parent.style.width = 'max-content';
          parent.style.minWidth = '100%';
          parent.style.maxWidth = 'none';
          parent = parent.parentElement;
        }
      }

      container.appendChild(clone);
      document.body.appendChild(container);

      try {
        await new Promise(resolve => setTimeout(resolve, 200));

        const dataUrl = await domToPng(clone, {
          backgroundColor: '#ffffff',
          scale: 2,
          width: clone.scrollWidth,
          height: clone.scrollHeight,
        });

        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        document.body.removeChild(container);
      }
    }
  };

  return (
    <div ref={tableRef} className="card-thi-dua bg-white rounded-[16px] shadow-sm p-4 md:p-6 border border-slate-200" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex flex-row items-center justify-between w-full border-b border-slate-200 pb-4 mb-4">
        <div className="flex flex-row items-center justify-between w-full border border-slate-200 rounded-xl py-4 bg-slate-50/30">
          <div className="flex flex-col items-center justify-center w-1/2 border-r border-slate-200">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">TỔNG HỢP THI ĐUA</h2>
            <div className="flex items-center gap-2 text-slate-600 mt-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M3 7h18"/></svg>
              <span className="text-sm font-bold">LUỸ KẾ ĐẾN NGÀY : {yesterdayStr}</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center w-1/2">
            <h2 className="text-2xl font-black text-rose-600 uppercase tracking-tight">DỰ KIẾN</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">

          {/* Category Filter Dropdown */}
          <div className="relative" ref={catDropdownRef}>
            <button
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all min-w-[180px] justify-between shadow-sm"
            >
              <span className="truncate">
                {visibleCategories.length === categories.length
                  ? "Tất cả ngành hàng"
                  : visibleCategories.length === 0
                    ? "Chưa chọn NH"
                    : `${visibleCategories.length}/${categories.length} NH`}
              </span>
              <ChevronDown size={14} className={cn("transition-transform text-slate-400", isCatDropdownOpen && "rotate-180")} />
            </button>

            {isCatDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden">
                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm ngành hàng..."
                      value={catSearchTerm}
                      onChange={(e) => setCatSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                    />
                  </div>
                </div>
                <div className="p-2 border-b border-slate-100 flex items-center justify-between px-4">
                  <button
                    onClick={() => setVisibleCategories([...categories])}
                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => setVisibleCategories([])}
                    className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredCatList.map(cat => (
                    <label
                      key={cat}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        visibleCategories.includes(cat)
                          ? "bg-indigo-600 border-indigo-600"
                          : "border-slate-200 group-hover:border-slate-300 bg-white"
                      )}>
                        {visibleCategories.includes(cat) && <Check size={12} className="text-white stroke-[3px]" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={visibleCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-wider transition-colors",
                        visibleCategories.includes(cat) ? "text-indigo-600" : "text-slate-600"
                      )}>
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={handleCopyAll}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase transition-all",
              isCopyingAll ? "bg-emerald-100 text-emerald-600 border border-emerald-200" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {isCopyingAll ? <Check size={16} /> : <MessageSquare size={16} />}
            {isCopyingAll ? "ĐÃ COPY" : "COPY BÁO CÁO"}
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase hover:bg-indigo-700 transition-colors"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse table-fixed" style={{ border: '1px solid #e2e8f0', fontWeight: 900 }}>
          <thead>
            <tr className="text-slate-900 h-[85px]">
              <th 
                className="px-1 py-1 text-[13px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none"
                style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
              >
                STT
              </th>
              <th 
                className="px-3 py-1 text-[13px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none"
                style={{ width: '320px', minWidth: '320px', maxWidth: '320px' }}
              >
                NHÂN VIÊN
              </th>
              <th 
                className="px-1 py-1 text-[11px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none"
                style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
              >
                ĐẠT
              </th>
              <th 
                className="px-1 py-1 text-[11px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none"
                style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
              >
                TỶ LỆ
              </th>
              {categories.filter(catName => visibleCategories.includes(catName)).map(catName => (
                <React.Fragment key={catName}>
                  <th 
                    className={cn(
                      "px-1 py-1 text-[12px] font-black uppercase tracking-tight text-center border border-white/20 select-none",
                      getCategoryBadgeStyleClasses(catName, categoryConfig).bgText
                    )}
                    style={{
                      width: '70px',
                      minWidth: '70px',
                      maxWidth: '70px',
                      wordBreak: 'break-word',
                      whiteSpace: 'normal',
                    }}
                  >
                    {catName}
                  </th>
                  {cleanCategoryName(catName) === 'maylanhdacquyen' && (
                    <th className="bg-white border border-white/20" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}></th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredStaffMatrix.map((staff, index) => {
              const visibleAchieved = categories.reduce((count, catName, idx) => {
                if (!visibleCategories.includes(catName)) return count;
                const projectedRate = staff.projectedRates[idx] || 0;
                return Math.round(projectedRate) >= 100 ? count + 1 : count;
              }, 0);
              const visibleRate = visibleCategories.length > 0 ? visibleAchieved / visibleCategories.length : 0;
              const isBelowHalf = visibleRate < 0.5;
              const ratePercentStr = `${(visibleRate * 100).toFixed(1)}%`;

              return (
                <tr key={staff.fullId} className={cn("hover:bg-slate-50 transition-colors h-[40px]", staff.displayName.includes('30016') ? 'border-b border-slate-200' : '')}>
                  <td className="px-2 py-0 text-center border border-slate-200 bg-[#d1fae5] text-slate-900 font-black text-[15px] truncate">
                    {index + 1}
                  </td>
                  <td className="px-3 py-0 border border-slate-200 text-[15px] font-black uppercase tracking-tight text-slate-700">
                    <div className="flex items-center justify-between group h-full">
                      <span>{staff.displayName}</span>
                      <button 
                        onClick={() => handleCopyStaff(staff)}
                        className={cn(
                          "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100",
                          copiedId === staff.fullId ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:text-indigo-600"
                        )}
                      >
                        {copiedId === staff.fullId ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-0 text-[15px] font-black text-center border border-slate-200 bg-[#ecfdf5] text-[#065f46]">
                    {visibleAchieved}/{visibleCategories.length}
                  </td>
                  <td className={cn(
                    "px-1 py-0 text-[15px] font-black text-center border border-slate-200 bg-[#ecfdf5]",
                    isBelowHalf ? "text-[#b91c1c]" : "text-[#065f46]"
                  )}>
                    {ratePercentStr}
                  </td>
                {categories.map((catName, idx) => {
                  if (!visibleCategories.includes(catName)) return null;
                  const projectedRate = staff.projectedRates[idx] || 0;
                  const roundedRate = Math.round(projectedRate);
                  return (
                    <React.Fragment key={idx}>
                      <td className={cn(
                          "px-1 py-0 text-[15px] font-black text-center border border-slate-200 truncate",
                          roundedRate >= 100 ? "text-[#047857]" : "text-[#b91c1c]"
                      )}>
                          {roundedRate}%
                      </td>
                      {cleanCategoryName(catName) === 'maylanhdacquyen' && (
                        <td className="bg-white border border-slate-200"></td>
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative bg-white rounded-2xl max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Ảnh chụp màn hình</h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-center">
              <p className="text-[13px] font-black text-amber-800 uppercase tracking-wide flex items-center gap-2">
                <span className="text-lg">💡</span> Mẹo: Nhấp chuột phải (hoặc nhấn giữ trên điện thoại) vào ảnh và chọn "Sao chép hình ảnh"
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[50vh] overflow-hidden">
              <img src={previewImage} alt="Preview" className="max-w-full max-h-[calc(90vh-120px)] object-contain shadow-sm rounded-xl border border-slate-200" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SummaryThiDuaTable);
