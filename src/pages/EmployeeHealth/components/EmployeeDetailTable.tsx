import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, Check, TrendingUp, MessageCircle, X, Copy, Swords } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { domToPng } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import { CaptureLoadingOverlay } from '../../../components/CaptureLoadingOverlay';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../../../utils/fontExportUtil';
import { parseCategoryData } from '../../RTST/utils';
import { cn } from '../../RTST/utils';
import { CategoryData, StaffMatrixData } from '../../RTST/types';
import { parseStaffMatrixDataRefined } from './SummaryThiDuaTable';
import { extractStaffNameAndId } from '../utils/staffParserHelper';

export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const cleanCategoryName = (name: string): string => {
  if (!name) return '';
  let namePart = name;
  const targetMatch = namePart.match(/(.+?)\bTARGET\b/i);
  if (targetMatch) {
    namePart = targetMatch[1];
  }
  let clean = removeAccents(namePart).trim();
  
  // Strip leading numbering like "1. ", "01. ", "1 - ", "01 - "
  clean = clean.replace(/^(\d+[\s.-]+)/, '');

  // Strip prefixes like "nnh " or "nh " at the start
  clean = clean.replace(/^(nnh|nh)\s+/, '');
  
  // Replace abbreviations
  clean = clean.replace(/\b(bao hiem)\b/g, 'bh');
  clean = clean.replace(/\b(dien may xanh)\b/g, 'dmx');
  clean = clean.replace(/\b(the gioi di dong)\b/g, 'tgdd');
  clean = clean.replace(/\b(gia dung)\b/g, 'gd');
  clean = clean.replace(/\b(phu kien)\b/g, 'pk');
  
  // Also replace inline occurrences
  clean = clean.replace(/bao\s+hiem/g, 'bh');
  clean = clean.replace(/dien\s+may\s+xanh/g, 'dmx');
  clean = clean.replace(/the\s+gioi\s+di\s+dong/g, 'tgdd');
  clean = clean.replace(/gia\s+dung/g, 'gd');
  clean = clean.replace(/phu\s+kien/g, 'pk');

  // Strip all non-alphanumeric characters
  return clean.replace(/[^a-z0-9]/g, '');
};

interface EmployeeDetailTableProps {
  staffName: string;
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[];
  luykeCategories?: CategoryData[];
  staffTargetQd?: number;
  staffDtqd?: number;
  staffPercentHT?: number;
  staffHieuQuaQd?: number | null;
  staffBonusHientai?: number | null;
  staffInstallmentPercent?: number | null;
  onPreviewImage?: (dataUrl: string) => void;
  onOpenCompare?: (staffId: string) => void;
}

// parseStaffMatrixDataRefined is imported from SummaryThiDuaTable

// ─── Generate sales coaching comment ────────────────────────────────────────
const generateComment = (catName: string, remaining: number, percentHT: number): string => {
  const remainStr = Math.abs(remaining).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const name = catName.toUpperCase();
  const pct = percentHT.toFixed(0);

  // Determine urgency level
  if (percentHT >= 80) {
    return `💪 Ngành ${name} đạt ${pct}%, chỉ còn ${remainStr} nữa là hoàn thành. Cố gắng tư vấn thêm cho khách nhé, sắp về đích rồi! 🎯`;
  } else if (percentHT >= 50) {
    return `⚡ Ngành ${name} mới đạt ${pct}%, còn thiếu ${remainStr}. Bạn cần chủ động giới thiệu ${name} khi khách vào xem hàng. Hỏi nhu cầu → Tư vấn SP phù hợp → Chốt đơn nhé! 🔥`;
  } else if (percentHT >= 20) {
    return `⚠️ Ngành ${name} đang ở mức ${pct}%, còn ${remainStr} để đạt target. Hãy tận dụng mỗi khách vào cửa hàng:\n- Chào hỏi → Hỏi nhu cầu\n- Giới thiệu CTKM đang có\n- Combo ${name} + phụ kiện\n- Gợi ý trả góp 0% nếu có\nLên tinh thần, mình làm được! 💪`;
  } else {
    return `🚨 Ngành ${name} chỉ mới ${pct}%, cần thêm ${remainStr}. Đây là ưu tiên cần tập trung:\n\n1. Mỗi khách vào → Giới thiệu ${name} trước\n2. Nắm rõ CTKM, giá bán, điểm mạnh SP\n3. So sánh với đối thủ → Ưu điểm vượt trội\n4. Gợi ý trả góp/combo để dễ chốt\n5. Follow up khách cũ đã tư vấn\n\nHãy chủ động lên bạn nhé! 🔥🔥🔥`;
  }
};

