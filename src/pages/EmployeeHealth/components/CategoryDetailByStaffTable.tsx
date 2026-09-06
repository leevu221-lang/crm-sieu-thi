import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, TrendingUp, ChevronDown, Check, Search, MessageSquare, X, Download, Plus, Layers, FileArchive, Sparkles, Copy } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../../../utils/fontExportUtil';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { cn } from '../../RTST/utils';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';
import { CaptureLoadingOverlay } from '../../../components/CaptureLoadingOverlay';
import { StaffMatrixData, CategoryData } from '../../RTST/types';
import { cleanCategoryName } from './EmployeeDetailTable';
import { extractStaffNameAndId } from '../utils/staffParserHelper';
import { useLuykeData } from '../../RTST/hooks/useLuykeData';
import { getCategoryGroupSortOrder, getCustomCategoryIndex, parseStaffMatrixDataRefined } from './SummaryThiDuaTable';
import { CategoryConfigItem } from '../../../hooks/useCategoryConfig';

interface CategoryDetailByStaffTableProps {
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[];
  selectedStaffIds?: string[];
  luykeCategories?: CategoryData[];
  categoryConfig?: CategoryConfigItem[];
}

const CategoryDetailByStaffTable: React.FC<CategoryDetailByStaffTableProps> = ({
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  daysPassed,
  totalDays,
  categoryTargets,
  selectedStaffIds = [],
  luykeCategories,
  categoryConfig
}) => {
  const { results: allStaffMatrix, categories } = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, luykeCategories || [], daysPassed, totalDays, false, categoryConfig);

  const dropdownCategories = React.useMemo(() => {
    if (luykeCategories && luykeCategories.length > 0) {
      return luykeCategories.map((c: any) => c.name).filter((n: string) => n);
    }
    return categories;
  }, [luykeCategories, categories]);

  const staffMatrix = selectedStaffIds.length > 0
    ? allStaffMatrix.filter(s => selectedStaffIds.includes(s.fullId))
    : allStaffMatrix;

  const { activeStore } = useLuykeData();

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCapturingAll, setIsCapturingAll] = useState(false);
  const [copiedCat, setCopiedCat] = useState<string | null>(null);
  const [commentOpenCat, setCommentOpenCat] = useState<string | null>(null);
  const [catCommentText, setCatCommentText] = useState('');
  const [catCommentTemplate, setCatCommentTemplate] = useState<1 | 2 | 3>(1);
  const [copiedCatComment, setCopiedCatComment] = useState(false);
  const [commentRowData, setCommentRowData] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [openNhDropdownFor, setOpenNhDropdownFor] = useState<string | null>(null);
  const [cardSearchTerm, setCardSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  React.useEffect(() => {
    if (dropdownCategories.length > 0 && !initializedRef.current) {
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      const savedVal = localStorage.getItem(savedKey);
      if (savedVal !== null) {
        try {
          const parsed = JSON.parse(savedVal);
          if (Array.isArray(parsed)) {
            const validSaved = parsed.filter((c: string) => dropdownCategories.includes(c));
            if (validSaved.length > 0) {
              setSelectedCategories(validSaved);
              initializedRef.current = true;
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setSelectedCategories(dropdownCategories);
      initializedRef.current = true;
    }
  }, [dropdownCategories, activeStore]);

  React.useEffect(() => {
    if (dropdownCategories.length > 0 && initializedRef.current && selectedCategories.length > 0) {
      const savedKey = `EH_DETAIL_CATEGORIES_${activeStore || 'GLOBAL'}`;
      localStorage.setItem(savedKey, JSON.stringify(selectedCategories));
    }
  }, [selectedCategories, dropdownCategories, activeStore]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  if (dropdownCategories.length === 0 && categories.length === 0) return null;

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleAddCard = () => {
    const unselected = dropdownCategories.filter(x => !selectedCategories.includes(x));
    if (unselected.length > 0) {
      setSelectedCategories(prev => [...prev, unselected[0]]);
    }
  };

  const handleRemoveCard = (catName: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== catName));
  };

  const getCategoryClass = (name: string) => {
    const len = (name || '').trim().length;
    if (len > 35) return 'text-[14.5px] sm:text-[17px] md:text-[19px] tracking-tight';
    if (len > 26) return 'text-[16.5px] sm:text-[19px] md:text-[21.5px] tracking-tight';
    if (len > 18) return 'text-[18.5px] sm:text-[22px] md:text-[24.5px] tracking-tight';
    if (len > 10) return 'text-[21px] sm:text-[25px] md:text-[28px] tracking-tight';
    return 'text-[24px] sm:text-[28px] md:text-[31px]';
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  const captureElementHelper = async (element: HTMLElement) => {
    const isGridAll = element.id === 'all-categories-container';
    const count = selectedCategories.length;
    const isMultiTable = isGridAll && count > 1;
    
    // Each table card has desktop width of 660px to ensure full employee names fit without truncation
    const cardWidth = 660;
    const cardPadding = 14;
    const gap = 20;
    const framePadding = 32; // Viền trắng xung quanh to và đều 32px cả 4 phía

    // Bố cục linh hoạt: <= 4 bảng thì 2 trên 2 dưới, >= 5 bảng thì 3 trên 3 dưới
    const cols = !isMultiTable ? 1 : (count <= 4 ? 2 : 3);
    const exportInnerWidth = cols * cardWidth + (cols - 1) * gap;
    const totalExportWidth = exportInnerWidth + framePadding * 2;

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = `${totalExportWidth}px`;
    tempContainer.style.height = 'auto';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.backgroundColor = '#ffffff';

    // Frame wrapper to ensure 100% equal left/right/top/bottom margins and generous white border
    const frameWrapper = document.createElement('div');
    frameWrapper.style.width = `${totalExportWidth}px`;
    frameWrapper.style.minWidth = `${totalExportWidth}px`;
    frameWrapper.style.maxWidth = `${totalExportWidth}px`;
    frameWrapper.style.padding = `${framePadding}px`;
    frameWrapper.style.boxSizing = 'border-box';
    frameWrapper.style.backgroundColor = '#ffffff';
    frameWrapper.style.display = 'flex';
    frameWrapper.style.justifyContent = 'center';
    frameWrapper.style.alignItems = 'start';
    frameWrapper.style.margin = '0 auto';
    frameWrapper.style.boxShadow = 'none';
    frameWrapper.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";

    const clone = element.cloneNode(true) as HTMLElement;

    // Hide ONLY export buttons, toolbar, popovers (DO NOT hide title buttons)
    const noCaptureElements = clone.querySelectorAll('.no-capture, .capture-btn, .export-btn, textarea');
    noCaptureElements.forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Zero-Shadow Export: remove all shadows, textShadows, filters, and remove truncate
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

    if (isMultiTable) {
      clone.style.width = `${exportInnerWidth}px`;
      clone.style.minWidth = `${exportInnerWidth}px`;
      clone.style.maxWidth = `${exportInnerWidth}px`;
      clone.style.display = 'grid';
      clone.style.gridTemplateColumns = `repeat(${cols}, ${cardWidth}px)`;
      clone.style.gap = `${gap}px`;
      clone.style.alignItems = 'start';
      clone.style.justifyContent = 'center';
      clone.style.margin = '0 auto';
      clone.style.padding = '0px';

      const cards = clone.querySelectorAll('[id^="cat-detail-"]');
      cards.forEach(c => {
        const htmlCard = c as HTMLElement;
        htmlCard.style.width = `${cardWidth}px`;
        htmlCard.style.minWidth = `${cardWidth}px`;
        htmlCard.style.maxWidth = `${cardWidth}px`;
        htmlCard.style.boxSizing = 'border-box';
        htmlCard.style.padding = `${cardPadding}px`;
        htmlCard.style.boxShadow = 'none';
        htmlCard.style.borderRadius = '0px';
        htmlCard.style.border = '1px solid #cbd5e1';
        htmlCard.style.backgroundColor = '#ffffff';
        htmlCard.style.margin = '0';
      });
    } else {
      // Single card export: clone IS the card itself
      clone.style.width = `${cardWidth}px`;
      clone.style.minWidth = `${cardWidth}px`;
      clone.style.maxWidth = `${cardWidth}px`;
      clone.style.display = 'block';
      clone.style.margin = '0 auto';
      clone.style.padding = `${cardPadding}px`;
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#ffffff';
      clone.style.border = '1px solid #cbd5e1';
      clone.style.borderRadius = '0px';
      clone.style.boxShadow = 'none';
    }
    clone.style.height = 'auto';
    clone.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";

    // Make sure overflow wrappers in the clone are visible and stretch 100%
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

    // Make sure header banner stretches 100% of the card
    const headerBanners = clone.querySelectorAll('.bg-\\[\\#0072db\\]');
    headerBanners.forEach(b => {
      const htmlB = b as HTMLElement;
      htmlB.style.width = '100%';
      htmlB.style.boxSizing = 'border-box';
      htmlB.style.borderRadius = '0px';
    });

    // Enforce EXACT table layout, colgroups, row heights, and font sizes for cross-browser identical output
    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      const htmlTable = table as HTMLElement;
      htmlTable.style.width = '100%';
      htmlTable.style.minWidth = '100%';
      htmlTable.style.maxWidth = '100%';
      htmlTable.style.tableLayout = 'fixed';
      htmlTable.style.borderCollapse = 'collapse';
      htmlTable.style.boxSizing = 'border-box';
      htmlTable.style.fontSize = '14px';
      htmlTable.style.fontFamily = "'UTM Avo', 'Inter', sans-serif";
      htmlTable.style.fontWeight = '900';

      // Enforce colgroup cols
      const colEls = htmlTable.querySelectorAll('colgroup col');
      if (colEls.length >= 6) {
        (colEls[0] as HTMLElement).style.width = '48px';
        (colEls[1] as HTMLElement).style.width = '286px';
        (colEls[2] as HTMLElement).style.width = '75px';
        (colEls[3] as HTMLElement).style.width = '75px';
        (colEls[4] as HTMLElement).style.width = '90px';
        (colEls[5] as HTMLElement).style.width = '58px';
      }

      // Enforce EXACT row heights and cell styles for cross-browser consistency
      const theadTrs = htmlTable.querySelectorAll('thead tr');
      theadTrs.forEach(tr => {
        const htmlTr = tr as HTMLElement;
        htmlTr.style.height = '50px';
        htmlTr.style.minHeight = '50px';
        htmlTr.style.boxSizing = 'border-box';
      });
      const theadThs = htmlTable.querySelectorAll('thead th');
      theadThs.forEach(th => {
        const htmlTh = th as HTMLElement;
        htmlTh.style.fontSize = '13.5px';
        htmlTh.style.fontWeight = '900';
        htmlTh.style.padding = '0 4px';
        htmlTh.style.verticalAlign = 'middle';
        htmlTh.style.lineHeight = '1.2';
      });

      const tbodyTrs = htmlTable.querySelectorAll('tbody tr');
      tbodyTrs.forEach(tr => {
        const htmlTr = tr as HTMLElement;
        htmlTr.style.height = '46px';
        htmlTr.style.minHeight = '46px';
        htmlTr.style.boxSizing = 'border-box';
      });
      const tbodyTds = htmlTable.querySelectorAll('tbody td');
      tbodyTds.forEach(td => {
        const htmlTd = td as HTMLElement;
        htmlTd.style.fontSize = '14.5px';
        htmlTd.style.fontWeight = '900';
        htmlTd.style.verticalAlign = 'middle';
        htmlTd.style.lineHeight = '1.2';
        htmlTd.style.boxSizing = 'border-box';
      });

      const tfootTrs = htmlTable.querySelectorAll('tfoot tr');
      tfootTrs.forEach(tr => {
        const htmlTr = tr as HTMLElement;
        htmlTr.style.height = '50px';
        htmlTr.style.minHeight = '50px';
        htmlTr.style.boxSizing = 'border-box';
      });
      const tfootTds = htmlTable.querySelectorAll('tfoot td');
      tfootTds.forEach(td => {
        const htmlTd = td as HTMLElement;
        htmlTd.style.fontSize = '14.5px';
        htmlTd.style.fontWeight = '900';
        htmlTd.style.verticalAlign = 'middle';
        htmlTd.style.lineHeight = '1.2';
        htmlTd.style.boxSizing = 'border-box';
      });
    });

    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      // ★ Ensure UTM Avo font is fully loaded before export
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 200));
      const dataUrl = await htmlToImage.toPng(frameWrapper, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
        style: {
          ...EXPORT_FONT_STYLE,
        }
      });
      return dataUrl;
    } finally {
      document.body.removeChild(tempContainer);
    }
  };

  const handleExport = async (catName: string, elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      try {
        const dataUrl = await captureElementHelper(element);
        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Export category failed:', err);
      }
    }
  };

  const handleExportAll = async () => {
    if (selectedCategories.length === 0) return;
    setIsCapturingAll(true);
    try {
      const element = document.getElementById('all-categories-container');
      if (element) {
        const dataUrl = await captureElementHelper(element);
        setPreviewImage(dataUrl);
      }
    } catch (err) {
      console.error('Export all failed:', err);
    } finally {
      setIsCapturingAll(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (selectedCategories.length === 0) return;
    setIsCapturingAll(true);
    try {
      const zip = new JSZip();
      for (const catName of selectedCategories) {
        const elementId = `cat-detail-${catName.replace(/\s+/g, '-')}`;
        const element = document.getElementById(elementId);
        if (element) {
          const dataUrl = await captureElementHelper(element);
          const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
          zip.file(`${catName.replace(/[/\\?%*:|"<>]/g, '-')}.png`, base64Data, { base64: true });
        }
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `Bang_Chi_Tiet_Nganh_Hang_${yesterdayDate}.zip`);
    } catch (err) {
      console.error('Download all zip failed:', err);
    } finally {
      setIsCapturingAll(false);
    }
  };

  const generateCatComment = (catName: string, rowData: any[], template: 1 | 2 | 3 = 1) => {
    if (rowData.length === 0) return '';
    const getStaffId = (s: any) => {
      const parts = s.staffName.split('-');
      if (parts.length > 1) {
        const potentialId = parts.find((p: string) => /\d{4,}/.test(p));
        if (potentialId) {
          const match = potentialId.match(/\d{4,}/);
          if (match) return match[0];
        }
      }
      const fallbackMatch = s.staffName.match(/\d{4,}/);
      return fallbackMatch ? fallbackMatch[0] : '';
    };

    let text = '';
    const total = rowData.length;
    const count20 = Math.max(1, Math.round(total * 0.2));

    if (template === 1) {
      // MẪU 1: TOP/BOT NV
      const sorted = [...rowData].sort((a, b) => (b.projectedRate || 0) - (a.projectedRate || 0));
      const top = sorted.slice(0, count20);
      const bot = sorted.slice(Math.max(count20, total - count20));
      text = `📊 ${catName.toUpperCase()}\n━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🏆 TOP ${count20} DẪN ĐẦU:\n`;
      top.forEach((s, i) => {
        const id = getStaffId(s);
        if (id) text += `🔺 #${i + 1}. @${id}\n`;
      });
      text += `\n⚠️ BOTTOM ${count20} CẦN TĂNG TỐC:\n`;
      bot.forEach((s, i) => {
        const id = getStaffId(s);
        if (id) text += `🔻 #${total - bot.length + i + 1}. @${id}\n`;
      });
      text += `\n💪 Hãy cố gắng bứt phá! 🔥`;
    } else if (template === 2) {
      // MẪU 2: DS cần tăng tốc (dưới 100%)
      const botStaffs = rowData.filter(s => s.projectedRate < 100);
      text = `🚨 NHÂN VIÊN CÓ ${catName.toUpperCase()} DƯỚI 100%:\n`;
      text += `📊 Tổng: ${botStaffs.length}/${total}\n\n`;
      botStaffs.forEach((s, i) => {
        const id = getStaffId(s);
        if (id) text += `🔻 #${i + 1}. @${id}\n`;
      });
      text += `\n💡 Cần hỗ trợ các NV trên đẩy mạnh bán hàng!`;
    } else {
      // MẪU 3: Tóm tắt toàn bộ
      const sorted = [...rowData].sort((a, b) => (b.projectedRate || 0) - (a.projectedRate || 0));
      text = `📝 TÓM TẮT ${catName.toUpperCase()}:\n━━━━━━━━━━━━━━━━━━\n\n`;
      text += `🎯 Tổng NV: ${total}\n`;
      text += `✅ ĐẠT (≥100%): ${rowData.filter(s => s.projectedRate >= 100).length}/${total}\n`;
      text += `❌ Chưa đạt (<100%): ${rowData.filter(s => s.projectedRate < 100).length}/${total}\n\n`;
      text += `📊 BẢNG XẾP HẠNG:\n`;
      sorted.forEach((s, i) => {
        const id = getStaffId(s);
        const icon = s.projectedRate >= 100 ? '✅' : '🔴';
        if (id) text += `${icon} #${i + 1}. @${id}\n`;
      });
    }

    setCatCommentText(text);
    setCatCommentTemplate(template);
    setCopiedCatComment(false);
    return text;
  };

  const filteredDropdownCategories = dropdownCategories.filter(cat =>
    cat.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mt-6 sm:mt-8 flex flex-col gap-4 sm:gap-5 w-full max-w-none" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      {/* Sleek Top Action Bar (Chuẩn TNB LEADER - NHÓM HÀNG) */}
      <div className="w-full bg-white px-3.5 sm:px-6 py-3 sm:py-3.5 rounded-none shadow-xs border border-slate-300 flex flex-wrap items-center justify-between gap-3 relative z-40">
        <div className="flex items-center gap-2">
          <span className="text-[14px] sm:text-[17px] font-black text-slate-800 uppercase tracking-wide">
            ĐANG HIỂN THỊ: <span className="text-[#0369a1] font-extrabold">{selectedCategories.length}/{dropdownCategories.length} BẢNG</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap" ref={dropdownRef}>
          {/* 🔍 BỘ LỌC NGÀNH HÀNG Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                "px-3.5 sm:px-4.5 py-2 rounded-xl text-[12.5px] sm:text-[14.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-2 active:scale-95 border",
                isDropdownOpen
                  ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                  : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700"
              )}
            >
              <Search size={15} className="text-emerald-700 stroke-[2.5]" />
              <span>BỘ LỌC NGÀNH HÀNG</span>
              <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[11.5px] font-black">{selectedCategories.length}</span>
              <ChevronDown size={15} className={cn("text-slate-400 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
            </button>

            {/* Master Category Popover Dropdown */}
            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 cursor-default" 
                  onClick={() => setIsDropdownOpen(false)} 
                />
                <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white border-2 border-emerald-500 shadow-2xl rounded-2xl p-3 z-50 flex flex-col gap-2.5 max-h-[460px]">
                  {/* Search box */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm ngành hàng..."
                      className="w-full pl-9 pr-8 py-2 text-[13.5px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 font-bold"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Quick actions: CHỌN TẤT CẢ, BỎ CHỌN */}
                  <div className="flex items-center justify-between px-1.5 py-1 border-b border-slate-200 text-[11.5px] font-black uppercase">
                    <button
                      type="button"
                      onClick={() => setSelectedCategories(dropdownCategories)}
                      className="text-emerald-700 hover:underline cursor-pointer"
                    >
                      CHỌN TẤT CẢ ({dropdownCategories.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCategories([])}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      BỎ CHỌN HẾT
                    </button>
                  </div>

                  {/* Category Checklist */}
                  <div className="overflow-y-auto flex flex-col gap-1 max-h-64 pr-1">
                    {filteredDropdownCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <label
                          key={cat}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 text-[13px] font-bold rounded-lg cursor-pointer transition-colors select-none",
                            isSelected ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-100 text-slate-700"
                          )}
                        >
                          <div className="flex items-center gap-2.5 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCategory(cat)}
                              className="rounded text-emerald-600 focus:ring-0 cursor-pointer w-4 h-4"
                            />
                            <span className="truncate uppercase text-[12.5px] font-black">{cat}</span>
                          </div>
                          {isSelected && <Check size={15} className="text-emerald-600 shrink-0 stroke-[3]" />}
                        </label>
                      );
                    })}
                    {filteredDropdownCategories.length === 0 && (
                      <p className="text-center text-sm text-slate-400 py-4 font-bold">Không tìm thấy ngành hàng phù hợp</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* + THÊM BẢNG Button */}
          {selectedCategories.length < dropdownCategories.length && (
            <button
              onClick={handleAddCard}
              className="px-3.5 sm:px-4.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-[12.5px] sm:text-[14.5px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>+ THÊM BẢNG</span>
            </button>
          )}

          {/* XUẤT LƯỚI BẢNG Button */}
          {selectedCategories.length > 0 && (
            <button
              onClick={handleExportAll}
              disabled={isCapturingAll}
              className={cn(
                "flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-[12.5px] sm:text-[14.5px] font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95",
                isCapturingAll
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              )}
            >
              <Camera size={15} />
              <span>{isCapturingAll ? "ĐANG XUẤT..." : "XUẤT LƯỚI BẢNG"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tables Grid Section: Mobile portrait = 1 bảng/dòng, Desktop/Landscape = 2-3 bảng ngang */}
      <div 
        id="all-categories-container" 
        className={cn(
          "w-full items-start justify-center",
          selectedCategories.length === 0
            ? "flex flex-col items-center justify-center p-8 sm:p-12 bg-white rounded-none border border-slate-300 text-slate-400"
            : selectedCategories.length === 1
              ? "max-w-[650px] mx-auto space-y-4 sm:space-y-6"
              : selectedCategories.length <= 4
                ? "grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5 w-full max-w-none mx-auto"
                : "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-5 w-full max-w-none mx-auto"
        )}
      >
        {selectedCategories.length === 0 ? (
          <>
            <Layers size={36} className="mb-2 text-slate-300" />
            <p className="font-bold text-sm sm:text-base text-slate-600">Chưa chọn nhóm hàng nào</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Nhấn "+ THÊM BẢNG" ở trên để hiển thị báo cáo ngành hàng.</p>
          </>
        ) : (
          selectedCategories.map((catName) => {
            const catIdx = categories.findIndex(c => cleanCategoryName(c) === cleanCategoryName(catName));
            const lkCat = luykeCategories.length > 0
              ? luykeCategories.find((c: any) => cleanCategoryName(c.name) === cleanCategoryName(catName))
              : null;
            const matchingTarget = categoryTargets.find((t: any) => cleanCategoryName(t.name) === cleanCategoryName(catName));
            const baseTarget = (matchingTarget && typeof matchingTarget.adjustedTarget === 'number')
              ? matchingTarget.adjustedTarget
              : (lkCat ? lkCat.target : 0);
            const targetPerStaff = staffCount > 0 ? baseTarget / staffCount : 0;
            const elementId = `cat-detail-${catName.replace(/\s+/g, '-')}`;

            const rowData = staffMatrix.map(staff => {
              const accumulated = staff.rawValues[catIdx] || 0;
              const projectedRate = staff.projectedRates[catIdx] || 0;

              return {
                staffName: staff.displayName,
                target: targetPerStaff,
                accumulated,
                projectedRate
              };
            }).sort((a, b) => b.projectedRate - a.projectedRate);

            const reachedCount = rowData.filter(row => Math.round(row.projectedRate) >= 100).length;
            const totalStaff = rowData.length;

            return (
              <div
                key={catName}
                id={elementId}
                className="bg-white border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 flex flex-col min-w-0 shadow-sm relative group/card"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              >
                {/* Actions: Tag tên, Ẩn bảng & Chụp ảnh bảng */}
                <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 no-capture export-btn">
                  {/* ✨ Nhận xét */}
                  <button
                    type="button"
                    onClick={() => {
                      setCommentRowData(rowData);
                      generateCatComment(catName, rowData, catCommentTemplate);
                      setCommentOpenCat(catName);
                    }}
                    title="Nhận xét ngành hàng"
                    className="px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1 shadow-none active:scale-95 bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-500"
                  >
                    <Sparkles size={11} className="animate-pulse" />
                    <span>NHẬN XÉT</span>
                  </button>

                  {/* 📷 Chụp ảnh bảng này */}
                  <button
                    type="button"
                    onClick={() => handleExport(catName, elementId)}
                    title={`Chụp ảnh trọn vẹn bảng ${catName}`}
                    className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white backdrop-blur-none transition-all cursor-pointer border border-white/25 active:scale-95 shadow-none"
                  >
                    <Camera size={13} />
                  </button>

                  {/* ✕ Ẩn bảng này */}
                  <button
                    type="button"
                    onClick={() => handleRemoveCard(catName)}
                    title={`Ẩn bảng "${catName}"`}
                    className="p-1.5 bg-white/20 hover:bg-rose-500/60 rounded-xl text-white backdrop-blur-none transition-all cursor-pointer border border-white/25 active:scale-95 shadow-none"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Header Banner: Emerald Gradient Banner with Switcher Dropdown on Title */}
                <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] text-white p-3.5 sm:p-4 text-center flex flex-col items-center justify-center rounded-2xl relative overflow-visible w-full mb-2.5">
                  <div className="relative inline-flex items-center justify-center group max-w-full">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (openNhDropdownFor === catName) {
                          setOpenNhDropdownFor(null);
                          setCardSearchTerm('');
                        } else {
                          setOpenNhDropdownFor(catName);
                          setCardSearchTerm('');
                        }
                      }}
                      className={cn(
                        "inline-flex items-center justify-center gap-1 sm:gap-1.5 text-[#FEF08A] font-black uppercase cursor-pointer text-center outline-none transition-all py-0.5 px-1 max-w-full hover:opacity-90 leading-tight break-words text-[19px] sm:text-[23px] md:text-[26px]"
                      )}
                      style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}
                      title="Bấm để đổi ngành hàng cho bảng này"
                    >
                      <span className="text-center leading-tight break-words max-w-full">{catName}</span>
                      <ChevronDown size={16} className={cn("text-[#FEF08A] transition-transform duration-200 shrink-0 opacity-80 group-hover:opacity-100 no-capture", openNhDropdownFor === catName && "rotate-180")} />
                    </button>

                    {/* Switch Category Popover with Search */}
                    {openNhDropdownFor === catName && (
                      <>
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenNhDropdownFor(null);
                            setCardSearchTerm('');
                          }} 
                        />
                        <div 
                          className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-64 sm:w-72 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-emerald-500 p-2 flex flex-col gap-1.5 export-btn no-capture text-left text-slate-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-2 py-0.5 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
                            <span>CHỌN NGÀNH HÀNG</span>
                            <span className="text-[#059669] font-black">
                              {dropdownCategories.filter(nh => nh.toLowerCase().includes(cardSearchTerm.trim().toLowerCase())).length}/{dropdownCategories.length} MỤC
                            </span>
                          </div>

                          {/* Search Input */}
                          <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2.5]" />
                            <input
                              type="text"
                              value={cardSearchTerm}
                              onChange={(e) => setCardSearchTerm(e.target.value)}
                              placeholder="Gõ tìm ngành hàng..."
                              autoFocus
                              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:bg-white font-bold text-slate-800 placeholder:font-medium placeholder:text-slate-400 uppercase tracking-tight"
                              onClick={(e) => e.stopPropagation()}
                            />
                            {cardSearchTerm && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCardSearchTerm('');
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {/* Filtered category list */}
                          <div className="overflow-y-auto max-h-56 flex flex-col gap-0.5 pr-0.5">
                            {dropdownCategories
                              .filter(nh => nh.toLowerCase().includes(cardSearchTerm.trim().toLowerCase()))
                              .map(nh => {
                                const isCurrent = nh === catName;
                                return (
                                  <button
                                    key={nh}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (nh !== catName) {
                                        setSelectedCategories(prev => {
                                          const idx = prev.indexOf(catName);
                                          if (idx !== -1) {
                                            const next = [...prev];
                                            next[idx] = nh;
                                            return next;
                                          }
                                          return [...prev, nh];
                                        });
                                      }
                                      setOpenNhDropdownFor(null);
                                      setCardSearchTerm('');
                                    }}
                                    className={cn(
                                      "px-2.5 py-1.5 text-xs font-black uppercase tracking-wide text-left transition-colors flex items-center justify-between cursor-pointer rounded-lg",
                                      isCurrent ? "bg-emerald-50 text-emerald-800" : "hover:bg-slate-100 text-slate-700"
                                    )}
                                  >
                                    <span className="truncate pr-2">{nh}</span>
                                    {isCurrent && <Check size={13} className="text-[#059669] shrink-0 stroke-[3]" />}
                                  </button>
                                );
                              })}
                            {dropdownCategories.filter(nh => nh.toLowerCase().includes(cardSearchTerm.trim().toLowerCase())).length === 0 && (
                              <div className="py-3 text-center text-xs font-bold text-slate-400">
                                Không tìm thấy ngành hàng
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <p className="text-white text-[10.5px] sm:text-[13px] font-bold tracking-wide flex items-center justify-center gap-1 opacity-95 mt-1 whitespace-nowrap text-center">
                    <span>⚡ Luỹ kế đến ngày: {yesterdayDate} | Đạt: {reachedCount}/{totalStaff} ({totalStaff > 0 ? ((reachedCount / totalStaff) * 100).toFixed(1) : 0}%)</span>
                  </p>
                </div>

                {/* Table Container with Fixed Layout & Uniform Explicit Column Widths */}
                <div className="overflow-x-auto w-full grow rounded-2xl border border-emerald-300/80">
                  <table className="w-full border-separate border-spacing-0 table-fixed bg-white" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900, minWidth: '470px' }}>
                    <colgroup>
                      <col style={{ width: '40px' }} />
                      <col />
                      <col style={{ width: '62px' }} />
                      <col style={{ width: '58px' }} />
                      <col style={{ width: '72px' }} />
                      <col style={{ width: '52px' }} />
                    </colgroup>
                    <thead>
                      <tr className="text-white font-black text-[12px] sm:text-[13.5px] uppercase tracking-tight h-[55px]">
                        <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">STT</th>
                        <th style={{ fontWeight: 900 }} className="px-2 sm:px-2.5 py-0 text-left text-white border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden">NHÂN VIÊN</th>
                        <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">TARGET</th>
                        <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">LUỸ KẾ</th>
                        <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden">%HT (DK)</th>
                        <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">C.LẠI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowData.map((row, index) => {
                        const roundedRate = Math.round(row.projectedRate);
                        const topCount = Math.max(1, Math.round(rowData.length * 0.2));
                        const isBot = index >= rowData.length - topCount || roundedRate < 50;
                        const isEven = index % 2 === 0;
                        const diff = row.accumulated - row.target;

                        return (
                          <tr
                            key={row.staffName}
                            className={cn(
                              "transition-colors h-[50px] border-b border-emerald-100/90",
                              isEven ? "bg-white" : "bg-emerald-50/20",
                              "hover:bg-emerald-50/70"
                            )}
                          >
                            <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 font-black text-[12px] sm:text-[14.5px] text-slate-700 bg-emerald-50/40 whitespace-nowrap overflow-hidden">
                              #{index + 1}
                            </td>
                            <td style={{ fontWeight: 900 }} className="px-2 sm:px-2.5 py-0.5 border-r border-b border-emerald-100/90 text-left overflow-hidden">
                              <span className={cn(
                                "font-black uppercase tracking-tight text-[12px] sm:text-[14px] whitespace-nowrap block overflow-hidden text-ellipsis",
                                isBot ? "text-rose-600" : "text-slate-900"
                              )}>
                                {row.staffName}
                              </span>
                            </td>
                            <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 font-bold text-[12px] sm:text-[14.5px] text-slate-800 whitespace-nowrap overflow-hidden">
                              {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </td>
                            <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 font-black text-[12px] sm:text-[14.5px] text-rose-600 whitespace-nowrap overflow-hidden">
                              {row.accumulated.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                            </td>
                            <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap overflow-hidden">
                              <span className={cn(
                                "inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-[13px] leading-none",
                                roundedRate >= 100
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-600"
                              )}>
                                {roundedRate}%
                              </span>
                            </td>
                            <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center border-b border-emerald-100/90 whitespace-nowrap overflow-hidden">
                              {diff < -0.0001 ? (
                                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-600 font-black text-[11px] sm:text-[13px] leading-none">
                                  {diff.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {rowData.length > 0 && (
                      <tfoot>
                        <tr className="h-[55px] text-white">
                          <td colSpan={2} style={{ fontWeight: 900 }} className="px-2.5 sm:px-3 py-0 text-center border-r border-emerald-600/50 font-black text-[12px] sm:text-[14.5px] text-white uppercase tracking-widest whitespace-nowrap overflow-hidden bg-[#047857]">
                            Tổng
                          </td>
                          <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap overflow-hidden bg-[#047857]">
                            {(targetPerStaff * rowData.length).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                          </td>
                          <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap overflow-hidden bg-[#047857]">
                            {rowData.reduce((sum, r) => sum + r.accumulated, 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                          </td>
                          <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap overflow-hidden bg-[#047857]">
                            {(() => {
                              const totTarget = targetPerStaff * rowData.length;
                              const totAcc = rowData.reduce((sum, r) => sum + r.accumulated, 0);
                              const totRate = totTarget > 0 && daysPassed > 0
                                ? Math.round((((totAcc / daysPassed) * totalDays) / totTarget) * 100)
                                : 0;
                              return `${totRate}%`;
                            })()}
                          </td>
                          <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center text-white font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap overflow-hidden bg-[#047857]">
                            {(() => {
                              const totTarget = targetPerStaff * rowData.length;
                              const totAcc = rowData.reduce((sum, r) => sum + r.accumulated, 0);
                              const totDiff = totAcc - totTarget;
                              if (totDiff < -0.0001) {
                                return totDiff.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
                              }
                              return null;
                            })()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comment Modal for Category Detail */}
      {commentOpenCat && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[5vh] bg-black/40 backdrop-blur-xs" onClick={() => setCommentOpenCat(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[580px] w-[95vw] mx-4 overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles size={18} className="text-white" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Nhận xét {commentOpenCat}
                </span>
              </div>
              <button onClick={() => setCommentOpenCat(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Template Tabs */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-[12px] font-black text-slate-500 mb-2 uppercase tracking-wide">Chọn mẫu nội dung nhận xét:</p>
              <div className="flex gap-2">
                {[
                  { id: 1 as const, label: 'Mẫu 1: TOP/BOT NV', icon: '🏆' },
                  { id: 2 as const, label: 'Mẫu 2: Dưới 100%', icon: '⚠️' },
                  { id: 3 as const, label: 'Mẫu 3: Tóm tắt', icon: '⚡' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCatCommentTemplate(tab.id);
                      generateCatComment(commentOpenCat!, commentRowData, tab.id);
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all cursor-pointer border ${
                      catCommentTemplate === tab.id
                        ? 'bg-gradient-to-r from-[#ea580c] to-[#f97316] text-white border-orange-500 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
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
                value={catCommentText}
                onChange={(e) => setCatCommentText(e.target.value)}
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
                      await navigator.clipboard.writeText(catCommentText);
                      setCopiedCatComment(true);
                      setTimeout(() => setCopiedCatComment(false), 2000);
                    } catch { /* fallback */ }
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 text-[12px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    copiedCatComment 
                      ? 'text-white bg-emerald-500 border border-emerald-600' 
                      : 'text-white bg-gradient-to-r from-[#ea580c] to-[#f97316] hover:from-[#c2410c] hover:to-[#ea580c] border border-orange-500'
                  }`}
                >
                  {copiedCatComment ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Sao chép nhận xét</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Capture Loading Overlay */}
      <CaptureLoadingOverlay isLoading={isCapturingAll} />

      {/* Image Preview Modal */}
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
    </div>
  );
};

export default React.memo(CategoryDetailByStaffTable);
