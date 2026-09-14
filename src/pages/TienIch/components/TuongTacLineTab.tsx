import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  Calendar, 
  Camera, 
  Copy, 
  Check, 
  UploadCloud, 
  RotateCcw, 
  TrendingUp, 
  Users, 
  Flame, 
  Award, 
  Image as ImageIcon, 
  Smile, 
  FileText, 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Clock,
  ArrowRight,
  Download
} from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { DEFAULT_LINE_CHAT_DATA } from '../data/defaultLineChatData';
import { 
  parseLineChatData, 
  LineChatAnalysisResult, 
  EmployeeInteractionStats 
} from '../utils/lineChatParser';
import { useAuth } from '../../../contexts/AuthContext';
import { useStore } from '../../../contexts/StoreContext';
import { createPortal } from 'react-dom';
import { ImagePreviewModal } from '../../../components/ImagePreviewModal';

const STORAGE_KEY = 'crm_line_chat_data_custom';

export const TuongTacLineTab: React.FC = () => {
  // 1. Raw Data State with LocalStorage persistence
  const [rawChatText, setRawChatText] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_LINE_CHAT_DATA;
    } catch {
      return DEFAULT_LINE_CHAT_DATA;
    }
  });

  // 2. Parse Analysis Results
  const analysis: LineChatAnalysisResult = useMemo(() => {
    return parseLineChatData(rawChatText);
  }, [rawChatText]);

  // Min and Max dates available in data
  const minDateIso = useMemo(() => {
    return analysis.dates.length > 0 ? analysis.dates[0].dateIso : '2026-04-05';
  }, [analysis.dates]);

  const maxDateIso = useMemo(() => {
    return analysis.dates.length > 0 ? analysis.dates[analysis.dates.length - 1].dateIso : '2026-09-09';
  }, [analysis.dates]);

  // 3. Date Range Filter State (Từ ngày - Đến ngày)
  // Default to Month 09/2026 range (from 2026-09-01 to latest date)
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>('2026-09-09');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('09/2026');

  // Contexts for active supermarket tracking & persistence
  const { currentStoreId } = useStore();
  const { userProfile } = useAuth();

  const activeStoreName = useMemo(() => {
    return currentStoreId || userProfile?.ten_sieu_thi || (userProfile?.ma_kho ? `Siêu thị ${userProfile.ma_kho}` : 'House 1841');
  }, [currentStoreId, userProfile?.ten_sieu_thi, userProfile?.ma_kho]);

  const staffFilterStorageKey = useMemo(() => {
    const safeStore = activeStoreName.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    return `crm_line_chat_staff_filter_${safeStore}`;
  }, [activeStoreName]);

  // Persistent Selected Staff List (by supermarket)
  const [selectedStaffNames, setSelectedStaffNames] = useState<string[]>(() => {
    try {
      const safeStore = (currentStoreId || userProfile?.ten_sieu_thi || userProfile?.ma_kho || 'House 1841').replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
      const saved = localStorage.getItem(`crm_line_chat_staff_filter_${safeStore}`);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading saved staff filter:', e);
    }
    return [];
  });

  const [isStaffFilterModalOpen, setIsStaffFilterModalOpen] = useState<boolean>(false);
  const [staffFilterSearch, setStaffFilterSearch] = useState<string>('');

  // Synchronize when store changes or when analysis data finishes parsing
  useEffect(() => {
    if (analysis.employees.length === 0) return;
    try {
      const saved = localStorage.getItem(staffFilterStorageKey);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedStaffNames(parsed);
          return;
        }
      }
    } catch {}
    // If not saved yet for this supermarket, default to all employees
    setSelectedStaffNames(analysis.employees.map(e => e.lineDisplayName));
  }, [staffFilterStorageKey, analysis.employees]);

  const handleToggleStaff = (lineName: string) => {
    setSelectedStaffNames(prev => {
      const next = prev.includes(lineName)
        ? prev.filter(n => n !== lineName)
        : [...prev, lineName];
      try {
        localStorage.setItem(staffFilterStorageKey, JSON.stringify(next));
      } catch (e) {
        console.error('Save staff filter error:', e);
      }
      return next;
    });
  };

  const handleSelectAllStaff = () => {
    const all = analysis.employees.map(e => e.lineDisplayName);
    setSelectedStaffNames(all);
    try {
      localStorage.setItem(staffFilterStorageKey, JSON.stringify(all));
    } catch (e) {
      console.error('Save all staff error:', e);
    }
  };

  const handleDeselectAllStaff = () => {
    setSelectedStaffNames([]);
    try {
      localStorage.setItem(staffFilterStorageKey, JSON.stringify([]));
    } catch (e) {
      console.error('Deselect all staff error:', e);
    }
  };

  // Other UI Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'staff_only' | 'leader_only'>('all');
  const [sortBy, setSortBy] = useState<'total' | 'name' | 'id' | 'avg' | 'days'>('total');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [exportedImageModalUrl, setExportedImageModalUrl] = useState<string | null>(null);
  const [isAutoCopied, setIsAutoCopied] = useState<boolean>(false);
  const [isManualCopied, setIsManualCopied] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [modalInputText, setModalInputText] = useState<string>('');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<EmployeeInteractionStats | null>(null);
  const [showChart, setShowChart] = useState<boolean>(false); // Collapsed by default as requested

  const tableCaptureRef = useRef<HTMLDivElement>(null);

  // Quick Preset Date Handlers
  const handleSelectMonth = (monthStr: string) => {
    setActiveDatePreset(monthStr);
    if (monthStr === 'all') {
      setStartDate(minDateIso);
      setEndDate(maxDateIso);
      return;
    }
    const [m, y] = monthStr.split('/');
    const firstDay = `${y}-${m}-01`;
    // Find last date in that month from available dates
    const datesInMonth = analysis.dates.filter(d => d.monthStr === monthStr);
    const lastDay = datesInMonth.length > 0 ? datesInMonth[datesInMonth.length - 1].dateIso : `${y}-${m}-31`;
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const handleSelectLast7Days = () => {
    setActiveDatePreset('7days');
    if (analysis.dates.length === 0) return;
    const latest = analysis.dates[analysis.dates.length - 1];
    const latestIdx = analysis.dates.length - 1;
    const startIdx = Math.max(0, latestIdx - 6);
    setStartDate(analysis.dates[startIdx].dateIso);
    setEndDate(latest.dateIso);
  };

  const handleSelectLatestDay = () => {
    setActiveDatePreset('today');
    if (analysis.dates.length === 0) return;
    const latest = analysis.dates[analysis.dates.length - 1];
    setStartDate(latest.dateIso);
    setEndDate(latest.dateIso);
  };

  // 4. Filter Dates based on [startDate, endDate]
  const displayDates = useMemo(() => {
    return analysis.dates.filter(d => {
      if (startDate && d.dateIso < startDate) return false;
      if (endDate && d.dateIso > endDate) return false;
      return true;
    });
  }, [analysis.dates, startDate, endDate]);

  // 5. Filter & Sort Employees
  const processedEmployees = useMemo(() => {
    let list = [...analysis.employees];

    // Filter by selected staff from employee filter (per supermarket)
    list = list.filter(e => selectedStaffNames.includes(e.lineDisplayName));

    // Filter by role
    if (roleFilter === 'staff_only') {
      list = list.filter(e => e.role === 'Nhân viên');
    } else if (roleFilter === 'leader_only') {
      list = list.filter(e => e.role === 'Quản lý' || e.role === 'Trưởng ca');
    }

    // Filter by search query (checks LINE display name, real name, and ID)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(e => 
        (e.lineDisplayName && e.lineDisplayName.toLowerCase().includes(q)) ||
        (e.name && e.name.toLowerCase().includes(q)) || 
        (e.realName && e.realName.toLowerCase().includes(q)) ||
        (e.id && e.id.toLowerCase().includes(q)) || 
        (e.shortName && e.shortName.toLowerCase().includes(q))
      );
    }

    // Compute period-specific interaction totals for sorting & display
    const mapped = list.map(emp => {
      let periodTotal = 0;
      let periodActiveDays = 0;
      let periodPeak: { date: string; count: number } | null = null;

      displayDates.forEach(d => {
        const count = emp.dailyCounts[d.date] || 0;
        if (count > 0) {
          periodTotal += count;
          periodActiveDays += 1;
          if (!periodPeak || count > periodPeak.count) {
            periodPeak = { date: d.date, count };
          }
        }
      });

      return {
        ...emp,
        filteredTotal: periodTotal,
        filteredActiveDays: periodActiveDays,
        filteredAvgPerDay: displayDates.length > 0 ? Math.round((periodTotal / displayDates.length) * 10) / 10 : 0,
        filteredPeak: periodPeak
      };
    });

    // Sort
    mapped.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortBy === 'total') {
        valA = a.filteredTotal;
        valB = b.filteredTotal;
      } else if (sortBy === 'days' || sortBy === 'avg') {
        valA = a.filteredActiveDays;
        valB = b.filteredActiveDays;
      } else if (sortBy === 'name') {
        valA = a.lineDisplayName.toLowerCase();
        valB = b.lineDisplayName.toLowerCase();
      } else if (sortBy === 'id') {
        valA = a.id;
        valB = b.id;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      }
      return sortOrder === 'desc' ? String(valB).localeCompare(String(valA)) : String(valA).localeCompare(String(valB));
    });

    return mapped;
  }, [analysis.employees, displayDates, roleFilter, searchTerm, sortBy, sortOrder, selectedStaffNames]);

  // 6. Summary Totals for Selected Period
  const periodSummary = useMemo(() => {
    let totalMessagesInPeriod = 0;
    const dailyTotals: Record<string, number> = {};
    let peakDay: { date: string; count: number } | null = null;

    displayDates.forEach(d => {
      let sum = 0;
      analysis.employees.forEach(e => {
        sum += (e.dailyCounts[d.date] || 0);
      });
      dailyTotals[d.date] = sum;
      totalMessagesInPeriod += sum;

      if (!peakDay || sum > peakDay.count) {
        peakDay = { date: d.date, count: sum };
      }
    });

    const avgPerDay = displayDates.length > 0 ? Math.round((totalMessagesInPeriod / displayDates.length) * 10) / 10 : 0;

    return {
      totalMessagesInPeriod,
      dailyTotals,
      peakDay,
      avgPerDay
    };
  }, [displayDates, analysis.employees]);

  // Total days with at least 1 interaction in selected period
  const totalActiveDaysInPeriod = useMemo(() => {
    return displayDates.filter(d => (periodSummary.dailyTotals[d.date] || 0) > 0).length;
  }, [displayDates, periodSummary.dailyTotals]);

  // Chart data for daily interaction rhythm
  const chartData = useMemo(() => {
    return displayDates.map(d => ({
      date: d.date.slice(0, 5), // "DD/MM"
      fullDate: d.date,
      dayOfWeek: d.dayOfWeek,
      count: periodSummary.dailyTotals[d.date] || 0
    }));
  }, [displayDates, periodSummary.dailyTotals]);

  // Human-friendly date label for headers and reports
  const dateRangeLabel = useMemo(() => {
    if (displayDates.length === 0) return 'Không có ngày nào';
    const first = displayDates[0].date;
    const last = displayDates[displayDates.length - 1].date;
    if (first === last) return `Ngày ${first}`;
    return `Từ ${first} đến ${last} (${displayDates.length} ngày)`;
  }, [displayDates]);

  // Export Table to PNG (Retina 2x) & Auto Copy & Show Popup (Full unclipped table)
  const handleExportPng = async () => {
    if (!tableCaptureRef.current) return;
    setIsCapturing(true);
    setIsAutoCopied(false);
    setIsManualCopied(false);

    try {
      const sourceElement = tableCaptureRef.current;
      const tableEl = sourceElement.querySelector('table');
      // Calculate true natural width of table + padding to prevent any horizontal cut-off
      const tableNaturalWidth = tableEl ? Math.max(tableEl.scrollWidth, tableEl.offsetWidth) : 1200;
      const exportWidth = Math.max(tableNaturalWidth + 40, 1200);

      // Create an off-screen container that allows full dimensions without viewport clipping
      const tempWrapper = document.createElement('div');
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.top = '-99999px';
      tempWrapper.style.left = '-99999px';
      tempWrapper.style.width = `${exportWidth}px`;
      tempWrapper.style.minWidth = `${exportWidth}px`;
      tempWrapper.style.maxWidth = 'none';
      tempWrapper.style.zIndex = '-99999';
      tempWrapper.style.pointerEvents = 'none';
      tempWrapper.style.opacity = '0';
      tempWrapper.style.backgroundColor = '#ffffff';

      // Deep clone the table container
      const clone = sourceElement.cloneNode(true) as HTMLElement;

      // Set explicit styling on clone
      clone.style.width = `${exportWidth}px`;
      clone.style.minWidth = `${exportWidth}px`;
      clone.style.maxWidth = 'none';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.boxShadow = 'none';
      clone.style.borderRadius = '24px';
      clone.style.border = '2px solid #86efac';

      // Expand all scroll containers inside clone so nothing is cut off vertically or horizontally
      const scrollContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
      scrollContainers.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.overflow = 'visible';
        htmlEl.style.overflowX = 'visible';
        htmlEl.style.overflowY = 'visible';
        htmlEl.style.maxHeight = 'none';
        htmlEl.style.maxWidth = 'none';
        htmlEl.style.width = '100%';
        htmlEl.style.height = 'auto';
        htmlEl.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'max-h-[720px]');
      });

      // Expand table inside clone
      const cloneTable = clone.querySelector('table');
      if (cloneTable) {
        const htmlT = cloneTable as HTMLElement;
        htmlT.style.width = '100%';
        htmlT.style.minWidth = '100%';
        htmlT.style.maxWidth = 'none';
        htmlT.style.tableLayout = 'auto';
      }

      // Remove sticky positions in clone so headers and frozen columns flow in normal document position
      const stickyEls = clone.querySelectorAll('[class*="sticky"]');
      stickyEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.position = 'static';
        htmlEl.style.top = 'auto';
        htmlEl.style.bottom = 'auto';
        htmlEl.style.left = 'auto';
        htmlEl.style.right = 'auto';
      });

      // Ensure all badges, cells, headers never wrap or break lines
      const allBadgesAndCells = clone.querySelectorAll('th, td, span, .badge-legend, [class*="rounded-md"]');
      allBadgesAndCells.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.whiteSpace = 'nowrap';
      });

      const titleHeader = clone.querySelector('h2');
      if (titleHeader) {
        titleHeader.style.whiteSpace = 'nowrap';
        titleHeader.style.fontSize = '22px';
      }

      const legendDiv = clone.querySelector('.bg-slate-50\\/90');
      if (legendDiv) {
        (legendDiv as HTMLElement).style.flexWrap = 'nowrap';
        (legendDiv as HTMLElement).style.justifyContent = 'space-between';
      }

      tempWrapper.appendChild(clone);
      document.body.appendChild(tempWrapper);

      // Wait for font rendering and DOM reflow
      if (document.fonts) {
        await document.fonts.ready;
      }
      await new Promise(resolve => setTimeout(resolve, 250));

      const exportHeight = Math.ceil(Math.max(clone.scrollHeight, clone.offsetHeight));

      const dataUrl = await domToPng(clone, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: exportWidth,
        height: exportHeight,
        features: { removeControlCharacter: true }
      });

      // Clean up offscreen clone
      if (document.body.contains(tempWrapper)) {
        document.body.removeChild(tempWrapper);
      }

      // Auto copy image to clipboard
      let autoCopyOk = false;
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type || 'image/png']: blob })
          ]);
          autoCopyOk = true;
        }
      } catch (clipErr) {
        console.warn('Auto copy image to clipboard failed:', clipErr);
      }

      setIsAutoCopied(autoCopyOk);
      setExportedImageModalUrl(dataUrl);
    } catch (err) {
      console.error('Export PNG failed:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Re-copy image from modal
  const handleCopyImageAgain = async () => {
    if (!exportedImageModalUrl) return;
    try {
      const res = await fetch(exportedImageModalUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type || 'image/png']: blob })
        ]);
        setIsManualCopied(true);
        setTimeout(() => setIsManualCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Manual copy image failed:', err);
    }
  };

  // Download image from modal
  const handleDownloadImage = () => {
    if (!exportedImageModalUrl) return;
    const link = document.createElement('a');
    const cleanRange = `${startDate}_den_${endDate}`.replace(/[^a-zA-Z0-9_]/g, '_');
    link.download = `Bang_Tuong_Tac_LINE_${cleanRange}.png`;
    link.href = exportedImageModalUrl;
    link.click();
  };

  // Copy Zalo Summary
  const handleCopyZalo = () => {
    const lines = [
      `📊 BÁO CÁO TỔNG KẾT TƯƠNG TÁC NHÓM LINE - HOUSE 1841`,
      `📅 Giai đoạn: ${dateRangeLabel}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `💬 Tổng lượt tin nhắn toàn ST: ${periodSummary.totalMessagesInPeriod.toLocaleString('vi-VN')} tin`,
      `⚡ Trung bình mỗi ngày: ${periodSummary.avgPerDay} tin/ngày`,
      periodSummary.peakDay ? `🔥 Ngày sôi nổi nhất: ${periodSummary.peakDay.date} (${periodSummary.peakDay.count} tin nhắn)` : '',
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏆 XẾP HẠNG TƯƠNG TÁC NHÂN VIÊN TRÊN LINE:`
    ];

    processedEmployees.slice(0, 10).forEach((emp, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
      lines.push(`${medal} ${emp.lineDisplayName}: ${emp.filteredTotal} tin (TB: ${emp.filteredAvgPerDay} tin/ngày)`);
    });

    lines.push(`\n💪 Chúc team luôn giữ nhiệt huyết, tương tác tích cực và kết nối máu lửa!`);

    const textToCopy = lines.filter(Boolean).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Save Custom Data
  const handleSaveCustomData = () => {
    if (!modalInputText.trim()) return;
    setRawChatText(modalInputText);
    try {
      localStorage.setItem(STORAGE_KEY, modalInputText);
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
    setIsUpdateModalOpen(false);
  };

  // Reset to Default Data
  const handleResetDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn đặt lại dữ liệu nhật ký LINE mặc định ban đầu không?')) {
      setRawChatText(DEFAULT_LINE_CHAT_DATA);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setIsUpdateModalOpen(false);
    }
  };

  // File upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setModalInputText(text);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="space-y-4 font-utm-avo select-none">
      {/* ── 1. PASTEL HEADER BANNER (No stat cards, clean and focused) ── */}
      <div 
        className="w-full rounded-3xl p-5 sm:p-6 shadow-xs border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 45%, #eff6ff 100%)',
          borderColor: '#a7f3d0'
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/90 border border-emerald-300/80 text-[#065f46] text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Tiện Ích Theo Dõi Nhân Sự</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#064e3b] tracking-tight uppercase">
              TƯƠNG TÁC LINE - HOUSE 1841
            </h1>
            <p className="text-xs sm:text-sm font-bold text-[#047857]">
              Xem số lượt tương tác &amp; gửi tin của nhân viên theo ngày từ nhật ký trò chuyện LINE ({dateRangeLabel} • {periodSummary.totalMessagesInPeriod.toLocaleString('vi-VN')} tin nhắn)
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setModalInputText(rawChatText);
                setIsUpdateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/90 hover:bg-white text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-200/90 shadow-xs cursor-pointer transition-all active:scale-95"
            >
              <UploadCloud size={14} className="text-emerald-600" />
              <span>Dán / Cập Nhật Data</span>
            </button>

            <button
              type="button"
              onClick={handleCopyZalo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
            >
              {isCopied ? <Check size={14} className="text-emerald-200" /> : <Copy size={14} />}
              <span>{isCopied ? 'Đã Copy!' : 'Copy Nhận Xét Zalo'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPng}
              disabled={isCapturing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
            >
              <Camera size={14} />
              <span>{isCapturing ? 'Đang Xuất Ảnh...' : 'Xuất Ảnh Bảng (PNG)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FILTER & DATE RANGE BAR (Từ ngày đến ngày) ── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3.5">
        {/* Row 1: Chọn Từ ngày đến ngày & Month Presets */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Custom Date Range: Từ ngày -> Đến ngày */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black">
              <Calendar size={14} className="text-emerald-600" />
              <span>Chọn Ngày:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-slate-500">Từ:</span>
              <input
                type="date"
                value={startDate}
                min={minDateIso}
                max={endDate || maxDateIso}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <ArrowRight size={14} className="text-slate-400" />

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-bold text-slate-500">Đến:</span>
              <input
                type="date"
                value={endDate}
                min={startDate || minDateIso}
                max={maxDateIso}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset('custom');
                }}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-hidden cursor-pointer"
              />
            </div>

            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/60">
              {displayDates.length} ngày
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleSelectLatestDay}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeDatePreset === 'today'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hôm Nay ({analysis.dates.length > 0 ? analysis.dates[analysis.dates.length - 1].date.slice(0, 5) : 'Mới'})
            </button>
            <button
              type="button"
              onClick={handleSelectLast7Days}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeDatePreset === '7days'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => handleSelectMonth('all')}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeDatePreset === 'all'
                  ? 'bg-[#00825e] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        {/* Row 2: Month Quick Tabs & Chart Toggle */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          {/* Quick Month Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-0.5">Theo tháng:</span>
            {analysis.months.map(m => {
              const isActive = activeDatePreset === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00825e] text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  Tháng {m}
                </button>
              );
            })}
          </div>

          {/* Toggle Trend Chart Button */}
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer ml-auto"
          >
            <TrendingUp size={13} />
            <span>{showChart ? 'Ẩn biểu đồ nhịp điệu' : 'Hiện biểu đồ nhịp điệu'}</span>
            {showChart ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>

        {/* Row 3: Search & Role Filters & Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên LINE (VD: CMA_LINH, ĐMNTT_ĐẠI) hoặc mã NV..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-emerald-500 focus:outline-hidden transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Role Filter & Staff Filter & Sort */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút Bộ Lọc Nhân Viên (Lưu theo siêu thị) */}
            <button
              type="button"
              onClick={() => setIsStaffFilterModalOpen(true)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                selectedStaffNames.length < analysis.employees.length
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title={`Bộ lọc nhân viên (${activeStoreName}) - Lưu tự động khi F5`}
            >
              <Users size={14} className={selectedStaffNames.length < analysis.employees.length ? 'text-amber-600' : 'text-slate-500'} />
              <span>Lọc Nhân Viên:</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-black ${
                selectedStaffNames.length < analysis.employees.length
                  ? 'bg-amber-200 text-amber-950'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {selectedStaffNames.length}/{analysis.employees.length}
              </span>
            </button>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'all' ? 'bg-white text-slate-800 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả ({analysis.employees.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('staff_only')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'staff_only' ? 'bg-white text-emerald-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Chỉ Nhân viên
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('leader_only')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  roleFilter === 'leader_only' ? 'bg-white text-indigo-700 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Quản lý / Trưởng ca
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="total-desc">Tương tác: Cao → Thấp</option>
              <option value="total-asc">Tương tác: Thấp → Cao</option>
              <option value="days-desc">Số ngày: Nhiều → Ít</option>
              <option value="days-asc">Số ngày: Ít → Nhiều</option>
              <option value="name-asc">Tên Nhân Viên: A → Z</option>
              <option value="id-asc">Mã NV: Tăng dần</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 3. OPTIONAL INTERACTION TREND CHART ── */}
      <AnimatePresence>
        {showChart && chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
                  Nhịp Điệu Tương Tác Toàn Siêu Thị ({dateRangeLabel})
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">Đơn vị: lượt tin nhắn/ngày</span>
            </div>

            <div className="w-full h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xl border border-slate-700">
                            <p className="text-emerald-300 font-black">{d.dayOfWeek}, {d.fullDate}</p>
                            <p className="text-sm mt-0.5">{d.count} lượt tương tác</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#059669" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorInteractions)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 4. PASTEL MATRIX TABLE CONTAINER ── */}
      <div 
        ref={tableCaptureRef}
        className="w-full bg-white rounded-3xl overflow-hidden border border-emerald-300/80 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
      >
        {/* Table Title Banner */}
        <div 
          className="text-center py-4 px-4 border-b"
          style={{
            background: 'linear-gradient(135deg, #fef08a 0%, #fde68a 50%, #fef3c7 100%)',
            borderColor: '#facc15'
          }}
        >
          <h2 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-[#78350f]">
            BẢNG THEO DÕI TƯƠNG TÁC NHÂN VIÊN THEO NGÀY - HOUSE 1841
          </h2>
          <p className="text-xs sm:text-[13px] font-bold text-[#92400e] mt-1">
            Giai đoạn: {dateRangeLabel} • {processedEmployees.length} nhân sự • {periodSummary.totalMessagesInPeriod.toLocaleString('vi-VN')} lượt tương tác
          </p>
        </div>

        {/* Heatmap Legend */}
        <div className="bg-slate-50/90 px-4 py-2 border-b border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-[11px] font-bold text-slate-600">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-400 font-bold whitespace-nowrap">Mức độ tương tác (tin nhắn/ngày):</span>
            <div className="flex items-center gap-1 ml-1 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-400 font-medium whitespace-nowrap">0 tin (-)</span>
              <span className="px-2 py-0.5 rounded-md bg-[#ecfdf5] text-[#065f46] border border-[#a7f3d0] whitespace-nowrap">1-3 tin</span>
              <span className="px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe] whitespace-nowrap">4-8 tin</span>
              <span className="px-2 py-0.5 rounded-md bg-[#fffbeb] text-[#92400e] border border-[#fde68a] whitespace-nowrap">9-15 tin</span>
              <span className="px-2 py-0.5 rounded-md bg-[#fdf2f8] text-[#9d174d] border border-[#fbcfe8] font-black whitespace-nowrap">≥ 16 tin</span>
            </div>
          </div>
          <span className="text-slate-400 italic whitespace-nowrap hidden sm:inline">💡 Bấm vào dòng nhân viên để xem chi tiết tin nhắn &amp; hình ảnh</span>
        </div>

        {/* Table Content Scroll */}
        <div className="overflow-x-auto max-h-[720px] relative">
          <table className="w-full border-collapse text-left min-w-[900px]">
            {/* Header */}
            <thead className="sticky top-0 z-20">
              <tr className="text-xs uppercase font-black tracking-wider text-slate-700 shadow-xs">
                {/* STT */}
                <th 
                  className="sticky left-0 z-30 py-3.5 px-2 text-center w-[50px] border-r border-b"
                  style={{ backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}
                >
                  STT
                </th>

                {/* Nhân viên */}
                <th 
                  className="sticky left-[50px] z-30 py-3.5 px-3.5 text-left w-[240px] min-w-[220px] border-r border-b"
                  style={{ backgroundColor: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' }}
                >
                  Nhân Viên
                </th>

                {/* Tổng tương tác */}
                <th 
                  className="sticky left-[290px] z-30 py-3.5 px-2.5 text-center w-[95px] border-r border-b"
                  style={{ backgroundColor: '#bfdbfe', color: '#1e40af', borderColor: '#93c5fd' }}
                >
                  Tổng Tin
                </th>

                {/* Số Ngày */}
                <th 
                  className="sticky left-[385px] z-30 py-3.5 px-2 text-center w-[85px] border-r border-b shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]"
                  style={{ backgroundColor: '#bfdbfe', color: '#1e40af', borderColor: '#93c5fd' }}
                >
                  Số Ngày
                </th>

                {/* Date Columns */}
                {displayDates.map(d => {
                  const isWeekend = d.dayOfWeek === 'CN' || d.dayOfWeek === 'Th 7';
                  return (
                    <th 
                      key={d.date}
                      className="py-2.5 px-1.5 text-center min-w-[58px] border-r border-b leading-tight"
                      style={{
                        backgroundColor: isWeekend ? '#fee2e2' : '#f8fafc',
                        color: isWeekend ? '#991b1b' : '#334155',
                        borderColor: '#e2e8f0'
                      }}
                      title={`${d.dayOfWeek}, ${d.date}: ${periodSummary.dailyTotals[d.date] || 0} tin`}
                    >
                      <div className="text-[10px] font-bold uppercase opacity-80">{d.dayOfWeek}</div>
                      <div className="text-[11px] font-black">{d.date.slice(0, 5)}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-100 text-xs font-bold">
              {processedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={displayDates.length + 4} className="py-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p>
                        {selectedStaffNames.length === 0 
                          ? `Bạn chưa chọn nhân viên nào trong bộ lọc (${activeStoreName}).`
                          : `Không tìm thấy dữ liệu tương tác trong khoảng thời gian đã chọn (${dateRangeLabel}).`
                        }
                      </p>
                      {selectedStaffNames.length === 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllStaff}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
                        >
                          Chọn Tất Cả Nhân Viên ({analysis.employees.length})
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                processedEmployees.map((emp, idx) => {
                  const rank = idx + 1;
                  const isEven = idx % 2 === 0;

                  return (
                    <tr
                      key={emp.id || emp.name}
                      onClick={() => setSelectedStaffDetail(emp)}
                      className={`transition-colors group cursor-pointer ${
                        isEven ? 'bg-white' : 'bg-slate-50/40'
                      } hover:bg-emerald-50/60`}
                    >
                      {/* Rank STT */}
                      <td 
                        className={`sticky left-0 z-10 py-3 px-2 text-center font-black border-r border-slate-200/80 ${
                          isEven ? 'bg-white' : 'bg-slate-50/40'
                        } group-hover:bg-emerald-50`}
                      >
                        {rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-xs">
                            1
                          </span>
                        ) : rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-xs">
                            2
                          </span>
                        ) : rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs shadow-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500 font-black">#{rank}</span>
                        )}
                      </td>

                      {/* NHÂN VIÊN: BỎ ICON ĐẦU TÊN VÀ DÒNG PHỤ DƯỚI TÊN */}
                      <td 
                        className={`sticky left-[50px] z-10 py-2.5 px-3.5 border-r border-slate-200/80 ${
                          isEven ? 'bg-white' : 'bg-slate-50/40'
                        } group-hover:bg-emerald-50`}
                      >
                        <div className="font-black text-slate-900 truncate tracking-tight text-xs sm:text-[13px]" title={emp.lineDisplayName}>
                          {emp.lineDisplayName}
                        </div>
                      </td>

                      {/* Total Count in Filtered Period */}
                      <td 
                        className={`sticky left-[290px] z-10 py-2.5 px-2 text-center border-r border-slate-200/80 ${
                          isEven ? 'bg-white' : 'bg-slate-50/40'
                        } group-hover:bg-emerald-50`}
                      >
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200/90 text-indigo-900 font-black text-xs sm:text-sm">
                          {emp.filteredTotal.toLocaleString('vi-VN')}
                        </span>
                      </td>

                      {/* Số Ngày: Số ngày có tương tác / tổng ngày được chọn */}
                      <td 
                        className={`sticky left-[385px] z-10 py-2.5 px-2 text-center border-r border-slate-200/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] ${
                          isEven ? 'bg-white' : 'bg-slate-50/40'
                        } group-hover:bg-emerald-50`}
                      >
                        <span className={`font-black text-xs px-2 py-0.5 rounded-md ${
                          emp.filteredActiveDays > 0 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' 
                            : 'text-slate-400'
                        }`}>
                          {emp.filteredActiveDays}/{displayDates.length}
                        </span>
                      </td>

                      {/* Daily Interaction Cells (Pastel Heatmap) */}
                      {displayDates.map(d => {
                        const count = emp.dailyCounts[d.date] || 0;

                        let cellContent = (
                          <span className="text-slate-300 font-normal select-none">-</span>
                        );

                        if (count >= 16) {
                          cellContent = (
                            <span 
                              className="inline-flex items-center justify-center min-w-[28px] h-6 px-1 rounded-lg text-xs font-black shadow-2xs"
                              style={{ backgroundColor: '#fce7f3', color: '#86198f', border: '1px solid #fbcfe8' }}
                            >
                              {count}
                            </span>
                          );
                        } else if (count >= 9) {
                          cellContent = (
                            <span 
                              className="inline-flex items-center justify-center min-w-[26px] h-6 px-1 rounded-lg text-xs font-black"
                              style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}
                            >
                              {count}
                            </span>
                          );
                        } else if (count >= 4) {
                          cellContent = (
                            <span 
                              className="inline-flex items-center justify-center min-w-[24px] h-6 px-1 rounded-lg text-xs font-black"
                              style={{ backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }}
                            >
                              {count}
                            </span>
                          );
                        } else if (count >= 1) {
                          cellContent = (
                            <span 
                              className="inline-flex items-center justify-center min-w-[22px] h-6 px-1 rounded-lg text-xs font-bold"
                              style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}
                            >
                              {count}
                            </span>
                          );
                        }

                        return (
                          <td 
                            key={d.date}
                            className="py-2 px-1 text-center border-r border-slate-100/90 whitespace-nowrap"
                            title={`${emp.lineDisplayName} - Ngày ${d.date}: ${count} lượt tin nhắn`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Summary Row */}
            <tfoot className="sticky bottom-0 z-20">
              <tr 
                className="text-xs uppercase font-black border-t-2 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                  borderColor: '#34d399',
                  color: '#064e3b'
                }}
              >
                <td className="sticky left-0 z-30 py-3.5 px-2 text-center bg-[#a7f3d0] border-r border-[#6ee7b7]">
                  Σ
                </td>
                <td className="sticky left-[50px] z-30 py-3.5 px-3.5 text-left font-black tracking-wider bg-[#a7f3d0] border-r border-[#6ee7b7]">
                  TỔNG CỘNG ({processedEmployees.length} NV)
                </td>
                <td className="sticky left-[290px] z-30 py-3.5 px-2 text-center bg-[#93c5fd] text-[#1e3a8a] border-r border-[#60a5fa]">
                  {periodSummary.totalMessagesInPeriod.toLocaleString('vi-VN')}
                </td>
                <td className="sticky left-[385px] z-30 py-3.5 px-2 text-center bg-[#93c5fd] text-[#1e3a8a] border-r border-[#60a5fa] shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]">
                  {totalActiveDaysInPeriod}/{displayDates.length}
                </td>

                {/* Daily Column Totals */}
                {displayDates.map(d => {
                  const dayTotal = periodSummary.dailyTotals[d.date] || 0;
                  const isPeak = periodSummary.peakDay?.date === d.date;

                  return (
                    <td 
                      key={d.date}
                      className={`py-3 px-1 text-center font-black border-r border-[#6ee7b7]/60 ${
                        isPeak ? 'bg-[#fef08a] text-[#78350f]' : ''
                      }`}
                      title={`Tổng ngày ${d.date}: ${dayTotal} tin nhắn`}
                    >
                      {dayTotal > 0 ? dayTotal.toLocaleString('vi-VN') : '-'}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── MODAL: BỘ LỌC CHỌN NHÂN VIÊN (LƯU THEO SIÊU THỊ, NẰM TRÊN SIDEBAR QUA PORTAL) ── */}
      {isStaffFilterModalOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">
                      Bộ Lọc Nhân Viên Hiển Thị
                    </h3>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 flex-wrap">
                      <span>Siêu thị: <strong className="text-emerald-700 font-bold">{activeStoreName}</strong></span>
                      <span>•</span>
                      <span className="text-amber-700 font-bold">Tự động lưu khi F5</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStaffFilterModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search & Quick Select Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    value={staffFilterSearch}
                    onChange={(e) => setStaffFilterSearch(e.target.value)}
                    placeholder="Tìm tên nhân viên trong danh sách..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white"
                  />
                  {staffFilterSearch && (
                    <button
                      type="button"
                      onClick={() => setStaffFilterSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllStaff}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black cursor-pointer transition-colors"
                  >
                    Chọn tất cả ({analysis.employees.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllStaff}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black cursor-pointer transition-colors"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              {/* Employee Checklist Grid */}
              <div className="flex-1 min-h-[260px] overflow-y-auto p-1 pr-2 space-y-2 border border-slate-100 rounded-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.employees
                    .filter(emp => {
                      if (!staffFilterSearch.trim()) return true;
                      const q = staffFilterSearch.toLowerCase().trim();
                      return (
                        emp.lineDisplayName.toLowerCase().includes(q) ||
                        (emp.realName && emp.realName.toLowerCase().includes(q)) ||
                        (emp.id && emp.id.toLowerCase().includes(q))
                      );
                    })
                    .map(emp => {
                      const isChecked = selectedStaffNames.includes(emp.lineDisplayName);
                      return (
                        <label
                          key={emp.lineDisplayName}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-xs text-emerald-950'
                              : 'bg-slate-50/50 border-slate-200 text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStaff(emp.lineDisplayName)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-black truncate ${isChecked ? 'text-slate-900' : 'text-slate-500'}`} title={emp.lineDisplayName}>
                              {emp.lineDisplayName}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 truncate flex items-center gap-1.5">
                              {emp.realName && <span>{emp.realName}</span>}
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">{emp.role}</span>
                            </div>
                          </div>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                            isChecked ? 'bg-white text-emerald-800 border border-emerald-200' : 'text-slate-400'
                          }`}>
                            {emp.totalInteractions} tin
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500">
                  Đã chọn: <strong className="text-emerald-700 font-black">{selectedStaffNames.length}</strong> / {analysis.employees.length} nhân sự
                </span>
                <button
                  type="button"
                  onClick={() => setIsStaffFilterModalOpen(false)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  Xong &amp; Xem Bảng
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* ── 5. MODAL: CẬP NHẬT / DÁN DỮ LIỆU LINE (PORTAL TRÊN SIDEBAR) ── */}
      {isUpdateModalOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                      Cập Nhật Lịch Sử Chat LINE
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Dán văn bản xuất từ LINE hoặc tải lên tệp tin .txt
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Upload file button */}
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="text-xs font-bold text-slate-600">
                  📁 Hoặc tải lên file text (.txt) xuất từ LINE:
                </div>
                <label className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-black text-slate-700 cursor-pointer transition-colors shadow-xs">
                  Chọn file .txt
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Textarea */}
              <div className="flex-1 min-h-[220px] flex flex-col space-y-1">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  Nội dung đoạn chat LINE:
                </label>
                <textarea
                  value={modalInputText}
                  onChange={(e) => setModalInputText(e.target.value)}
                  placeholder="Dán toàn bộ nội dung xuất từ ứng dụng LINE vào đây..."
                  className="w-full flex-1 p-3.5 rounded-2xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-hidden resize-none leading-relaxed"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Khôi phục dữ liệu gốc</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUpdateModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCustomData}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-95"
                  >
                    Lưu &amp; Cập Nhật Bảng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* ── 6. MODAL: CHI TIẾT TƯƠNG TÁC NHÂN VIÊN (PORTAL TRÊN SIDEBAR) ── */}
      {selectedStaffDetail && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black ${selectedStaffDetail.avatarBg}`}>
                    {selectedStaffDetail.lineDisplayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {selectedStaffDetail.lineDisplayName}
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      {selectedStaffDetail.realName ? `Họ tên: ${selectedStaffDetail.realName} • ` : ''}
                      Chức danh: <span className="text-emerald-700 font-black">{selectedStaffDetail.role}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStaffDetail(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Message Types Breakdown */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  Phân Loại Nội Dung Tương Tác:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10.5px] font-bold text-slate-400">Tổng tin nhắn</span>
                    <div className="text-xl font-black text-slate-800 mt-0.5">
                      {selectedStaffDetail.totalInteractions.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100 text-center">
                    <span className="text-[10.5px] font-bold text-blue-600 flex items-center justify-center gap-1">
                      <FileText size={12} /> Chữ
                    </span>
                    <div className="text-xl font-black text-blue-900 mt-0.5">
                      {selectedStaffDetail.textCount.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 text-center">
                    <span className="text-[10.5px] font-bold text-emerald-600 flex items-center justify-center gap-1">
                      <ImageIcon size={12} /> Hình ảnh
                    </span>
                    <div className="text-xl font-black text-emerald-900 mt-0.5">
                      {selectedStaffDetail.imageCount.toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100 text-center">
                    <span className="text-[10.5px] font-bold text-amber-600 flex items-center justify-center gap-1">
                      <Smile size={12} /> Sticker
                    </span>
                    <div className="text-xl font-black text-amber-900 mt-0.5">
                      {selectedStaffDetail.stickerCount.toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Số ngày gửi tin trong giai đoạn:</span>
                  <span className="font-black text-slate-800">{selectedStaffDetail.activeDaysCount} / {analysis.dates.length} ngày</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Trung bình mỗi ngày gửi:</span>
                  <span className="font-black text-emerald-700">{selectedStaffDetail.avgPerActiveDay} tin/ngày</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-bold">Ngày tương tác nhiều nhất:</span>
                  <span className="font-black text-purple-700">
                    {selectedStaffDetail.peakDay ? `${selectedStaffDetail.peakDay.date} (${selectedStaffDetail.peakDay.count} tin)` : 'Không có'}
                  </span>
                </div>
                {selectedStaffDetail.originalNames.length > 1 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-bold block mb-1">Các nickname từng dùng trên LINE:</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedStaffDetail.originalNames.map(n => (
                        <span key={n} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-mono text-slate-600">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStaffDetail(null)}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

      {/* ── 7. POPUP XEM TRƯỚC ẢNH ĐÃ XUẤT (NẰM TRÊN THANH SIDEBAR BÊN TRÁI QUA PORTAL Z-[9999999]) ── */}
      <ImagePreviewModal
        previewImage={exportedImageModalUrl}
        setPreviewImage={setExportedImageModalUrl}
      />
    </div>
  );
};