// Reusable mini table for a single section (SLLK or DTLK)
const SectionTable: React.FC<{
  title: string;
  titleColor?: string;
  headerBg?: string;
  rowData: { name: string; target: number; accumulated: number; percentHT: number; remainingVal: number }[];
}> = ({ title, rowData }) => {
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [copiedComment, setCopiedComment] = useState(false);

  if (rowData.length === 0) {
    return null;
  }

  const reachedCount = rowData.filter(r => r.percentHT >= 100).length;

  return (
    <div className="w-full flex flex-col rounded-2xl border border-emerald-300/80 overflow-hidden shadow-xs">
      {/* Section header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] px-3.5 sm:px-4 py-2 text-white">
        <span className="text-[13px] sm:text-[14.5px] font-black uppercase tracking-wide text-[#FEF08A]">{title}</span>
        <span className="text-[11px] sm:text-[12px] font-bold text-white/95 uppercase tracking-wider">
          ⚡ ĐẠT: {reachedCount}/{rowData.length} || {rowData.length > 0 ? ((reachedCount / rowData.length) * 100).toFixed(0) : 0}%
        </span>
      </div>
      <div className="overflow-x-auto w-full bg-white">
        <table className="w-full border-separate border-spacing-0 table-fixed bg-white text-[12px] sm:text-[14px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '40%' }} />
            <col style={{ width: '13.5%' }} />
            <col style={{ width: '13.5%' }} />
            <col style={{ width: '13.5%' }} />
            <col style={{ width: '13.5%' }} />
          </colgroup>
          <thead>
            <tr className="text-white font-black text-[12px] sm:text-[13px] uppercase tracking-tight h-[38px]">
              <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-600 bg-[#047857] text-white">STT</th>
              <th style={{ fontWeight: 900 }} className="px-3 py-0 text-left border-r border-b border-emerald-600 bg-[#059669] text-white">NGÀNH HÀNG</th>
              <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-600 bg-[#047857] text-white">TARGET</th>
              <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-600 bg-[#047857] text-white">LUỸ KẾ</th>
              <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-600 bg-[#059669] text-white">% HT</th>
              <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-b border-emerald-600 bg-[#047857] text-white">CÒN LẠI</th>
            </tr>
          </thead>
          <tbody>
            {rowData.map((row, index) => {
              const isEven = index % 2 === 0;
              return (
                <tr
                  key={row.name}
                  className={cn(
                    "transition-colors h-[36px] border-b border-emerald-100/90",
                    isEven ? "bg-white" : "bg-emerald-50/20",
                    "hover:bg-emerald-50/70"
                  )}
                >
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 text-[12px] sm:text-[14px] font-black text-slate-700 bg-emerald-50/40 whitespace-nowrap">
                    #{index + 1}
                  </td>
                  <td style={{ fontWeight: 900 }} className={cn(
                    "px-3 py-0 border-r border-b border-emerald-100/90 text-left text-[12.5px] sm:text-[14px] font-black uppercase truncate",
                    row.percentHT < 100 ? "text-rose-600" : "text-slate-900"
                  )}>
                    {row.name}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 text-[12.5px] sm:text-[14px] font-bold text-slate-800 whitespace-nowrap">
                    {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 text-[12.5px] sm:text-[14px] font-black text-rose-600 whitespace-nowrap">
                    {row.accumulated.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-[13px] leading-none",
                      row.percentHT >= 100 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-600"
                    )}>
                      {row.percentHT.toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ fontWeight: 900 }} className={cn(
                    "px-1 py-0 text-center border-b border-emerald-100/90 text-[12.5px] sm:text-[14px] font-black whitespace-nowrap",
                    row.remainingVal >= 0 ? "text-emerald-700" : "text-rose-600 font-bold"
                  )}>
                    <div className="flex items-center justify-center h-[36px] w-full gap-1">
                      {row.remainingVal >= 0 ? (
                        <span className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" strokeWidth={3} />
                        </span>
                      ) : (
                        <>
                          <span>{Math.abs(row.remainingVal).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}</span>
                          <button
                            className="no-capture text-amber-500 hover:text-amber-700 transition-colors shrink-0"
                            title="Xem nhận xét"
                            onClick={() => {
                              const comment = generateComment(row.name, row.remainingVal, row.percentHT);
                              setActiveComment(row.name);
                              setCommentText(comment);
                              setCopiedComment(false);
                            }}
                          >
                            <MessageCircle size={13} strokeWidth={2.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Comment Popup - Redesigned like FORM NHẬN XÉT reference */}
      {activeComment && (
        <div className="no-capture fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs" onClick={() => setActiveComment(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[520px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <MessageCircle size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Form nhận xét: {activeComment}
                </span>
              </div>
              <button onClick={() => setActiveComment(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5">
              {/* Label */}
              <p className="text-[13px] font-black text-slate-700 mb-2.5 uppercase tracking-wide">
                Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
              </p>

              {/* Editable textarea */}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              />

              {/* Footer */}
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
      )}
    </div>
  );
};

const EmployeeDetailTable: React.FC<EmployeeDetailTableProps> = ({
  staffName,
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  categoryTargets,
  luykeCategories = [],
  staffTargetQd = 0,
  staffDtqd = 0,
  staffPercentHT = 0,
  staffHieuQuaQd = null,
  staffBonusHientai = null,
  staffInstallmentPercent = null,
  onPreviewImage,
  onOpenCompare,
}) => {
  // Parse staff matrix using refined unified parser
  const { staffMatrix, categories: detailCategories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, luykeCategories, daysPassed, totalDays);
  
  // Extract staff ID from staffName (format: "NAME - ID" or "ID - NAME")
  const { id: extractedStaffId, name: extractedStaffName } = extractStaffNameAndId(staffName);
  const staffId = extractedStaffId || staffName.match(/\b\d{4,8}\b/)?.[0] || staffName.split(/[-–—]/).pop()?.trim() || '';
  
  const staffData = staffMatrix.find(s => {
    if (!s) return false;
    if (staffId && s.fullId && s.fullId.toLowerCase().trim() === staffId.toLowerCase().trim()) return true;
    if (staffId && s.fullId && s.fullId.includes(staffId)) return true;
    if (staffId && s.displayName && s.displayName.includes(staffId)) return true;

    // Match by name
    const cleanExtracted = removeAccents(extractedStaffName).toLowerCase();
    const cleanStaffName = removeAccents(staffName).toLowerCase();
    const sName = removeAccents((s as any).name || '').toLowerCase();
    const sDisplayName = removeAccents(s.displayName || '').toLowerCase();

    if (cleanExtracted && sName && (cleanExtracted === sName || sName.includes(cleanExtracted) || cleanExtracted.includes(sName))) return true;
    if (cleanExtracted && sDisplayName.includes(cleanExtracted)) return true;
    if (sName && cleanStaffName.includes(sName)) return true;
    return false;
  });

  if (!staffData || detailCategories.length === 0) {
    return (
      <div className="bg-white p-4 border border-slate-300 shadow-xl rounded-2xl" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4 border-b border-slate-300 pb-2">
          CHI TIẾT NHÂN VIÊN: {staffName}
        </h2>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-center py-8">
          Chưa có dữ liệu chi tiết cho nhân viên này
        </p>
      </div>
    );
  }

  // Build a lookup for category type from luykeCategories (BC THÁNG → CHI TIẾT NGÀNH HÀNG)
  const catTypeLookup: Record<string, 'SL' | 'DT' | 'ALL'> = {};
  luykeCategories.forEach(cat => {
    catTypeLookup[cleanCategoryName(cat.name)] = cat.type || 'ALL';
  });

  // Prepare base categories
  const categoriesToMap = (luykeCategories && luykeCategories.length > 0)
    ? luykeCategories
    : detailCategories.map(name => ({ name, type: catTypeLookup[cleanCategoryName(name)] || 'ALL', target: 0 }));

  // Ensure all categories (from both luykeCategories and thiDuaNv) are present
  const seenMapCats = new Set<string>();
  const mergedCategories: { name: string; type: 'SL' | 'DT' | 'ALL'; target: number }[] = [];

  categoriesToMap.forEach((cat: any) => {
    const clean = cleanCategoryName(cat.name);
    if (clean && !seenMapCats.has(clean)) {
      seenMapCats.add(clean);
      mergedCategories.push(cat);
    }
  });

  detailCategories.forEach((dcName: string) => {
    const clean = cleanCategoryName(dcName);
    if (clean && !seenMapCats.has(clean)) {
      seenMapCats.add(clean);
      const matchingTarget = categoryTargets?.find((t: any) => cleanCategoryName(t.name) === clean);
      const isSl = dcName.toUpperCase().includes('SIM') || 
                   dcName.toUpperCase().includes('VAS') || 
                   dcName.toUpperCase().includes('OTT') || 
                   dcName.toUpperCase().includes('NẠP RÚT');
      const type = catTypeLookup[clean] || (isSl ? 'SL' : 'DT');
      mergedCategories.push({
        name: dcName,
        type,
        target: matchingTarget?.adjustedTarget ?? matchingTarget?.target ?? 0
      });
    }
  });

  const allRowData = mergedCategories.map((cat: any) => {
    const cleanCatName = cleanCategoryName(cat.name);
    
    // Find target
    let target = 0;
    const matchingTarget = categoryTargets?.find((t: any) => cleanCategoryName(t.name) === cleanCatName);
    const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
      ? matchingTarget.adjustedTarget
      : (cat.target || 0);
    target = staffCount > 0 ? baseTarget / staffCount : baseTarget;
    
    // Find accumulated value from staff data
    // 1. Direct lookup from valuesMap (populated by parseStaffMatrixDataRefined)
    let accumulated = 0;
    const valuesMap = staffData.valuesMap;
    if (valuesMap && valuesMap[cleanCatName] !== undefined) {
      accumulated = valuesMap[cleanCatName];
    } else if (valuesMap) {
      // 2. Exact clean key match in valuesMap
      for (const [k, v] of Object.entries(valuesMap)) {
        if (k === cleanCatName) {
          accumulated = v;
          break;
        }
      }
    }

    // 3. Fallback: match via detailCategories and rawValues
    if (accumulated === 0 && staffData.rawValues && staffData.rawValues.length > 0) {
      const detailIdx = detailCategories.findIndex(dc => cleanCategoryName(dc) === cleanCatName);
      if (detailIdx !== -1 && staffData.rawValues[detailIdx] !== undefined) {
        accumulated = staffData.rawValues[detailIdx] || 0;
      }
    }

    const percentHT = (target > 0 && daysPassed > 0) 
      ? (((accumulated / daysPassed) * totalDays) / target) * 100 
      : 0;
    const remainingVal = accumulated - target;
    const catType = cat.type || 'ALL';
    
    return {
      name: cat.name,
      target,
      accumulated,
      percentHT,
      remainingVal,
      catType
    };
  });

  // Split by type based on luykeCategories (BC THÁNG → CHI TIẾT NGÀNH HÀNG)
  const sllkRows = allRowData
    .filter(r => r.catType === 'SL')
    .sort((a, b) => b.percentHT - a.percentHT);
  const dtlkRows = allRowData
    .filter(r => r.catType === 'DT')
    .sort((a, b) => b.percentHT - a.percentHT);
  const otherRows = allRowData
    .filter(r => r.catType === 'ALL')
    .sort((a, b) => b.percentHT - a.percentHT);

  // Calculate combined stats
  const totalReached = allRowData.filter(r => r.percentHT >= 100).length;
  const totalCats = allRowData.length;

  const [isCapturing, setIsCapturing] = useState(false);
  const [showSlowNotice, setShowSlowNotice] = useState(false);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = `${String(yesterday.getDate()).padStart(2, '0')}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${yesterday.getFullYear()}`;

  const captureElementHelper = async (element: HTMLElement) => {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '1120px';
    tempContainer.style.height = 'auto';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';

    // Frame wrapper to ensure 100% white background and no clipping
    const frameWrapper = document.createElement('div');
    frameWrapper.style.width = '1120px';
    frameWrapper.style.minWidth = '1120px';
    frameWrapper.style.maxWidth = '1120px';
    frameWrapper.style.padding = '20px';
    frameWrapper.style.backgroundColor = '#ffffff';
    frameWrapper.style.boxSizing = 'border-box';
    frameWrapper.style.borderRadius = '24px';
    frameWrapper.style.boxShadow = 'none';
    frameWrapper.style.display = 'block';

    const clone = element.cloneNode(true) as HTMLElement;

    const noCaptureElements = clone.querySelectorAll('.no-capture, button, textarea, .capture-btn');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Remove any padding/max-w on clone so it expands 100% inside frameWrapper
    clone.style.width = '100%';
    clone.style.minWidth = '100%';
    clone.style.maxWidth = '100%';
    clone.style.height = 'auto';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.backgroundColor = 'transparent';
    clone.style.display = 'block';
    clone.style.boxSizing = 'border-box';
    clone.style.boxShadow = 'none';

    const innerCards = clone.querySelectorAll('.max-w-\\[960px\\], [class*="max-w"]');
    innerCards.forEach(c => {
      const htmlC = c as HTMLElement;
      htmlC.style.maxWidth = '100%';
      htmlC.style.width = '100%';
      htmlC.style.boxShadow = 'none';
    });

    // Ensure stat cards are in 1 row of 6
    const statGrids = clone.querySelectorAll('[class*="grid-cols"]');
    statGrids.forEach(g => {
      const htmlG = g as HTMLElement;
      htmlG.style.display = 'grid';
      htmlG.style.gridTemplateColumns = 'repeat(6, minmax(0, 1fr))';
      htmlG.style.width = '100%';
      htmlG.style.boxSizing = 'border-box';
    });

    // Strip shadows & remove truncate
    const allElements = clone.querySelectorAll('*');
    allElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style) {
        htmlEl.style.boxShadow = 'none';
        htmlEl.style.textShadow = 'none';
        htmlEl.style.filter = 'none';
      }
      if (htmlEl.classList) {
        htmlEl.classList.remove('truncate');
        Array.from(htmlEl.classList).forEach(cls => {
          if (cls.startsWith('shadow') || cls.startsWith('drop-shadow') || cls.startsWith('ring')) {
            htmlEl.classList.remove(cls);
          }
        });
      }
    });

    const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
    scrollContainers.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.overflow = 'visible';
      htmlEl.style.width = '100%';
      htmlEl.style.height = 'auto';
      htmlEl.style.maxWidth = 'none';
      htmlEl.style.maxHeight = 'none';
      htmlEl.style.boxSizing = 'border-box';
      el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
    });

    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.maxWidth = '100%';
      htmlTable.style.boxSizing = 'border-box';
      htmlTable.style.tableLayout = 'fixed';
      htmlTable.style.borderCollapse = 'collapse';

      const cols = htmlTable.querySelectorAll('colgroup col');
      if (cols.length >= 6) {
        (cols[0] as HTMLElement).style.width = '55px'; // STT
        (cols[1] as HTMLElement).style.width = '480px'; // NGÀNH HÀNG (full space for long names)
        (cols[2] as HTMLElement).style.width = '125px'; // TARGET
        (cols[3] as HTMLElement).style.width = '125px'; // LUỸ KẾ
        (cols[4] as HTMLElement).style.width = '125px'; // % HT
        (cols[5] as HTMLElement).style.width = '150px'; // CÒN LẠI
      }
    });

    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      await ensureFontsReady();
      
      let dataUrl: string = '';
      try {
        const canvas = await html2canvas(frameWrapper, {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: 1120,
          windowWidth: 1120,
        });
        dataUrl = canvas.toDataURL('image/png');
      } catch (h2cErr) {
        console.warn('html2canvas failed, fallback to domToPng:', h2cErr);
        try {
          dataUrl = await domToPng(frameWrapper, {
            backgroundColor: '#ffffff',
            scale: 2,
            features: { font: false, image: false },
            width: 1120,
            height: frameWrapper.scrollHeight,
          });
        } catch {
          dataUrl = await htmlToImage.toPng(frameWrapper, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            style: { ...EXPORT_FONT_STYLE },
          });
        }
      }
      return dataUrl;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleExport = async () => {
    const element = document.getElementById(`employee-detail-${staffName}`);
    if (!element || isCapturing) return;

    setIsCapturing(true);
    setShowSlowNotice(false);

    // If export takes > 2 seconds, trigger the slow notice overlay
    const slowNoticeTimer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 2000);

    try {
      const dataUrl = await captureElementHelper(element);
      if (onPreviewImage) {
        onPreviewImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = `ChiTietNV_${staffName.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      clearTimeout(slowNoticeTimer);
      setShowSlowNotice(false);
      setIsCapturing(false);
    }
  };

  return (
    <div id={`employee-detail-${staffName}`} className="w-full flex justify-center p-1 sm:p-2.5" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <div className="w-full max-w-[960px] bg-white border border-slate-200/90 p-2.5 sm:p-4 rounded-2xl shadow-sm flex flex-col space-y-3">
        
        {/* Top Header Banner: Emerald & Gold Gradient */}
        <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 sm:p-5 rounded-2xl text-white relative shrink-0 text-center flex flex-col items-center justify-center">
          <h2 className="text-[20px] sm:text-[25px] md:text-[28px] font-black text-[#FEF08A] uppercase tracking-wide leading-tight text-center w-full" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
            CHI TIẾT NHÂN VIÊN: {staffName}
          </h2>
          
          {/* Dòng luỹ kế ngang hàng với nút Xuất ảnh */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-2 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
            <span className="flex items-center gap-1 whitespace-nowrap">
              ⚡ Luỹ kế dự kiến đến ngày: {yesterdayDate}
            </span>
            <span className="opacity-70">||</span>
            <span className="text-white font-extrabold whitespace-nowrap">
              ĐẠT: {totalReached}/{totalCats} ({totalCats > 0 ? ((totalReached / totalCats) * 100).toFixed(1) : 0}%)
            </span>
            <span className="opacity-70 no-capture hidden sm:inline">||</span>
            
            {/* 📷 Nút Xuất ảnh ngang hàng */}
            <button 
              onClick={handleExport}
              disabled={isCapturing}
              className="no-capture inline-flex items-center gap-1.5 px-3 py-1 bg-white/25 hover:bg-white/35 text-[#FEF08A] hover:text-white rounded-xl font-black text-xs transition-all active:scale-95 border border-white/30 cursor-pointer shadow-xs"
              title="Xuất ảnh báo cáo chi tiết nhân viên"
            >
              <Camera size={13} className="text-[#FEF08A]" />
              <span>{isCapturing ? 'ĐANG XUẤT...' : 'XUẤT ẢNH'}</span>
            </button>

            {/* ⚔️ Nút So sánh nhanh */}
            {onOpenCompare && (
              <button 
                onClick={() => onOpenCompare(staffId)}
                className="no-capture inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/25 hover:bg-amber-400/35 text-amber-200 hover:text-white rounded-xl font-black text-xs transition-all active:scale-95 border border-amber-300/40 cursor-pointer shadow-xs"
                title="So sánh đối đầu nhân viên này với nhân viên khác"
              >
                <Swords size={13} className="text-amber-300" />
                <span>SO SÁNH</span>
              </button>
            )}
          </div>
        </div>

        {/* 6 StatCards Dashboard Row */}
        {(staffTargetQd > 0 || staffDtqd > 0) && (
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2 w-full">
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] sm:text-[10.5px] font-black text-slate-500 uppercase tracking-wider text-center">TARGET QĐ</span>
              <span className="text-[17px] sm:text-[23px] font-black text-slate-800 mt-0.5">
                {staffTargetQd > 1000000 
                  ? Math.floor(staffTargetQd / 1000000).toLocaleString('vi-VN')
                  : Math.round(staffTargetQd).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] sm:text-[10.5px] font-black text-slate-500 uppercase tracking-wider text-center">DTQĐ</span>
              <span className="text-[17px] sm:text-[23px] font-black text-rose-600 mt-0.5">
                {Math.abs(staffDtqd) > 1000000 
                  ? Math.floor(staffDtqd / 1000000).toLocaleString('vi-VN')
                  : Math.round(staffDtqd).toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] sm:text-[10.5px] font-black text-slate-500 uppercase tracking-wider text-center">% HT</span>
              <span className={cn("text-[17px] sm:text-[23px] font-black mt-0.5", staffPercentHT >= 100 ? "text-emerald-700" : "text-rose-600")}>
                {Math.round(staffPercentHT)}%
              </span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] sm:text-[10.5px] font-black text-slate-500 uppercase tracking-wider text-center">% QĐ</span>
              <span className={cn("text-[17px] sm:text-[23px] font-black mt-0.5", (staffHieuQuaQd !== null && staffHieuQuaQd !== undefined) ? "text-indigo-600" : "text-slate-400")}>
                {(() => {
                  if (staffHieuQuaQd !== null && staffHieuQuaQd !== undefined) {
                    const val = typeof staffHieuQuaQd === 'number' ? staffHieuQuaQd : parseFloat(String(staffHieuQuaQd).replace(/,/g, '').replace(/%/g, ''));
                    if (!isNaN(val)) {
                      if (val <= 5 && val > 0) {
                        return `${Math.round(val * 100)}%`;
                      }
                      return `${Math.round(val)}%`;
                    }
                  }
                  return '-';
                })()}
              </span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] sm:text-[10.5px] font-black text-slate-500 uppercase tracking-wider text-center">TRẢ CHẬM</span>
              <span className={cn("text-[17px] sm:text-[23px] font-black mt-0.5", (staffInstallmentPercent !== null && staffInstallmentPercent !== undefined) ? "text-emerald-700" : "text-slate-400")}>
                {(staffInstallmentPercent !== null && staffInstallmentPercent !== undefined)
                  ? `${staffInstallmentPercent.toFixed(1)}%`
                  : '-'}
              </span>
            </div>
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-2 sm:p-2.5 flex flex-col items-center justify-center shadow-2xs">
              <span className="text-[9px] sm:text-[10.5px] font-black text-slate-500 uppercase tracking-wider text-center">THƯỞNG</span>
              <span className={cn("text-[17px] sm:text-[23px] font-black mt-0.5", (staffBonusHientai !== null && staffBonusHientai !== undefined) ? "text-rose-600" : "text-slate-400")}>
                {(() => {
                  if (staffBonusHientai === null || staffBonusHientai === undefined) return '-';
                  if (staffBonusHientai === 0) return '0';
                  const millions = staffBonusHientai / 1000000;
                  const rounded = Math.round(millions * 10) / 10;
                  return `${rounded.toString().replace('.', ',')}tr`;
                })()}
              </span>
            </div>
          </div>
        )}

        {/* SLLK Table (Top) */}
        <SectionTable
          title="SỐ LƯỢNG LUỸ KẾ (SLLK)"
          rowData={sllkRows}
        />

        {/* DTLK Table (Bottom) */}
        <SectionTable
          title="DOANH THU LUỸ KẾ (DTLK)"
          rowData={dtlkRows}
        />

        {/* Other categories */}
        {otherRows.length > 0 && (
          <SectionTable
            title="NGÀNH HÀNG KHÁC"
            rowData={otherRows}
          />
        )}
      </div>

      {/* Loading Overlay if capture takes > 2s */}
      <CaptureLoadingOverlay isLoading={showSlowNotice} message="ĐANG XUẤT ẢNH BÁO CÁO, VUI LÒNG ĐỢI GIÂY LÁT..." />
    </div>
  );
};

export default React.memo(EmployeeDetailTable);
