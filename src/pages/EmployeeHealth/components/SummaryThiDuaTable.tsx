import React, { useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { parseCategoryData, cn, cleanCategoryName } from '../../RTST/utils';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { Download, Copy, Check, MessageSquare, MessageCircle, ChevronDown, Search, X, Sparkles } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { useAuth } from '../../../contexts/AuthContext';
import { useLuykeData } from '../../RTST/hooks/useLuykeData';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../../../components/CaptureLoadingOverlay';

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

export const getCategoryBadgeStyleClasses = (catName: string, categoryConfig?: CategoryConfigItem[]): { bgText: string; hover: string; gradient: string } => {
  const group = getCategoryGroupType(catName, categoryConfig);
  if (group === 'ICT') {
    // Soft amber/gold gradient - light tone
    return { bgText: 'text-amber-900', hover: 'hover:bg-[#fef3c7]', gradient: 'linear-gradient(135deg, #fef9c3, #fde68a, #fcd34d)' };
  }
  if (group === 'DICH_VU') {
    // Soft emerald gradient - light tone
    return { bgText: 'text-emerald-900', hover: 'hover:bg-[#d1fae5]', gradient: 'linear-gradient(135deg, #d1fae5, #a7f3d0, #6ee7b7)' };
  }
  // DMX - Soft blue gradient - light tone
  return { bgText: 'text-blue-900', hover: 'hover:bg-[#dbeafe]', gradient: 'linear-gradient(135deg, #dbeafe, #bfdbfe, #93c5fd)' };
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
  const [isCapturing, setIsCapturing] = useState(false);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [copiedComment, setCopiedComment] = useState(false);
  const [commentTemplate, setCommentTemplate] = useState<1 | 2 | 3>(1);
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
    let text = `🌟 TỔNG HỢP THI ĐUA NHÂN VIÊN (${dateStr}):\n\n`;
    
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

  const generateThiDuaComment = (template: 1 | 2 | 3 = 1) => {
    if (filteredStaffMatrix.length === 0) return;
    const total = filteredStaffMatrix.length;
    const count20 = Math.max(1, Math.round(total * 0.2));
    const top20 = filteredStaffMatrix.slice(0, count20);
    const bottom20 = filteredStaffMatrix.slice(Math.max(count20, total - count20));

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

    let text = '';

    if (template === 1) {
      // MẪU 1: TOP/BOT ST
      text = `📊 TỔNG HỢP THI ĐUA NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📈 KẾT QUẢ TỔNG QUAN:\n`;
      text += `🎯 Tổng NV: ${total} || ĐẠT trên 50%: ${filteredStaffMatrix.filter(s => s.rate >= 0.5).length}/${total}\n\n`;
      text += `🏆 TOP ${count20} DẪN ĐẦU:\n`;
      top20.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        text += `🔺 #${i + 1}. @${staffId}\n`;
      });
      text += `\n⚠️ BOTTOM ${count20} CẦN TĂNG TỐC:\n`;
      bottom20.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        text += `🔻 #${total - bottom20.length + i + 1}. @${staffId}\n`;
      });
      text += `\n💪 Hãy cố gắng bứt phá trong các ngày còn lại! 🔥`;
    } else if (template === 2) {
      // MẪU 2: DS Cần tăng tốc
      const below50 = filteredStaffMatrix.filter(s => s.rate < 0.5);
      text = `⚠️ DS CẦN TĂNG TỐC THI ĐUA NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `📊 Tổng NV dưới 50%: ${below50.length}/${total}\n\n`;
      text += `🚨 DANH SÁCH CẦN CẢI THIỆN TIẾN ĐỘ:\n`;
      below50.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        const rateStr = (s.rate * 100).toFixed(0);
        text += `🔻 #${i + 1}. @${staffId}\n`;
      });
      text += `\n💡 Cần hỗ trợ các NV trên đẩy mạnh bán hàng và tăng cường tư vấn!`;
    } else {
      // MẪU 3: Tóm tắt toàn bộ
      text = `📝 TÓM TẮT THI ĐUA NHÂN VIÊN - ${timeStr} NGÀY ${dateStr}\n`;
      text += `━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🎯 Tổng NV: ${total}\n`;
      text += `✅ ĐẠT (>=100%): ${filteredStaffMatrix.filter(s => s.rate >= 1).length}/${total}\n`;
      text += `🟡 KHÁ (50-99%): ${filteredStaffMatrix.filter(s => s.rate >= 0.5 && s.rate < 1).length}/${total}\n`;
      text += `🔴 YẾU (<50%): ${filteredStaffMatrix.filter(s => s.rate < 0.5).length}/${total}\n\n`;
      text += `📊 BẢNG XẾP HẠNG ĐẦY ĐỦ:\n`;
      filteredStaffMatrix.forEach((s, i) => {
        const staffId = s.shortName.split(' - ')[0] || s.shortName;
        const rateStr = (s.rate * 100).toFixed(0);
        const icon = s.rate >= 1 ? '✅' : s.rate >= 0.5 ? '🟡' : '🔴';
        text += `${icon} #${i + 1}. @${staffId}\n`;
      });
    }

    setCommentText(text);
    setCommentTemplate(template);
    setCopiedComment(false);
    return text;
  };

  const handleExport = async () => {
    if (tableRef.current) {
      setIsCapturing(true);
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

      // Remove sticky-column positioning (causes rendering issues in capture)
      clone.querySelectorAll('.sticky-col, [class*="sticky-col"]').forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.position = 'relative';
        htmlEl.style.left = 'auto';
        htmlEl.style.zIndex = 'auto';
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
        setIsCapturing(false);
      }
    }
  };

  return (
    <div ref={tableRef} className="card-thi-dua bg-white rounded-2xl border border-slate-200/80 overflow-hidden" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      {/* ═══ Premium Gradient Banner Header (like BẢNG XẾP HẠNG DOANH THU) ═══ */}
      <div className="relative bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] px-5 md:px-8 py-5 md:py-6">
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="text-[26px] sm:text-[32px] md:text-[36px] font-black text-[#FEF08A] uppercase tracking-wide leading-tight" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900, textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            TỔNG HỢP THI ĐUA
          </h2>
          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-3 mt-2 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              ✨ Luỹ kế dự kiến đến ngày: {yesterdayStr}
            </span>
            <span className="opacity-60">||</span>
            <span className="text-[#FEF08A] font-extrabold whitespace-nowrap uppercase">
              DỰ KIẾN
            </span>
          </div>
        </div>

        {/* Action Buttons - positioned top-right */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {/* Category Filter Dropdown */}
          <div className="relative no-capture" ref={catDropdownRef}>
            <button
              onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 border border-white/25 rounded-xl text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md transition-all min-w-[100px] justify-between cursor-pointer"
            >
              <span className="truncate">
                {visibleCategories.length === categories.length
                  ? "Tất cả NH"
                  : visibleCategories.length === 0
                    ? "Chưa chọn"
                    : `${visibleCategories.length}/${categories.length} NH`}
              </span>
              <ChevronDown size={12} className={cn("transition-transform text-white/70", isCatDropdownOpen && "rotate-180")} />
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
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold focus:ring-2 focus:ring-emerald-500/30 outline-none uppercase"
                    />
                  </div>
                </div>
                <div className="p-2 border-b border-slate-100 flex items-center justify-between px-4">
                  <button
                    onClick={() => setVisibleCategories([...categories])}
                    className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    onClick={() => setVisibleCategories([])}
                    className="text-[10px] font-black uppercase text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredCatList.map(cat => (
                    <label
                      key={cat}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 cursor-pointer transition-colors group"
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                        visibleCategories.includes(cat)
                          ? "bg-emerald-600 border-emerald-600"
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
                        visibleCategories.includes(cat) ? "text-emerald-700" : "text-slate-600"
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
            onClick={() => {
              generateThiDuaComment(commentTemplate);
              setIsCommentOpen(true);
            }}
            className="no-capture flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-95"
          >
            <Sparkles size={12} className="animate-pulse" />
            <span>NHẬN XÉT</span>
          </button>
          <button 
            onClick={handleExport}
            className="no-capture flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/25 rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer"
          >
            <Download size={12} />
            <span>XUẤT ẢNH</span>
          </button>
        </div>
      </div>

      {/* ═══ Table ═══ */}
      <div className="overflow-x-auto mobile-table-scroll" style={{ '--sticky-col-1-width': '50px' } as React.CSSProperties}>
        <table className="w-full border-collapse table-fixed responsive-data-table" style={{ border: '1px solid #e2e8f0', fontWeight: 900 }}>
          <thead>
            <tr className="text-slate-900 h-[85px]">
              <th
                className="sticky-col sticky-col-1 px-1 py-1 text-[13px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none cursor-pointer"
                style={{ width: '50px', minWidth: '50px', maxWidth: '50px' }}
                onClick={() => handleHeaderClick('default')}
              >
                STT{renderSortIcon('default')}
              </th>
              <th
                className="sticky-col sticky-col-2 px-3 py-1 text-[13px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none cursor-pointer"
                style={{ width: '320px', minWidth: '320px', maxWidth: '320px' }}
                onClick={() => handleHeaderClick('name')}
              >
                NHÂN VIÊN{renderSortIcon('name')}
              </th>
              <th 
                className="px-1 py-1 text-[11px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none cursor-pointer"
                style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                onClick={() => handleHeaderClick('achieved')}
              >
                ĐẠT{renderSortIcon('achieved')}
              </th>
              <th 
                className="px-1 py-1 text-[11px] font-black uppercase tracking-tight text-center border border-white/20 bg-[#10b981] text-slate-900 select-none cursor-pointer"
                style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}
                onClick={() => handleHeaderClick('rate')}
              >
                TỶ LỆ{renderSortIcon('rate')}
              </th>
              {(() => {
                // Pre-compute group info for continuous gradient
                const visibleCats = categories.filter(catName => visibleCategories.includes(catName));
                const groupCounts: Record<string, number> = {};
                const groupIndices: Record<string, number> = {};
                visibleCats.forEach(catName => {
                  const group = getCategoryGroupType(catName, categoryConfig);
                  if (!groupCounts[group]) groupCounts[group] = 0;
                  groupIndices[catName] = groupCounts[group];
                  groupCounts[group]++;
                });

                return visibleCats.map(catName => {
                  const catStyle = getCategoryBadgeStyleClasses(catName, categoryConfig);
                  const group = getCategoryGroupType(catName, categoryConfig);
                  const total = groupCounts[group] || 1;
                  const idx = groupIndices[catName] || 0;
                  // Spread gradient across group width
                  const bgSize = `${total * 100}% 100%`;
                  const bgPos = `${total > 1 ? (idx / (total - 1)) * 100 : 0}% 0%`;
                  return (
                    <React.Fragment key={catName}>
                      <th 
                        className={cn(
                          "px-1 py-1 text-[12px] font-black uppercase tracking-tight text-center border border-white/20 select-none cursor-pointer",
                          catStyle.bgText
                        )}
                        style={{
                          width: '70px',
                          minWidth: '70px',
                          maxWidth: '70px',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          background: catStyle.gradient,
                          backgroundSize: bgSize,
                          backgroundPosition: bgPos,
                        }}
                        onClick={() => handleHeaderClick('category', catName)}
                      >
                        {catName}{renderSortIcon('category', catName)}
                      </th>
                      {cleanCategoryName(catName) === 'maylanhdacquyen' && (
                        <th className="bg-white border border-white/20" style={{ width: '40px', minWidth: '40px', maxWidth: '40px' }}></th>
                      )}
                    </React.Fragment>
                  );
                });
              })()}
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
                <tr key={staff.fullId} className={cn("group/row hover:bg-slate-50/70 transition-colors h-[40px]", staff.displayName.includes('30016') ? 'border-b border-slate-200' : '')}>
                  <td className="sticky-col sticky-col-1 px-2 py-0 text-center border border-slate-200 bg-[#d1fae5] text-slate-900 font-black text-[13px] truncate">
                    {index + 1}
                  </td>
                  <td className="sticky-col sticky-col-2 bg-white group-hover/row:bg-slate-50/70 px-3 py-0 border border-slate-200 text-[13px] font-black uppercase tracking-tight text-slate-700">
                    <div className="flex items-center justify-between group h-full">
                      <span className="sticky-col-cell-text">{staff.displayName}</span>
                      <button 
                        onClick={() => handleCopyStaff(staff)}
                        className={cn(
                          "p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer",
                          copiedId === staff.fullId ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:text-emerald-600"
                        )}
                      >
                        {copiedId === staff.fullId ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-0 text-[13px] font-black text-center border border-slate-200 bg-[#ecfdf5] text-[#065f46]">
                    {visibleAchieved}/{visibleCategories.length}
                  </td>
                  <td className={cn(
                    "px-1 py-0 text-[13px] font-black text-center border border-slate-200 bg-[#ecfdf5]",
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
                          "px-1 py-0 text-[13px] font-black text-center border border-slate-200 truncate",
                          roundedRate >= 100
                            ? "text-[#047857] bg-[#d1fae5]"  /* Xanh chữ + xanh nền */
                            : roundedRate >= 50
                              ? "text-slate-900 bg-white"      /* Đen chữ + trắng nền */
                              : "text-[#b91c1c] bg-[#fee2e2]"  /* Đỏ chữ + đỏ nhạt nền */
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

      {/* Comment Modal - Orange gradient design with template tabs */}
      {isCommentOpen && ReactDOM.createPortal(
        <div className="no-capture fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setIsCommentOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét thi đua
                </span>
              </div>
              <button onClick={() => setIsCommentOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {[
                  { id: 1 as const, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
                  { id: 2 as const, label: 'Mẫu 2: DS Cần tăng tốc', icon: '⚠️' },
                  { id: 3 as const, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCommentTemplate(tab.id);
                      generateThiDuaComment(tab.id);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border",
                      commentTemplate === tab.id
                        ? "bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide mt-2">
                Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
              </p>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={12}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              />
              <div className="flex items-center justify-between mt-4">
                <span className="text-[11px] font-bold text-slate-400 italic">
                  Sẵn sàng dán trực tiếp vào Zalo / Line / Teams
                </span>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(commentText);
                      setCopiedComment(true);
                      setTimeout(() => setCopiedComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Capture Loading Overlay */}
      <CaptureLoadingOverlay isLoading={isCapturing} />

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default React.memo(SummaryThiDuaTable);
