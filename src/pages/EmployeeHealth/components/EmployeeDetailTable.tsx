import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, TrendingDown, Check, TrendingUp, MessageCircle, X, Copy, Swords, Loader2, Target, BarChart3, Trophy, PieChart, Clock, Gift, Store, ShoppingCart, Calendar } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { domToPng } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import { CaptureLoadingOverlay } from '../../../components/CaptureLoadingOverlay';
import { ensureFontsReady, EXPORT_FONT_STYLE, ensureSharedCaptureStyle, getPreloadedFontCss, injectFontStyleIntoClone, preloadFontDataCache, computeOptimalExportScale, renderIsolatedCardFastToDataUrl } from '../../../utils/fontExportUtil';
import { parseCategoryData, cn, cleanCategoryName as sharedCleanCategoryName, normalize } from '../../RTST/utils';
import { CategoryData, StaffMatrixData } from '../../RTST/types';
import { parseStaffMatrixDataRefined, isSameCategoryClean } from './SummaryThiDuaTable';
import { extractStaffNameAndId } from '../utils/staffParserHelper';
import { CategoryConfigItem } from '../../../hooks/useCategoryConfig';

export const removeAccents = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

export const cleanCategoryName = sharedCleanCategoryName;

interface EmployeeDetailTableProps {
  staffName: string;
  luyKeNganhHang: string;
  thiDuaNv: string;
  staffCount: number;
  selectedStaffIds?: string[];
  daysPassed: number;
  totalDays: number;
  categoryTargets: any[];
  luykeCategories?: CategoryData[];
  categoryConfig?: CategoryConfigItem[];
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

// Reusable mini table for a single section (SỐ LƯỢNG LŨY KẾ or DOANH THU LŨY KẾ)
const SectionTable: React.FC<{
  title: string;
  variant?: 'emerald' | 'navy';
  daysPassed: number;
  totalDays: number;
  rowData: { name: string; target: number; accumulated: number; percentHT: number; remainingVal: number }[];
}> = ({ title, variant = 'emerald', daysPassed, totalDays, rowData }) => {
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [copiedComment, setCopiedComment] = useState(false);

  if (rowData.length === 0) {
    return null;
  }

  const reachedCount = rowData.filter(r => r.percentHT >= 100).length;
  const reachedPct = rowData.length > 0 ? Math.round((reachedCount / rowData.length) * 100) : 0;

  const totalTarget = rowData.reduce((sum, r) => sum + r.target, 0);
  const totalAccumulated = rowData.reduce((sum, r) => sum + r.accumulated, 0);
  const totalPercentHT = (totalTarget > 0 && daysPassed > 0)
    ? (((totalAccumulated / daysPassed) * totalDays) / totalTarget) * 100
    : (totalTarget > 0 ? (totalAccumulated / totalTarget) * 100 : 0);
  const totalRemaining = totalAccumulated - totalTarget;

  const getBarWidthPct = (value: number | string) => {
    const raw = typeof value === 'string'
      ? parseFloat(value.replace(/%/g, '').replace(/,/g, '.').trim())
      : Number(value);
    const percentHT = Number.isFinite(raw) ? raw : 0;
    return Math.min(Math.max(percentHT, 0), 100);
  };

  const isNavy = variant === 'navy';

  return (
    <div className="emp-section-table w-full max-w-full min-w-0 flex flex-col rounded-[14px] sm:rounded-[18px] border border-[#CFE0F0] bg-white p-[2px] sm:p-[6px] overflow-hidden shadow-[0_3px_12px_-3px_rgba(16,35,63,0.06)]">
      {/* Section Header Banner */}
      <div
        className={cn(
          "emp-section-banner keep-overflow-hidden relative flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-[4px] sm:gap-[10px] px-[8px] sm:px-[16px] py-[7px] sm:py-[11px] rounded-[10px] sm:rounded-[13px] text-white overflow-hidden",
          isNavy
            ? "bg-gradient-to-r from-[#0B3568] via-[#115096] to-[#0E62A8]"
            : "bg-gradient-to-r from-[#086353] via-[#0B846B] to-[#0D6B68]"
        )}
        style={{
          background: isNavy
            ? 'linear-gradient(90deg, #0B3568 0%, #115096 55%, #0E62A8 100%)'
            : 'linear-gradient(90deg, #086353 0%, #0B846B 55%, #0D6B68 100%)',
        }}
      >
        {/* Decorative glossy wave inside banner (solid hex + opacity to avoid SVG url() export issues) */}
        <svg
          viewBox="0 0 600 60"
          preserveAspectRatio="none"
          className="pointer-events-none select-none absolute inset-0 w-full h-full"
        >
          <path
            d="M190,60 C265,4 355,4 435,60 L600,60 L600,0 L150,0 Z"
            fill="#FFFFFF"
            fillOpacity="0.14"
          />
          <path
            d="M235,60 C295,14 365,14 425,60 Z"
            fill="#FFFFFF"
            fillOpacity="0.12"
          />
        </svg>

        {/* Left: Icon + Title */}
        <div className="flex items-center gap-[5px] sm:gap-[10px] min-w-0 z-10">
          <div className="emp-banner-icon-box w-[23px] h-[23px] sm:w-[32px] sm:h-[32px] rounded-[7px] sm:rounded-[10px] bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            {isNavy ? (
              <ShoppingCart className="w-[13px] h-[13px] sm:w-[17px] sm:h-[17px] text-white" strokeWidth={2.4} />
            ) : (
              <Store className="w-[13px] h-[13px] sm:w-[17px] sm:h-[17px] text-white" strokeWidth={2.4} />
            )}
          </div>
          <span
            className="emp-section-title text-[11.5px] min-[390px]:text-[12px] min-[420px]:text-[13px] sm:text-[16px] font-black uppercase tracking-[0.01em] sm:tracking-[0.03em] text-white leading-tight whitespace-nowrap"
            style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}
          >
            {title}
          </span>
        </div>

        {/* Right: Reached summary + glossy capsule progress bar */}
        <div className="flex items-center gap-[5px] sm:gap-[10px] z-10 shrink-0 ml-auto">
          <span className="emp-section-meta inline-flex items-center gap-[3.5px] sm:gap-[6px] text-[10px] min-[390px]:text-[10.5px] min-[420px]:text-[11.5px] sm:text-[13px] font-extrabold text-white uppercase tracking-[0.01em] sm:tracking-[0.02em] whitespace-nowrap">
            <Target className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] text-white shrink-0" strokeWidth={2.3} />
            <span>ĐẠT: {reachedCount}/{rowData.length}</span>
            <span className="opacity-65">|</span>
            <span>{reachedPct}%</span>
          </span>
          <div
            className="emp-banner-progress-track keep-overflow-hidden w-[44px] min-[390px]:w-[50px] min-[420px]:w-[60px] sm:w-[104px] h-[11px] sm:h-[16px] rounded-full bg-white/30 p-[2px] border border-white/55 overflow-hidden shrink-0 flex items-center"
          >
            <div
              className={cn(
                "emp-progress-fill h-full rounded-full",
                isNavy
                  ? "bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#93C5FD]"
                  : "bg-gradient-to-r from-[#059669] via-[#10B981] to-[#6EE7B7]"
              )}
              style={{
                width: `${Math.min(100, Math.max(reachedPct > 0 ? 15 : 0, reachedPct))}%`,
                height: '100%',
                background: isNavy
                  ? 'linear-gradient(90deg, #2563EB 0%, #3B82F6 55%, #93C5FD 100%)'
                  : 'linear-gradient(90deg, #059669 0%, #10B981 55%, #6EE7B7 100%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Dedicated Mobile Table Scroll Container */}
      <div
        className="employee-table-scroll mobile-table-scroll w-full max-w-full min-w-0 overflow-x-auto overflow-y-visible bg-white custom-scrollbar relative mt-[4px] sm:mt-[5px] rounded-[9px] sm:rounded-[12px]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <table
          className="employee-data-table no-mobile-zoom w-full border-separate border-spacing-0 bg-white text-[12px] sm:text-[13px]"
          style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}
        >
          <colgroup>
            <col className="col-stt" />
            <col className="col-name" />
            <col className="col-target" />
            <col className="col-luyke" />
            <col className="col-ht" />
            <col className="col-conlai" />
          </colgroup>
          <thead>
            <tr
              className={cn(
                "text-white font-black text-[9.5px] min-[390px]:text-[10px] min-[420px]:text-[10.5px] sm:text-[12px] uppercase tracking-[-0.03em] sm:tracking-[0.02em] h-[34px] sm:h-[38px]",
                isNavy
                  ? "bg-gradient-to-r from-[#134272] via-[#1A548D] to-[#164A7D]"
                  : "bg-gradient-to-r from-[#0F655D] via-[#14746A] to-[#0F6363]"
              )}
              style={{
                background: isNavy
                  ? 'linear-gradient(90deg, #134272 0%, #1A548D 50%, #164A7D 100%)'
                  : 'linear-gradient(90deg, #0F655D 0%, #14746A 50%, #0F6363 100%)',
              }}
            >
              <th style={{ fontWeight: 900 }} className="col-stt px-[1.5px] sm:px-[4px] py-0 text-center border-r border-b border-white/15 text-white whitespace-nowrap rounded-tl-[8px] sm:rounded-tl-[10px]">STT</th>
              <th style={{ fontWeight: 900 }} className="col-name px-[4px] sm:px-[12px] py-0 text-left border-r border-b border-white/15 text-white whitespace-nowrap">NGÀNH HÀNG</th>
              <th style={{ fontWeight: 900 }} className="col-target px-[1.5px] sm:px-[4px] py-0 text-center border-r border-b border-white/15 text-white whitespace-nowrap">TARGET</th>
              <th style={{ fontWeight: 900 }} className="col-luyke px-[1.5px] sm:px-[4px] py-0 text-center border-r border-b border-white/15 text-white whitespace-nowrap">LŨY KẾ</th>
              <th style={{ fontWeight: 900 }} className="col-ht p-0 border-r border-b border-white/15 text-white whitespace-nowrap">
                <div className="flex items-center h-full w-full">
                  <span className="emp-ht-header-label w-[36px] min-[412px]:w-[40px] sm:w-[58px] text-center shrink-0">% HT</span>
                  <span className="flex-1" />
                </div>
              </th>
              <th style={{ fontWeight: 900 }} className="col-conlai px-[1.5px] sm:px-[4px] py-0 text-center border-b border-white/15 text-white whitespace-nowrap rounded-tr-[8px] sm:rounded-tr-[10px]">CÒN LẠI</th>
            </tr>
          </thead>
          <tbody>
            {rowData.map((row, index) => {
              const isEven = index % 2 === 0;
              const isReached = row.percentHT >= 100;

              const rowBgClass = isReached
                ? (isEven ? "bg-white hover:bg-[#F1F8F5]" : (isNavy ? "bg-[#F5F9FD] hover:bg-[#ECF4FC]" : "bg-[#F3FAF7] hover:bg-[#E9F6F0]"))
                : (isEven ? "bg-[#FFF5F7] hover:bg-[#FFECF0]" : "bg-[#FFEDF1] hover:bg-[#FFE3E9]");

              const borderClass = isReached ? "border-[#E3ECF5]" : "border-[#FAD5DD]";
              const barWidth = getBarWidthPct(row.percentHT);

              return (
                <tr
                  key={row.name}
                  className={cn(
                    "transition-colors min-h-[38px] sm:min-h-[40px]",
                    rowBgClass
                  )}
                >
                  {/* STT Column - Solid-fill Hexagon medal for Top 1-3 (never black in export), badge for 4+ */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "emp-num-cell px-[2px] sm:px-[4px] py-[6px] sm:py-[7px] text-center border-r border-b whitespace-nowrap align-middle",
                      borderClass,
                      index === rowData.length - 1 && "rounded-bl-[8px] sm:rounded-bl-[10px]"
                    )}
                  >
                    {isReached && index === 0 ? (
                      <div className="emp-medal-hex relative w-[23px] h-[25px] sm:w-[26px] sm:h-[28px] mx-auto flex items-center justify-center">
                        <svg viewBox="0 0 28 30" className="w-full h-full">
                          <polygon points="14,1 26,8 26,22 14,29 2,22 2,8" fill="#D97706" stroke="#FBBF24" strokeWidth="1.4" />
                          <polygon points="14,2.5 24.5,8.8 24.5,21.2 14,27.5 3.5,21.2 3.5,8.8" fill="#F59E0B" />
                          <polygon points="14,2.5 24.5,8.8 14,15 3.5,8.8" fill="#FDE047" fillOpacity="0.45" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] sm:text-[12px] leading-none">1</span>
                      </div>
                    ) : isReached && index === 1 ? (
                      <div className="emp-medal-hex relative w-[23px] h-[25px] sm:w-[26px] sm:h-[28px] mx-auto flex items-center justify-center">
                        <svg viewBox="0 0 28 30" className="w-full h-full">
                          <polygon points="14,1 26,8 26,22 14,29 2,22 2,8" fill="#64748B" stroke="#CBD5E1" strokeWidth="1.4" />
                          <polygon points="14,2.5 24.5,8.8 24.5,21.2 14,27.5 3.5,21.2 3.5,8.8" fill="#94A3B8" />
                          <polygon points="14,2.5 24.5,8.8 14,15 3.5,8.8" fill="#E2E8F0" fillOpacity="0.5" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] sm:text-[12px] leading-none">2</span>
                      </div>
                    ) : isReached && index === 2 ? (
                      <div className="emp-medal-hex relative w-[23px] h-[25px] sm:w-[26px] sm:h-[28px] mx-auto flex items-center justify-center">
                        <svg viewBox="0 0 28 30" className="w-full h-full">
                          <polygon points="14,1 26,8 26,22 14,29 2,22 2,8" fill="#9A3412" stroke="#FB923C" strokeWidth="1.4" />
                          <polygon points="14,2.5 24.5,8.8 24.5,21.2 14,27.5 3.5,21.2 3.5,8.8" fill="#EA580C" />
                          <polygon points="14,2.5 24.5,8.8 14,15 3.5,8.8" fill="#FDBA74" fillOpacity="0.45" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white font-black text-[11px] sm:text-[12px] leading-none">3</span>
                      </div>
                    ) : isReached ? (
                      <span className="emp-rank-circle w-[22px] h-[22px] sm:w-[24px] sm:h-[24px] rounded-full bg-[#E8EFF7] text-[#0E2240] font-black text-[11px] sm:text-[12px] inline-flex items-center justify-center mx-auto leading-none tabular-nums">
                        {index + 1}
                      </span>
                    ) : (
                      <span className="emp-rank-unreached text-[#D91B42] font-black text-[12px] sm:text-[13px] leading-none tabular-nums">
                        {index + 1}
                      </span>
                    )}
                  </td>

                  {/* NGÀNH HÀNG Column */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "emp-cat-name-cell px-[4px] sm:px-[12px] py-[6.5px] sm:py-[8px] border-r border-b text-left text-[11.5px] min-[412px]:text-[12px] sm:text-[13px] font-black uppercase leading-[1.3] align-middle",
                      borderClass,
                      isReached ? "text-[#10233F]" : "text-[#D91B42]"
                    )}
                  >
                    <div className="emp-cat-name-text leading-[1.3] tracking-[-0.02em] sm:tracking-normal">
                      {row.name}
                    </div>
                  </td>

                  {/* TARGET Column */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "emp-num-cell px-[1.5px] sm:px-[4px] py-[6px] sm:py-[7px] text-center border-r border-b text-[11.5px] min-[390px]:text-[12px] min-[412px]:text-[12.5px] sm:text-[13px] font-black text-[#10233F] whitespace-nowrap tabular-nums align-middle",
                      borderClass
                    )}
                  >
                    {row.target.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                  </td>

                  {/* LŨY KẾ Column */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "emp-num-cell px-[1.5px] sm:px-[4px] py-[6px] sm:py-[7px] text-center border-r border-b text-[11.5px] min-[390px]:text-[12px] min-[412px]:text-[12.5px] sm:text-[13px] font-black whitespace-nowrap tabular-nums align-middle",
                      borderClass,
                      isReached ? "text-[#059669]" : "text-[#D91B42]"
                    )}
                  >
                    {row.accumulated.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </td>

                  {/* % HT Column: Badge + Horizontal Progress Bar */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "emp-ht-cell p-0 border-r border-b whitespace-nowrap align-middle",
                      borderClass
                    )}
                  >
                    <div className="emp-ht-inner flex items-center w-full h-full py-[6px] sm:py-[7px] px-[2px] sm:px-[6px] gap-[3px] sm:gap-[8px]">
                      <div className={cn("emp-ht-badge-col w-[33px] min-[412px]:w-[37px] sm:w-[56px] flex items-center justify-center shrink-0 pr-[2px] sm:pr-[5px] border-r", borderClass)}>
                        <span
                          className={cn(
                            "emp-ht-badge inline-flex items-center justify-center px-[1.5px] sm:px-[7px] py-[2.5px] sm:py-[3.5px] rounded-[5px] sm:rounded-[6px] font-black text-[10px] min-[390px]:text-[10.5px] min-[412px]:text-[11px] sm:text-[12px] leading-none tabular-nums w-full",
                            isReached
                              ? "bg-[#DCFCE7] text-[#059669]"
                              : "bg-[#FFE0E6] text-[#D91B42]"
                          )}
                        >
                          {row.percentHT.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        className={cn(
                          "emp-progress-track keep-overflow-hidden flex-1 h-[12px] sm:h-[14px] rounded-full overflow-hidden p-[1.5px] min-w-[32px] min-[412px]:min-w-[40px] sm:min-w-[60px] flex items-center",
                          isReached ? "bg-[#E2ECF5] border border-[#D2E0EE]" : "bg-[#FAD8E0] border border-[#F5C2CE]"
                        )}
                      >
                        <div
                          className={cn(
                            "emp-progress-fill h-full rounded-full",
                            isReached
                              ? "bg-gradient-to-r from-[#047857] via-[#10B981] to-[#34D399]"
                              : "bg-gradient-to-r from-[#DC2626] via-[#EF4444] to-[#FB7185]"
                          )}
                          style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: isReached
                              ? 'linear-gradient(90deg, #047857 0%, #10B981 55%, #34D399 100%)'
                              : 'linear-gradient(90deg, #DC2626 0%, #EF4444 55%, #FB7185 100%)',
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* CÒN LẠI Column */}
                  <td
                    style={{ fontWeight: 900 }}
                    className={cn(
                      "emp-num-cell px-[2px] sm:px-[4px] py-[6px] sm:py-[7px] text-center border-b text-[11.5px] min-[390px]:text-[12px] min-[412px]:text-[12.5px] sm:text-[13px] font-black whitespace-nowrap align-middle",
                      borderClass,
                      (isReached || row.remainingVal >= 0) ? "text-[#059669]" : "text-[#D91B42]",
                      index === rowData.length - 1 && "rounded-br-[8px] sm:rounded-br-[10px]"
                    )}
                  >
                    <div className="flex items-center justify-center w-full gap-[2.5px] sm:gap-[4px]">
                      {(isReached || row.remainingVal >= 0) ? (
                        <span
                          className="emp-check-circle w-[19px] h-[19px] sm:w-[22px] sm:h-[22px] bg-gradient-to-b from-[#34D399] via-[#10B981] to-[#059669] rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(180deg, #34D399 0%, #10B981 55%, #059669 100%)' }}
                        >
                          <Check size={11.5} className="text-white" strokeWidth={3.2} />
                        </span>
                      ) : (
                        <>
                          <span className="tabular-nums font-black text-[#D91B42]">
                            {Math.abs(row.remainingVal).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                          </span>
                          <button
                            className="no-capture text-[#F59E0B] hover:text-[#D97706] transition-colors shrink-0 cursor-pointer p-[1px]"
                            title="Xem nhận xét"
                            onClick={() => {
                              const comment = generateComment(row.name, row.remainingVal, row.percentHT);
                              setActiveComment(row.name);
                              setCommentText(comment);
                              setCopiedComment(false);
                            }}
                          >
                            <MessageCircle size={12.5} strokeWidth={2.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="hidden">
            <tr
              className="bg-gradient-to-r from-[#DCF6E8] via-[#E6F9F0] to-[#DBF5E7] border-t-[1.5px] border-[#BCE8D1] min-h-[40px] sm:min-h-[44px]"
              style={{ background: 'linear-gradient(90deg, #DCF6E8 0%, #E6F9F0 50%, #DBF5E7 100%)' }}
            >
              <td className="emp-num-cell px-[2px] sm:px-[4px] py-[7.5px] sm:py-[9px] text-center border-r border-[#C5ECDA] whitespace-nowrap align-middle rounded-bl-[8px] sm:rounded-bl-[10px]">
                {isNavy ? (
                  <ShoppingCart className="w-[16px] h-[16px] sm:w-[19px] sm:h-[19px] text-[#046C4E] mx-auto" strokeWidth={2.6} />
                ) : (
                  <span className="text-[#046C4E] font-black text-[16px] sm:text-[18px] leading-none">
                    ∑
                  </span>
                )}
              </td>
              <td
                style={{ fontWeight: 900 }}
                className="emp-cat-name-cell px-[5px] sm:px-[12px] py-[7.5px] sm:py-[9px] text-left border-r border-[#C5ECDA] text-[12px] min-[412px]:text-[12.5px] sm:text-[14px] font-black text-[#10233F] uppercase tracking-[0.02em] align-middle"
              >
                TỔNG
              </td>
              <td
                style={{ fontWeight: 900 }}
                className="emp-num-cell px-[2px] sm:px-[4px] py-[7.5px] sm:py-[9px] text-center border-r border-[#C5ECDA] text-[12px] min-[412px]:text-[12.5px] sm:text-[14px] font-black text-[#10233F] whitespace-nowrap tabular-nums align-middle"
              >
                {totalTarget.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
              </td>
              <td
                style={{ fontWeight: 900 }}
                className="emp-num-cell px-[2px] sm:px-[4px] py-[7.5px] sm:py-[9px] text-center border-r border-[#C5ECDA] text-[12px] min-[412px]:text-[12.5px] sm:text-[14px] font-black text-[#10233F] whitespace-nowrap tabular-nums align-middle"
              >
                {totalAccumulated.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </td>
              <td
                style={{ fontWeight: 900 }}
                className="emp-ht-cell p-0 border-r border-[#C5ECDA] whitespace-nowrap align-middle"
              >
                <div className="flex items-center w-full h-full py-[7.5px] sm:py-[9px] px-[2px] sm:px-[6px] gap-[3px] sm:gap-[8px]">
                  <div className="emp-ht-badge-col w-[33px] min-[412px]:w-[37px] sm:w-[56px] flex items-center justify-center shrink-0 pr-[2px] sm:pr-[5px] border-r border-[#C5ECDA]">
                    <span
                      className={cn(
                        "emp-ht-badge inline-flex items-center justify-center px-[1.5px] sm:px-[7px] py-[2.5px] sm:py-[3.5px] rounded-[5px] sm:rounded-[6px] font-black text-[10px] min-[390px]:text-[10.5px] min-[412px]:text-[11px] sm:text-[12.5px] leading-none tabular-nums w-full",
                        totalPercentHT >= 100
                          ? "bg-[#BCEFD5] text-[#046C4E]"
                          : "bg-[#FFE0E6] text-[#D91B42]"
                      )}
                    >
                      {totalPercentHT.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    className={cn(
                      "emp-progress-track keep-overflow-hidden flex-1 h-[12px] sm:h-[14px] rounded-full overflow-hidden p-[1.5px] min-w-[32px] min-[412px]:min-w-[40px] sm:min-w-[60px] flex items-center",
                      totalPercentHT >= 100 ? "bg-[#C2EBD7] border border-[#A7E2C4]" : "bg-[#FAD8E0] border border-[#F5C2CE]"
                    )}
                  >
                    <div
                      className={cn(
                        "emp-progress-fill h-full rounded-full",
                        totalPercentHT >= 100
                          ? "bg-gradient-to-r from-[#047857] via-[#10B981] to-[#34D399]"
                          : "bg-gradient-to-r from-[#DC2626] via-[#EF4444] to-[#FB7185]"
                      )}
                      style={{
                        width: `${getBarWidthPct(totalPercentHT)}%`,
                        height: '100%',
                        background: totalPercentHT >= 100
                          ? 'linear-gradient(90deg, #047857 0%, #10B981 55%, #34D399 100%)'
                          : 'linear-gradient(90deg, #DC2626 0%, #EF4444 55%, #FB7185 100%)',
                      }}
                    />
                  </div>
                </div>
              </td>
              <td
                style={{ fontWeight: 900 }}
                className="emp-num-cell px-[2px] sm:px-[4px] py-[7.5px] sm:py-[9px] text-center text-[12px] min-[412px]:text-[12.5px] sm:text-[14px] font-black whitespace-nowrap tabular-nums align-middle rounded-br-[8px] sm:rounded-br-[10px]"
              >
                {(totalPercentHT >= 100 || totalRemaining >= 0) ? (
                  <span className="text-[#10233F] font-black">-</span>
                ) : (
                  <span className="text-[#D91B42] font-black">
                    {Math.abs(totalRemaining).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Comment Popup - Redesigned like FORM NHẬN XÉT reference */}
      {activeComment && (
        <div className="no-capture fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs" onClick={() => setActiveComment(null)}>
          <div className="bg-white rounded-[16px] shadow-2xl max-w-[520px] w-[95vw] mx-[16px] overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            {/* Header - Orange gradient */}
            <div className="flex items-center justify-between px-[18px] py-[14px] bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#fb923c] text-white">
              <div className="flex items-center gap-[10px]">
                <MessageCircle size={18} className="text-white shrink-0" />
                <span className="text-[14px] font-black text-white uppercase tracking-wide" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
                  Form nhận xét: {activeComment}
                </span>
              </div>
              <button onClick={() => setActiveComment(null)} className="p-[6px] rounded-[8px] hover:bg-white/20 text-white transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-[18px]">
              {/* Label */}
              <p className="text-[13px] font-black text-slate-700 mb-[10px] uppercase tracking-wide">
                Nội dung nhận xét (có thể chỉnh sửa trực tiếp):
              </p>

              {/* Editable textarea */}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-[12px] px-[14px] py-[12px] text-[13px] font-bold text-slate-800 leading-relaxed resize-y focus:ring-2 focus:ring-orange-400/40 focus:border-orange-400 outline-none bg-slate-50/50"
                style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
              />

              {/* Footer */}
              <div className="flex items-center justify-between mt-[14px] gap-[10px] flex-wrap">
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
                  className={`flex items-center gap-[8px] px-[18px] py-[10px] text-[12px] font-black uppercase tracking-wider rounded-[10px] transition-all cursor-pointer ${
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

// Module-level memo cache so 20+ EmployeeDetailTable cards rendered in "Chi tiết nhân viên"
// share 1 single parse of luyKeNganhHang and thiDuaNv instead of re-parsing 20 times.
let cachedEffLuykeInput: {
  luykeCategories: any;
  luyKeNganhHang: string;
  daysPassed: number;
  totalDays: number;
  result: CategoryData[];
} | null = null;

let cachedStaffMatrixInput: {
  thiDuaNv: string;
  staffCount: number;
  categoryTargets: any;
  effectiveLuykeCategories: CategoryData[];
  daysPassed: number;
  totalDays: number;
  categoryConfig: any;
  result: ReturnType<typeof parseStaffMatrixDataRefined>;
} | null = null;

const EmployeeDetailTable: React.FC<EmployeeDetailTableProps> = ({
  staffName,
  luyKeNganhHang,
  thiDuaNv,
  staffCount,
  selectedStaffIds,
  daysPassed,
  totalDays,
  categoryTargets,
  luykeCategories = [],
  categoryConfig,
  staffTargetQd = 0,
  staffDtqd = 0,
  staffPercentHT = 0,
  staffHieuQuaQd = null,
  staffBonusHientai = null,
  staffInstallmentPercent = null,
  onPreviewImage,
  onOpenCompare,
}) => {
  // Ensure luyKeNganhHang raw store report is also parsed and merged into effectiveLuykeCategories when luykeCategories is empty or partial
  const effectiveLuykeCategories = useMemo(() => {
    if (
      cachedEffLuykeInput &&
      cachedEffLuykeInput.luykeCategories === luykeCategories &&
      cachedEffLuykeInput.luyKeNganhHang === luyKeNganhHang &&
      cachedEffLuykeInput.daysPassed === daysPassed &&
      cachedEffLuykeInput.totalDays === totalDays
    ) {
      return cachedEffLuykeInput.result;
    }
    const base = Array.isArray(luykeCategories) ? [...luykeCategories] : [];
    if (luyKeNganhHang && luyKeNganhHang.trim()) {
      const parsedFromRaw = parseCategoryData(luyKeNganhHang, daysPassed, totalDays, [], 'LUYKE');
      parsedFromRaw.forEach(c => {
        const clean = cleanCategoryName(c.name);
        if (!clean) return;
        if (!base.some(b => normalize(b.name || '') === normalize(c.name || '') && (!b.type || !c.type || b.type === c.type))) {
          base.push(c);
        }
      });
    }
    cachedEffLuykeInput = {
      luykeCategories,
      luyKeNganhHang,
      daysPassed,
      totalDays,
      result: base
    };
    return base;
  }, [luykeCategories, luyKeNganhHang, daysPassed, totalDays]);

  // Parse staff matrix using refined unified parser (shared across all cards via cachedStaffMatrixInput)
  const { staffMatrix, categories: detailCategories, categoryTypes: parsedCategoryTypes = {} } = useMemo(() => {
    if (
      cachedStaffMatrixInput &&
      cachedStaffMatrixInput.thiDuaNv === thiDuaNv &&
      cachedStaffMatrixInput.staffCount === staffCount &&
      cachedStaffMatrixInput.categoryTargets === categoryTargets &&
      cachedStaffMatrixInput.effectiveLuykeCategories === effectiveLuykeCategories &&
      cachedStaffMatrixInput.daysPassed === daysPassed &&
      cachedStaffMatrixInput.totalDays === totalDays &&
      cachedStaffMatrixInput.categoryConfig === categoryConfig
    ) {
      return cachedStaffMatrixInput.result;
    }
    const res = parseStaffMatrixDataRefined(thiDuaNv, staffCount, categoryTargets, effectiveLuykeCategories, daysPassed, totalDays, false, categoryConfig);
    cachedStaffMatrixInput = {
      thiDuaNv,
      staffCount,
      categoryTargets,
      effectiveLuykeCategories,
      daysPassed,
      totalDays,
      categoryConfig,
      result: res
    };
    return res;
  }, [thiDuaNv, staffCount, categoryTargets, effectiveLuykeCategories, daysPassed, totalDays, categoryConfig]);
  
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

  // Build a comprehensive lookup for category type ('SL' vs 'DT') from all sources:
  // 1. parsedCategoryTypes (from thiDuaNv section headers)
  // 2. effectiveLuykeCategories (from BC THÁNG / lk_nh_sieu_thi)
  // 3. categoryTargets (from store category_targets)
  const catTypeLookup: Record<string, 'SL' | 'DT' | 'ALL'> = { ...parsedCategoryTypes };
  effectiveLuykeCategories.forEach(cat => {
    const clean = cleanCategoryName(cat.name);
    if (!clean) return;
    if (cat.type && cat.type !== 'ALL') {
      catTypeLookup[clean] = cat.type;
    } else if (!catTypeLookup[clean]) {
      catTypeLookup[clean] = cat.type || 'ALL';
    }
  });
  if (Array.isArray(categoryTargets)) {
    categoryTargets.forEach((t: any) => {
      const clean = cleanCategoryName(t?.name || '');
      if (!clean) return;
      if ((t?.type === 'SL' || t?.type === 'DT') && (!catTypeLookup[clean] || catTypeLookup[clean] === 'ALL')) {
        catTypeLookup[clean] = t.type;
      }
    });
  }

  const isSlCategoryByKeyword = (catName: string): boolean => {
    const upper = (catName || '').toUpperCase();
    return (
      upper.includes('SIM') ||
      upper.includes('VAS') ||
      upper.includes('OTT') ||
      upper.includes('NẠP') ||
      upper.includes('RÚT TIỀN') ||
      upper.includes('MÁY LẠNH') ||
      upper.includes('MỞ THẺ TÍN DỤNG')
    );
  };

  const resolveCategoryType = (catName: string, explicitType?: string): 'SL' | 'DT' => {
    if (explicitType === 'SL' || explicitType === 'DT') return explicitType;
    const clean = cleanCategoryName(catName);
    if (clean) {
      const direct = catTypeLookup[clean];
      if (direct === 'SL' || direct === 'DT') return direct;
      for (const [k, v] of Object.entries(catTypeLookup)) {
        if ((v === 'SL' || v === 'DT') && isSameCategoryClean(clean, k)) {
          return v;
        }
      }
      const targetMatch = categoryTargets?.find((t: any) => isSameCategoryClean(cleanCategoryName(t?.name || ''), clean));
      if (targetMatch?.type === 'SL' || targetMatch?.type === 'DT') return targetMatch.type;
      const luykeMatch = effectiveLuykeCategories.find(c => isSameCategoryClean(cleanCategoryName(c.name), clean));
      if (luykeMatch?.type === 'SL' || luykeMatch?.type === 'DT') return luykeMatch.type;
    }
    return isSlCategoryByKeyword(catName) ? 'SL' : 'DT';
  };

  const resolveStoreBaseTarget = (catName: string, fallbackTarget: number = 0): number => {
    const clean = cleanCategoryName(catName);
    if (!clean) return fallbackTarget;
    const matchingTarget = categoryTargets?.find((t: any) => isSameCategoryClean(cleanCategoryName(t?.name || ''), clean));
    if (matchingTarget) {
      if (typeof matchingTarget.adjustedTarget === 'number' && !isNaN(matchingTarget.adjustedTarget)) {
        return matchingTarget.adjustedTarget;
      }
      if (typeof matchingTarget.target === 'number' && !isNaN(matchingTarget.target)) {
        return matchingTarget.target;
      }
    }
    const matchingLuyke = effectiveLuykeCategories.find(c => isSameCategoryClean(cleanCategoryName(c.name), clean));
    if (matchingLuyke && typeof matchingLuyke.target === 'number' && !isNaN(matchingLuyke.target)) {
      return matchingLuyke.target;
    }
    return fallbackTarget || 0;
  };

  // Merge all valid categories across categoryConfig, effectiveLuykeCategories, categoryTargets, and detailCategories
  const mergedCategories: { name: string; type: 'SL' | 'DT' | 'ALL'; target: number }[] = [];
  const addMergedCategory = (rawName: string, rawType?: string, rawTarget?: number) => {
    if (!rawName || !/[a-zA-Zà-ỹÀ-Ỹ]/.test(rawName)) return;
    if (/^[\d\s,.\-+/%:()]+$/.test(rawName)) return;
    const clean = cleanCategoryName(rawName);
    if (!clean) return;
    const existingIdx = mergedCategories.findIndex(mc => isSameCategoryClean(cleanCategoryName(mc.name), clean));
    const resolvedType = resolveCategoryType(rawName, rawType);
    const resolvedTarget = resolveStoreBaseTarget(rawName, rawTarget ?? 0);
    if (existingIdx === -1) {
      mergedCategories.push({
        name: rawName,
        type: resolvedType,
        target: resolvedTarget,
      });
    } else {
      const existing = mergedCategories[existingIdx];
      if ((!existing.type || existing.type === 'ALL') && (resolvedType === 'SL' || resolvedType === 'DT')) {
        existing.type = resolvedType;
      }
      if ((existing.target <= 0 || isNaN(existing.target)) && resolvedTarget > 0) {
        existing.target = resolvedTarget;
      }
    }
  };

  if (categoryConfig && categoryConfig.length > 0) {
    categoryConfig.forEach(c => addMergedCategory(c.name));
  }
  effectiveLuykeCategories.forEach(cat => addMergedCategory(cat.name, cat.type, cat.target));
  if (Array.isArray(categoryTargets)) {
    categoryTargets.forEach((t: any) => addMergedCategory(t?.name || '', t?.type, t?.adjustedTarget ?? t?.target ?? 0));
  }
  detailCategories.forEach(dcName => addMergedCategory(dcName));

  const allRowData = staffData ? mergedCategories.map((cat: any) => {
    const cleanCatName = cleanCategoryName(cat.name);
    
    // Find target
    const baseTarget = resolveStoreBaseTarget(cat.name, cat.target || 0);
    const target = staffCount > 0 ? baseTarget / staffCount : baseTarget;
    
    // Find accumulated value from staff data
    // 1. Direct lookup from valuesMap (populated by parseStaffMatrixDataRefined)
    let accumulated = 0;
    let foundVal = false;
    const valuesMap = staffData.valuesMap;
    if (valuesMap && valuesMap[cleanCatName] !== undefined) {
      accumulated = valuesMap[cleanCatName];
      foundVal = true;
    } else if (valuesMap) {
      // 2. Safe fuzzy key match in valuesMap
      for (const [k, v] of Object.entries(valuesMap)) {
        if (isSameCategoryClean(k, cleanCatName)) {
          accumulated = v;
          foundVal = true;
          break;
        }
      }
    }

    // 3. Fallback: match via detailCategories and rawValues
    if (!foundVal && staffData.rawValues && staffData.rawValues.length > 0) {
      const detailIdx = detailCategories.findIndex(dc => isSameCategoryClean(cleanCategoryName(dc), cleanCatName));
      if (detailIdx !== -1 && staffData.rawValues[detailIdx] !== undefined) {
        accumulated = staffData.rawValues[detailIdx] ?? 0;
      }
    }

    const percentHT = (target > 0 && daysPassed > 0) 
      ? (((accumulated / daysPassed) * totalDays) / target) * 100 
      : 0;
    const remainingVal = accumulated - target;
    const catType = cat.type || 'DT';
    
    return {
      name: cat.name,
      target,
      accumulated,
      percentHT,
      remainingVal,
      catType
    };
  }) : [];

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

  if (!staffData || mergedCategories.length === 0) {
    return (
      <div className="bg-white p-2.5 sm:p-4 border border-slate-300 shadow-xl rounded-xl sm:rounded-2xl" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
        <h2 className="text-[13px] sm:text-xl font-black text-slate-900 uppercase tracking-tight mb-2 sm:mb-4 border-b border-slate-300 pb-2">
          CHI TIẾT NHÂN VIÊN: {staffName}
        </h2>
        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest text-center py-8">
          Chưa có dữ liệu chi tiết cho nhân viên này
        </p>
      </div>
    );
  }

  // Calculate combined stats
  const totalReached = allRowData.filter(r => r.percentHT >= 100).length;
  const totalCats = allRowData.length;

  // Compute TOP 20% / BOT 20% rank badge by category achievement (e.g. 20/40 vs 5/40) within the displayed/filtered employee list
  const rankBadge: 'TOP' | 'BOT' | null = (() => {
    const computeStaffReachedCount = (s: StaffMatrixData): number => {
      if (s === staffData) return totalReached;
      let count = 0;
      const sValuesMap = s.valuesMap;
      for (let i = 0; i < mergedCategories.length; i++) {
        const cat = mergedCategories[i];
        const cleanCatName = cleanCategoryName(cat.name);
        const baseTarget = resolveStoreBaseTarget(cat.name, cat.target || 0);
        const target = staffCount > 0 ? baseTarget / staffCount : baseTarget;

        let accumulated = 0;
        let foundSVal = false;
        if (sValuesMap && sValuesMap[cleanCatName] !== undefined) {
          accumulated = sValuesMap[cleanCatName];
          foundSVal = true;
        } else if (sValuesMap) {
          for (const [k, v] of Object.entries(sValuesMap)) {
            if (isSameCategoryClean(k, cleanCatName)) {
              accumulated = v;
              foundSVal = true;
              break;
            }
          }
        }
        if (!foundSVal && s.rawValues && s.rawValues.length > 0) {
          const detailIdx = detailCategories.findIndex(dc => isSameCategoryClean(cleanCategoryName(dc), cleanCatName));
          if (detailIdx !== -1 && s.rawValues[detailIdx] !== undefined) {
            accumulated = s.rawValues[detailIdx] || 0;
          }
        }

        const pctHT = (target > 0 && daysPassed > 0)
          ? (((accumulated / daysPassed) * totalDays) / target) * 100
          : 0;
        if (pctHT >= 100) count++;
      }
      return count;
    };

    // Determine active employee list based on current store/staff filter scope
    let scopedStaff: StaffMatrixData[] = [];
    if (selectedStaffIds && selectedStaffIds.length > 0) {
      const seen = new Set<StaffMatrixData>();
      selectedStaffIds.forEach(selId => {
        const cleanSel = (selId || '').trim().toLowerCase();
        if (!cleanSel) return;
        const matched = staffMatrix.find(s => {
          if (!s || seen.has(s)) return false;
          const sId = (s.fullId || '').trim().toLowerCase();
          const sName = removeAccents((s as any).name || '').toLowerCase();
          const sDisplay = removeAccents(s.displayName || '').toLowerCase();
          return (
            (sId && (sId === cleanSel || sId.includes(cleanSel) || cleanSel.includes(sId))) ||
            (sName && sName.includes(removeAccents(cleanSel))) ||
            (sDisplay && sDisplay.includes(removeAccents(cleanSel)))
          );
        });
        if (matched) {
          seen.add(matched);
          scopedStaff.push(matched);
        }
      });
    }

    if (scopedStaff.length === 0) {
      scopedStaff = [...staffMatrix];
    } else if (!scopedStaff.includes(staffData)) {
      scopedStaff.push(staffData);
    }

    const totalEmployees = scopedStaff.length;
    if (totalEmployees === 0) return null;

    const rankedList = scopedStaff
      .map((s, initialIdx) => ({
        staff: s,
        reachedCount: computeStaffReachedCount(s),
        initialIdx,
      }))
      .sort((a, b) => {
        if (b.reachedCount !== a.reachedCount) {
          return b.reachedCount - a.reachedCount;
        }
        return a.initialIdx - b.initialIdx;
      });

    const topCount = Math.ceil(totalEmployees * 0.2);
    const botCount = Math.ceil(totalEmployees * 0.2);
    const rankIndex = rankedList.findIndex(item => item.staff === staffData);

    if (rankIndex === -1) return null;
    if (rankIndex < topCount) return 'TOP';
    if (totalEmployees > 1 && rankIndex >= totalEmployees - botCount && rankIndex >= topCount) return 'BOT';
    return null;
  })();

  const [isCapturing, setIsCapturing] = useState(false);
  const [showSlowNotice, setShowSlowNotice] = useState(false);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = `${String(yesterday.getDate()).padStart(2, '0')}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${yesterday.getFullYear()}`;

  const splitParts = staffName.split(/\s*[-–—]\s*/);
  const hasExplicitIdPart = splitParts.length >= 2 && /^\d+$/.test(splitParts[splitParts.length - 1].trim());
  const displayStaffName = hasExplicitIdPart
    ? splitParts.slice(0, -1).join(' - ').trim()
    : (extractedStaffName || staffName);
  const displayStaffId = hasExplicitIdPart
    ? splitParts[splitParts.length - 1].trim()
    : (extractedStaffId || '');

  const captureElementHelper = async (element: HTMLElement) => {
    ensureSharedCaptureStyle();
    const EXPORT_WIDTH = 880;
    const isDesktopBodyZoomed = typeof window !== 'undefined' && window.innerWidth >= 768;
    const containerZoom = isDesktopBodyZoomed ? '1.333333' : '1';
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `position:fixed;top:0;left:-9999px;width:${EXPORT_WIDTH}px;overflow:visible;pointer-events:none;z-index:-9999;background:#ffffff;zoom:${containerZoom};transform:none;`;

    // Frame wrapper matching the exact desktop card layout (880px)
    const frameWrapper = document.createElement('div');
    frameWrapper.className = 'export-isolated-card';
    frameWrapper.style.cssText = `width:${EXPORT_WIDTH}px;min-width:${EXPORT_WIDTH}px;max-width:${EXPORT_WIDTH}px;padding:12px;background-color:#ffffff;box-sizing:border-box;border-radius:24px;display:block;overflow:visible;zoom:1;transform:none;`;

    const clone = element.cloneNode(true) as HTMLElement;

    // Physically remove interactive, hidden, mobile-only style tags, and non-capture elements
    clone.querySelectorAll('.no-capture, .hidden, tfoot.hidden, button, textarea, .capture-btn, input, select, style:not([data-font-inject="true"])').forEach(el => el.remove());
    clone.style.cssText = "width:100%;min-width:100%;max-width:100%;height:auto;margin:0;padding:0;background-color:transparent;display:block;box-sizing:border-box;font-family:'UTM Avo', 'Inter', sans-serif;opacity:1;transform:none;zoom:1;";

    frameWrapper.appendChild(clone);
    tempContainer.appendChild(frameWrapper);
    document.body.appendChild(tempContainer);

    try {
      await ensureFontsReady();

      const frameHeight = Math.max(
        600,
        Math.ceil(Math.max(frameWrapper.scrollHeight, frameWrapper.offsetHeight, clone.scrollHeight + 24)) + 4
      );
      const exportScale = computeOptimalExportScale(EXPORT_WIDTH, frameHeight, 3, 4);

      // Fast path: Direct SVG foreignObject -> Canvas -> PNG (0 getComputedStyle overhead)
      try {
        return await renderIsolatedCardFastToDataUrl(frameWrapper, EXPORT_WIDTH, frameHeight, exportScale);
      } catch (fastErr) {
        console.warn('[Export Single] Fast SVG renderer failed, falling back to htmlToImage:', fastErr);
      }

      const fontCss = await preloadFontDataCache();
      await injectFontStyleIntoClone(frameWrapper);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const tryRenderAtScale = async (scaleToUse: number): Promise<string> => {
        try {
          const png = await htmlToImage.toPng(frameWrapper, {
            backgroundColor: '#ffffff',
            pixelRatio: scaleToUse,
            skipFonts: false,
            fontEmbedCSS: fontCss,
            skipAutoScale: true,
            cacheBust: false,
            width: EXPORT_WIDTH,
            height: frameHeight,
            style: { ...EXPORT_FONT_STYLE, zoom: '1', transform: 'none' },
          });
          if (png && png.length > 1000) return png;
          throw new Error('Empty PNG from htmlToImage');
        } catch (htmlErr) {
          console.warn(`htmlToImage (${scaleToUse}x) failed, fallback to domToPng:`, htmlErr);
          try {
            const png = await domToPng(frameWrapper, {
              backgroundColor: '#ffffff',
              scale: scaleToUse,
              font: { cssText: fontCss },
              width: EXPORT_WIDTH,
              height: frameHeight,
              drawImageInterval: 20,
              features: {
                removeControlCharacter: true,
                removeAbnormalAttributes: true,
                fixSvgXmlDecode: true,
              }
            });
            if (png && png.length > 1000) return png;
            throw new Error('Empty PNG from domToPng');
          } catch {
            const canvas = await html2canvas(frameWrapper, {
              scale: scaleToUse,
              backgroundColor: '#ffffff',
              logging: false,
              useCORS: true,
              allowTaint: true,
              width: EXPORT_WIDTH,
              height: frameHeight,
              windowWidth: 1440,
              windowHeight: frameHeight + 200,
              scrollX: 0,
              scrollY: 0,
              x: 0,
              y: 0,
            });
            return canvas.toDataURL('image/png', 1.0);
          }
        }
      };

      try {
        return await tryRenderAtScale(exportScale);
      } catch {
        return await tryRenderAtScale(2.5);
      }
    } finally {
      tempContainer.remove();
    }
  };

  const handleExport = async () => {
    const element = document.getElementById(`employee-detail-${staffName}`);
    if (!element || isCapturing) return;

    setIsCapturing(true);
    setShowSlowNotice(false);

    // Yield control to browser paint cycle so button instantly updates to "ĐANG XUẤT..." state
    await new Promise(r => setTimeout(r, 20));

    // If export takes > 2 seconds, trigger the slow notice overlay
    const slowNoticeTimer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 2000);

    try {
      const dataUrl = await captureElementHelper(element);
      const fileSlug = (displayStaffId || staffName).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
      const exportFileName = `Chi-tiet-nhan-vien-${fileSlug}.png`;
      if (typeof window !== 'undefined') {
        (window as any).__lastExportFileName = exportFileName;
      }
      if (onPreviewImage) {
        onPreviewImage(dataUrl);
      } else {
        const link = document.createElement('a');
        link.download = exportFileName;
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
    <div id={`employee-detail-${staffName}`} className="employee-detail-responsive w-full max-w-full min-w-0 flex justify-center p-0 sm:p-[6px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <style className="no-capture">{`
        .employee-table-scroll,
        .mobile-table-scroll {
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: visible;
          -webkit-overflow-scrolling: touch;
          position: relative;
        }
        .mobile-table-scroll table.employee-data-table {
          width: 100%;
          min-width: 356px;
          table-layout: fixed;
          border-collapse: separate;
          border-spacing: 0;
          zoom: 1 !important;
        }
        .mobile-table-scroll table.employee-data-table col.col-stt { width: 24px; }
        .mobile-table-scroll table.employee-data-table col.col-name { width: auto; }
        .mobile-table-scroll table.employee-data-table col.col-target { width: 40px; }
        .mobile-table-scroll table.employee-data-table col.col-luyke { width: 38px; }
        .mobile-table-scroll table.employee-data-table col.col-ht { width: 74px; }
        .mobile-table-scroll table.employee-data-table col.col-conlai { width: 45px; }

        @media (max-width: 639px) {
          .mobile-table-scroll table.employee-data-table th.col-stt,
          .mobile-table-scroll table.employee-data-table th.col-target,
          .mobile-table-scroll table.employee-data-table th.col-luyke,
          .mobile-table-scroll table.employee-data-table th.col-conlai,
          .mobile-table-scroll table.employee-data-table td.emp-num-cell {
            padding-left: 1px !important;
            padding-right: 1px !important;
          }
          .mobile-table-scroll table.employee-data-table th.col-name,
          .mobile-table-scroll table.employee-data-table td.emp-cat-name-cell {
            padding-left: 4px !important;
            padding-right: 4px !important;
          }
          .mobile-table-scroll table.employee-data-table th.col-ht,
          .mobile-table-scroll table.employee-data-table td.emp-ht-cell {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }

        @media (min-width: 412px) and (max-width: 639px) {
          .mobile-table-scroll table.employee-data-table col.col-stt { width: 26px; }
          .mobile-table-scroll table.employee-data-table col.col-target { width: 43px; }
          .mobile-table-scroll table.employee-data-table col.col-luyke { width: 41px; }
          .mobile-table-scroll table.employee-data-table col.col-ht { width: 86px; }
          .mobile-table-scroll table.employee-data-table col.col-conlai { width: 47px; }
        }

        @media (min-width: 640px) {
          .mobile-table-scroll table.employee-data-table {
            min-width: 560px;
          }
          .mobile-table-scroll table.employee-data-table col.col-stt { width: 48px; }
          .mobile-table-scroll table.employee-data-table col.col-name { width: auto; }
          .mobile-table-scroll table.employee-data-table col.col-target { width: 78px; }
          .mobile-table-scroll table.employee-data-table col.col-luyke { width: 78px; }
          .mobile-table-scroll table.employee-data-table col.col-ht { width: 196px; }
          .mobile-table-scroll table.employee-data-table col.col-conlai { width: 76px; }
        }

        .mobile-table-scroll table.employee-data-table td.emp-cat-name-cell,
        .mobile-table-scroll table.employee-data-table .emp-cat-name-text {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
          -webkit-line-clamp: unset !important;
          line-clamp: unset !important;
        }

        @media (max-width: 354px) {
          .emp-header-card .emp-header-row {
            flex-wrap: wrap !important;
          }
          .emp-header-card .emp-header-right-cluster {
            margin-left: auto !important;
          }
        }

        /* Container query: Tự động co giãn header & biểu đồ theo chiều rộng thực tế của thẻ (2 cột vs Xem riêng 1 cột) */
        .emp-detail-card {
          container-type: inline-size;
        }
        @container (min-width: 440px) and (max-width: 680px) {
          .emp-header-card {
            padding: 10px 12px !important;
          }
          .emp-header-card .emp-header-row {
            gap: 8px !important;
          }
          .emp-header-card .emp-header-left {
            gap: 10px !important;
          }
          .emp-header-card .emp-header-icon-box {
            width: 48px !important;
            height: 48px !important;
            border-radius: 13px !important;
          }
          .emp-header-card .emp-header-icon-box svg {
            width: 24px !important;
            height: 24px !important;
          }
          .emp-header-card .emp-header-main-title {
            font-size: 16px !important;
          }
          .emp-header-card .emp-header-staff-name {
            font-size: 14px !important;
            white-space: nowrap !important;
          }
          .emp-header-card .emp-header-meta {
            font-size: 10.5px !important;
          }
          .emp-header-card .emp-header-art {
            height: 62px !important;
            min-width: 40px !important;
            max-width: 210px !important;
          }
          .emp-header-card .emp-dat-card {
            padding: 6px 8px !important;
            min-width: 60px !important;
            border-radius: 12px !important;
          }
          .emp-header-card .emp-dat-icon-box {
            width: 26px !important;
            height: 26px !important;
            border-radius: 8px !important;
          }
          .emp-header-card .emp-dat-icon-box svg {
            width: 15px !important;
            height: 15px !important;
          }
          .emp-header-card .emp-dat-label {
            font-size: 9.5px !important;
            margin-top: 2.5px !important;
          }
          .emp-header-card .emp-dat-value {
            font-size: 13px !important;
          }
          .emp-header-card .emp-dat-pct {
            font-size: 9.5px !important;
          }
        }
      `}</style>
      <div
        className="emp-detail-card w-full max-w-[880px] min-w-0 bg-gradient-to-b from-[#EAF3FB] via-[#F1F7FD] to-[#E9F2FA] border-[1.5px] border-[#C9DDF0] p-[4px] sm:p-[14px] rounded-[16px] sm:rounded-[24px] shadow-[0_6px_24px_-4px_rgba(16,35,63,0.08)] flex flex-col space-y-[8px] sm:space-y-[12px] overflow-visible box-border"
        style={{ background: 'linear-gradient(180deg, #EAF3FB 0%, #F1F7FD 50%, #E9F2FA 100%)' }}
      >
        
        {/* Top Employee Info Header Card */}
        <div className="emp-header-card keep-overflow-hidden bg-white border border-[#D2E3F3] px-[8px] min-[390px]:px-[10px] sm:px-[16px] py-[8px] min-[390px]:py-[10px] sm:py-[12px] rounded-[14px] sm:rounded-[18px] relative shrink-0 overflow-hidden shadow-[0_2px_10px_-2px_rgba(16,35,63,0.05)]">
          <div className="emp-header-row relative z-10 flex flex-nowrap items-center justify-between gap-[6px] min-[390px]:gap-[8px] sm:gap-[12px]">
            {/* Khu vực A – Thông tin nhân viên (shrink-0 không giới hạn max-width hẹp để chữ không bao giờ tràn ra ngoài hay bị biểu đồ đè lên) */}
            <div className="emp-header-left flex items-center gap-[6.5px] min-[390px]:gap-[8px] min-[430px]:gap-[10px] sm:gap-[13px] shrink-0">
              <div
                className="emp-header-icon-box w-[36px] h-[36px] min-[390px]:w-[38px] min-[390px]:h-[38px] min-[430px]:w-[44px] min-[430px]:h-[44px] sm:w-[58px] sm:h-[58px] md:w-[62px] md:h-[62px] rounded-[10px] min-[390px]:rounded-[11px] sm:rounded-[16px] bg-gradient-to-br from-[#00A878] via-[#008260] to-[#035E44] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,127,95,0.25)] border border-[#34D399]/40"
                style={{ background: 'linear-gradient(135deg, #00A878 0%, #008260 55%, #035E44 100%)' }}
              >
                <svg className="w-[18px] h-[18px] min-[390px]:w-[20px] min-[390px]:h-[20px] min-[430px]:w-[22px] min-[430px]:h-[22px] sm:w-[30px] sm:h-[30px] md:w-[32px] md:h-[32px] text-white" viewBox="0 0 24 24" fill="none">
                  <rect x="3.5" y="12.5" width="4" height="7.5" rx="1.3" fill="currentColor" />
                  <rect x="10" y="8.5" width="4" height="11.5" rx="1.3" fill="currentColor" />
                  <rect x="16.5" y="4" width="4" height="16" rx="1.3" fill="currentColor" />
                </svg>
              </div>

              <div className="emp-header-subinfo flex flex-col justify-center shrink-0">
                <div className="emp-header-title-line flex items-center gap-[6px] sm:gap-[8px]">
                  <div
                    className="emp-header-main-title text-[12px] min-[390px]:text-[13.5px] min-[430px]:text-[15px] sm:text-[19px] md:text-[21px] font-black text-[#0E2240] uppercase tracking-[0.01em] sm:tracking-[0.015em] leading-[1.12] whitespace-nowrap"
                    style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}
                  >
                    CHI TIẾT NHÂN VIÊN
                  </div>

                  {/* Nút Xuất ảnh gọn nằm cạnh tiêu đề (ẩn khi chụp ảnh qua .no-capture) */}
                  <button
                    onClick={handleExport}
                    disabled={isCapturing}
                    className="no-capture inline-flex items-center justify-center w-[24px] h-[18px] min-[390px]:w-[27px] min-[390px]:h-[21px] sm:w-[34px] sm:h-[25px] rounded-[6px] sm:rounded-[8px] bg-[#F0FDF4] hover:bg-[#DCFCE7] text-[#059669] border border-[#86EFAC] transition-all active:scale-95 cursor-pointer disabled:opacity-75 shrink-0 shadow-[0_1px_2px_rgba(16,185,129,0.08)]"
                    title="Xuất ảnh báo cáo chi tiết nhân viên"
                  >
                    {isCapturing ? (
                      <Loader2 className="w-[11px] h-[11px] sm:w-[14px] sm:h-[14px] text-[#059669] animate-spin" />
                    ) : (
                      <Camera className="w-[11.5px] h-[11.5px] min-[390px]:w-[13px] min-[390px]:h-[13px] sm:w-[15.5px] sm:h-[15.5px] text-[#059669]" strokeWidth={2.2} />
                    )}
                  </button>
                </div>

                <h2
                  className="emp-header-staff-name text-[11px] min-[390px]:text-[12.5px] min-[430px]:text-[13.5px] sm:text-[15.5px] md:text-[17px] font-black uppercase tracking-[-0.02em] sm:tracking-tight leading-[1.2] mt-[2px] max-w-[195px] min-[390px]:max-w-[220px] min-[430px]:max-w-[250px] sm:max-w-none sm:whitespace-nowrap break-words"
                  style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900 }}
                >
                  <span className="text-[#0E2240]">{displayStaffName}</span>
                  {displayStaffId && (
                    <span className="text-[#007F5F] whitespace-nowrap"> - {displayStaffId}</span>
                  )}
                </h2>

                {/* Cumulative Date Only (không lặp lại dòng ĐẠT bên dưới) */}
                <div
                  className="emp-header-meta flex items-center mt-[2.5px] sm:mt-[4px] text-[8.5px] min-[390px]:text-[9.5px] min-[430px]:text-[10.5px] sm:text-[11.5px] md:text-[12px] font-bold text-[#334155] tracking-[-0.02em] sm:tracking-normal whitespace-nowrap"
                  style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}
                >
                  <span className="inline-flex items-center gap-[3.5px] sm:gap-[5px] whitespace-nowrap">
                    <Calendar className="w-[10px] h-[10px] min-[390px]:w-[11px] min-[390px]:h-[11px] sm:w-[13px] sm:h-[13px] text-[#0284C7] shrink-0" strokeWidth={2.3} />
                    <span>Lũy kế dự kiến đến ngày: <strong className="font-black text-[#0E2240]">{yesterdayDate}</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Khu vực B & C – Cụm Biểu đồ tăng trưởng (flex-1 min-w-0 tự co giãn theo không gian trống) và Thẻ ĐẠT nằm sát nhau bên phải */}
            <div className="emp-header-right-cluster flex-1 min-w-0 flex items-center justify-end gap-[3px] min-[390px]:gap-[4px] sm:gap-[8px] ml-auto">
              {/* Biểu đồ cột tăng trưởng màu xanh lá tự co giãn linh hoạt (flex-1) nhưng không bao giờ đè lên dữ liệu bên trái */}
              <div className="emp-header-art pointer-events-none select-none flex items-end justify-end flex-1 w-full min-w-[28px] min-[390px]:min-w-[38px] sm:min-w-[56px] max-w-[96px] sm:max-w-[300px] h-[42px] min-[390px]:h-[48px] min-[412px]:h-[52px] min-[430px]:h-[56px] sm:h-[76px] md:h-[82px] overflow-hidden">
                <svg viewBox="0 0 300 86" preserveAspectRatio="none" className="w-full h-full min-w-0 block">
                  <path d="M2,86 C42,80 105,52 190,44 C240,40 274,26 296,16 L296,86 Z" fill="#D8F5E8" fillOpacity="0.72" />
                  <path d="M14,86 C70,78 140,58 218,52 C256,49 280,36 296,28 L296,86 Z" fill="#BCEFD6" fillOpacity="0.62" />
                  {/* 6 ascending 3D-style emerald bars evenly distributed across the viewBox */}
                  <rect x="20" y="66" width="24" height="20" rx="3.5" fill="#34D399" fillOpacity="0.76" />
                  <rect x="20" y="66" width="12" height="20" rx="2.5" fill="#10B981" fillOpacity="0.86" />
                  <rect x="68" y="56" width="24" height="30" rx="3.5" fill="#34D399" fillOpacity="0.80" />
                  <rect x="68" y="56" width="12" height="30" rx="2.5" fill="#10B981" fillOpacity="0.90" />
                  <rect x="116" y="46" width="24" height="40" rx="3.5" fill="#34D399" fillOpacity="0.84" />
                  <rect x="116" y="46" width="12" height="40" rx="2.5" fill="#10B981" fillOpacity="0.93" />
                  <rect x="164" y="36" width="24" height="50" rx="3.5" fill="#10B981" fillOpacity="0.87" />
                  <rect x="164" y="36" width="12" height="50" rx="2.5" fill="#059669" fillOpacity="0.95" />
                  <rect x="212" y="25" width="24" height="61" rx="3.5" fill="#10B981" fillOpacity="0.90" />
                  <rect x="212" y="25" width="12" height="61" rx="2.5" fill="#059669" fillOpacity="0.96" />
                  <rect x="260" y="14" width="24" height="72" rx="3.5" fill="#10B981" fillOpacity="0.93" />
                  <rect x="260" y="14" width="12" height="72" rx="2.5" fill="#047857" fillOpacity="0.98" />
                  {/* Dynamic sweeping green arrow */}
                  <path d="M8,66 C82,56 178,36 270,8" fill="none" stroke="#059669" strokeWidth="4.5" strokeLinecap="round" />
                  <polygon points="283,3 264,6 274,18" fill="#059669" />
                </svg>
              </div>

              {/* Thẻ ĐẠT nằm sát bên phải biểu đồ */}
              <div
                className="emp-dat-card flex flex-col items-center justify-center text-center px-[6px] py-[4.5px] min-[390px]:px-[7px] min-[390px]:py-[5.5px] min-[430px]:px-[8px] min-[430px]:py-[6px] sm:px-[12px] sm:py-[8px] min-w-[46px] min-[390px]:min-w-[52px] min-[430px]:min-w-[56px] sm:min-w-[74px] rounded-[10px] min-[390px]:rounded-[11px] sm:rounded-[14px] border border-[#F5B851] shadow-[0_2px_8px_-2px_rgba(217,119,6,0.16)] shrink-0"
                style={{
                  background: 'linear-gradient(180deg, #FFFDF7 0%, #FFF6DA 55%, #FDE9B4 100%)',
                }}
              >
                <div
                  className="emp-dat-icon-box w-[22px] h-[22px] min-[390px]:w-[24px] min-[390px]:h-[24px] sm:w-[34px] sm:h-[34px] rounded-[6px] sm:rounded-[10px] flex items-center justify-center shrink-0 shadow-[0_2px_5px_rgba(234,88,12,0.25)]"
                  style={{
                    background: 'linear-gradient(135deg, #FB923C 0%, #F97316 50%, #EA580C 100%)',
                  }}
                >
                  <svg className="w-[13px] h-[13px] min-[390px]:w-[14px] min-[390px]:h-[14px] sm:w-[19px] sm:h-[19px] text-[#FFFBEB]" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 18H21V20H3V18ZM3 15L5 7L9.5 11L12 5L14.5 11L19 7L21 15H3Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span className="emp-dat-label text-[8.5px] min-[390px]:text-[9px] sm:text-[11.5px] font-extrabold text-[#9A3412] leading-[1.08] mt-[2.5px] sm:mt-[4px] whitespace-nowrap">
                  Đạt:
                </span>
                <span className="emp-dat-value text-[10.5px] min-[390px]:text-[11.5px] min-[430px]:text-[12px] sm:text-[15.5px] font-black text-[#B45309] leading-[1.1] mt-[0.5px] tabular-nums whitespace-nowrap">
                  {totalReached}/{totalCats}
                </span>
                <span className="emp-dat-pct text-[8.5px] min-[390px]:text-[9px] sm:text-[11.5px] font-black text-[#047857] leading-[1.08] mt-[1px] tabular-nums whitespace-nowrap">
                  ({totalCats > 0 ? ((totalReached / totalCats) * 100).toFixed(1) : '0.0'}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 6 KPI StatCards Row: 2 cols on mobile, 3 cols on tablet, 6 cols on desktop */}
        {(staffTargetQd > 0 || staffDtqd !== 0) && (
          <div className="emp-kpi-wrapper bg-white/85 border border-[#D2E3F3] rounded-[14px] sm:rounded-[18px] p-[6px] sm:p-[8px] shadow-[0_2px_8px_-2px_rgba(16,35,63,0.04)]">
            <div className="employee-kpi-grid emp-kpi-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-[6px] sm:gap-[8px] w-full">
              {/* 1. TARGET QĐ */}
              <div
                className="emp-kpi-card bg-gradient-to-br from-[#F2F8FF] to-[#E6F2FE] border border-[#C6E0F7] rounded-[11px] sm:rounded-[13px] px-[9px] py-[8px] sm:px-[10px] sm:py-[9px] flex items-center gap-[8px] min-h-[66px] sm:min-h-[74px]"
                style={{ background: 'linear-gradient(135deg, #F2F8FF 0%, #E6F2FE 100%)' }}
              >
                <div className="emp-kpi-icon-box w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-[#D6ECFF] text-[#0284C7] flex items-center justify-center shrink-0">
                  <Target className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-0 flex-1 text-center">
                  <span className="emp-kpi-label text-[10px] sm:text-[10.5px] font-black text-[#334155] uppercase tracking-[0.02em] leading-[1.1] whitespace-nowrap">
                    TARGET QĐ
                  </span>
                  <span className="emp-kpi-val text-[17.5px] min-[390px]:text-[18.5px] sm:text-[21px] font-black text-[#0E2240] mt-[2px] leading-[1.1] tabular-nums whitespace-nowrap">
                    {(() => {
                      const inMillions = staffTargetQd > 1000000 ? staffTargetQd / 1000000 : staffTargetQd;
                      if (inMillions >= 1000) return Math.round(inMillions).toLocaleString('vi-VN');
                      const val1Dec = Math.floor(inMillions * 10) / 10;
                      return (val1Dec % 1 === 0) ? val1Dec.toString() : val1Dec.toFixed(1);
                    })()}
                  </span>
                  <span className="emp-kpi-sub text-[9.5px] sm:text-[10px] font-bold text-[#64748B] mt-[2px] leading-none whitespace-nowrap">
                    {(() => {
                      const inMillions = staffTargetQd > 1000000 ? staffTargetQd / 1000000 : staffTargetQd;
                      return Math.abs(inMillions) <= 999.9 ? 'Triệu đồng' : 'Tỷ đồng';
                    })()}
                  </span>
                </div>
              </div>

              {/* 2. DTQĐ */}
              <div
                className="emp-kpi-card bg-gradient-to-br from-[#FFF4F6] to-[#FDE8EE] border border-[#F8C9D6] rounded-[11px] sm:rounded-[13px] px-[9px] py-[8px] sm:px-[10px] sm:py-[9px] flex items-center gap-[8px] min-h-[66px] sm:min-h-[74px]"
                style={{ background: 'linear-gradient(135deg, #FFF4F6 0%, #FDE8EE 100%)' }}
              >
                <div className="emp-kpi-icon-box w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-[#FFD8E2] text-[#E11D48] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-0 flex-1 text-center">
                  <span className="emp-kpi-label text-[10px] sm:text-[10.5px] font-black text-[#334155] uppercase tracking-[0.02em] leading-[1.1] whitespace-nowrap">
                    DTQĐ
                  </span>
                  <span className="emp-kpi-val text-[17.5px] min-[390px]:text-[18.5px] sm:text-[21px] font-black text-[#D91B42] mt-[2px] leading-[1.1] tabular-nums whitespace-nowrap">
                    {(() => {
                      const inMillions = Math.abs(staffDtqd) > 1000000 ? staffDtqd / 1000000 : staffDtqd;
                      return Math.round(inMillions).toLocaleString('vi-VN');
                    })()}
                  </span>
                  <span className="emp-kpi-sub text-[9.5px] sm:text-[10px] font-bold text-[#64748B] mt-[2px] leading-none whitespace-nowrap">
                    {(() => {
                      const inMillions = Math.abs(staffDtqd) > 1000000 ? staffDtqd / 1000000 : staffDtqd;
                      return Math.abs(inMillions) <= 999.9 ? 'Triệu đồng' : 'Tỷ đồng';
                    })()}
                  </span>
                </div>
              </div>

              {/* 3. % HT */}
              <div
                className={cn(
                  "emp-kpi-card border rounded-[11px] sm:rounded-[13px] px-[9px] py-[8px] sm:px-[10px] sm:py-[9px] flex items-center gap-[8px] min-h-[66px] sm:min-h-[74px]",
                  staffPercentHT >= 100
                    ? "bg-gradient-to-br from-[#EEFCF5] to-[#DFF8EC] border-[#B6EBD0]"
                    : "bg-gradient-to-br from-[#FFF4F6] to-[#FDE8EE] border-[#F8C9D6]"
                )}
                style={{
                  background: staffPercentHT >= 100
                    ? 'linear-gradient(135deg, #EEFCF5 0%, #DFF8EC 100%)'
                    : 'linear-gradient(135deg, #FFF4F6 0%, #FDE8EE 100%)',
                }}
              >
                <div className={cn(
                  "emp-kpi-icon-box w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full flex items-center justify-center shrink-0",
                  staffPercentHT >= 100 ? "bg-[#C7F4DC] text-[#059669]" : "bg-[#FFD8E2] text-[#E11D48]"
                )}>
                  <Trophy className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-0 flex-1 text-center">
                  <span className="emp-kpi-label text-[10px] sm:text-[10.5px] font-black text-[#334155] uppercase tracking-[0.02em] leading-[1.1] whitespace-nowrap">
                    % HT
                  </span>
                  <span className={cn(
                    "emp-kpi-val text-[17.5px] min-[390px]:text-[18.5px] sm:text-[21px] font-black mt-[2px] leading-[1.1] tabular-nums whitespace-nowrap",
                    staffPercentHT >= 100 ? "text-[#007F5F]" : "text-[#D91B42]"
                  )}>
                    {Math.round(staffPercentHT)}%
                  </span>
                  {(() => {
                    const diff = Math.round(staffPercentHT) - 100;
                    const isPos = diff >= 0;
                    return (
                      <span
                        className={cn(
                          "emp-kpi-sub inline-flex items-center px-[5.5px] py-[1.5px] rounded-full text-[9px] sm:text-[9.5px] font-black mt-[2px] leading-none whitespace-nowrap",
                          isPos ? "bg-[#C8F4DC] text-[#047857]" : "bg-[#FFD8E2] text-[#D91B42]"
                        )}
                      >
                        {isPos ? `↑ +${diff}%` : `↓ ${diff}%`}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* 4. % QĐ */}
              <div
                className="emp-kpi-card bg-gradient-to-br from-[#F2F6FF] to-[#E6EEFE] border border-[#C5DAFA] rounded-[11px] sm:rounded-[13px] px-[9px] py-[8px] sm:px-[10px] sm:py-[9px] flex items-center gap-[8px] min-h-[66px] sm:min-h-[74px]"
                style={{ background: 'linear-gradient(135deg, #F2F6FF 0%, #E6EEFE 100%)' }}
              >
                <div className="emp-kpi-icon-box w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-[#D6E4FF] text-[#2563EB] flex items-center justify-center shrink-0">
                  <PieChart className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-0 flex-1 text-center">
                  <span className="emp-kpi-label text-[10px] sm:text-[10.5px] font-black text-[#334155] uppercase tracking-[0.02em] leading-[1.1] whitespace-nowrap">
                    % QĐ
                  </span>
                  <span className={cn(
                    "emp-kpi-val text-[17.5px] min-[390px]:text-[18.5px] sm:text-[21px] font-black mt-[2px] leading-[1.1] tabular-nums whitespace-nowrap",
                    (staffHieuQuaQd !== null && staffHieuQuaQd !== undefined) ? "text-[#1E3A8A]" : "text-[#94A3B8]"
                  )}>
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
              </div>

              {/* 5. TRẢ CHẬM */}
              <div
                className="emp-kpi-card bg-gradient-to-br from-[#F6F7FC] to-[#ECEFF8] border border-[#D5DCEE] rounded-[11px] sm:rounded-[13px] px-[9px] py-[8px] sm:px-[10px] sm:py-[9px] flex items-center gap-[8px] min-h-[66px] sm:min-h-[74px]"
                style={{ background: 'linear-gradient(135deg, #F6F7FC 0%, #ECEFF8 100%)' }}
              >
                <div className="emp-kpi-icon-box w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-[#E0E7FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                  <Clock className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-0 flex-1 text-center">
                  <span className="emp-kpi-label text-[10px] sm:text-[10.5px] font-black text-[#334155] uppercase tracking-[0.02em] leading-[1.1] whitespace-nowrap">
                    TRẢ CHẬM
                  </span>
                  <span className={cn(
                    "emp-kpi-val text-[17.5px] min-[390px]:text-[18.5px] sm:text-[21px] font-black mt-[2px] leading-[1.1] tabular-nums whitespace-nowrap",
                    (staffInstallmentPercent !== null && staffInstallmentPercent !== undefined) ? "text-[#0E2240]" : "text-[#334155]"
                  )}>
                    {(staffInstallmentPercent !== null && staffInstallmentPercent !== undefined)
                      ? `${staffInstallmentPercent.toFixed(1)}%`
                      : '-'}
                  </span>
                </div>
              </div>

              {/* 6. THƯỞNG */}
              <div
                className="emp-kpi-card bg-gradient-to-br from-[#FFFDF5] to-[#FEF6DA] border border-[#F5DF9D] rounded-[11px] sm:rounded-[13px] px-[9px] py-[8px] sm:px-[10px] sm:py-[9px] flex items-center gap-[8px] min-h-[66px] sm:min-h-[74px]"
                style={{ background: 'linear-gradient(135deg, #FFFDF5 0%, #FEF6DA 100%)' }}
              >
                <div className="emp-kpi-icon-box w-[34px] h-[34px] sm:w-[36px] sm:h-[36px] rounded-full bg-[#FDECC2] text-[#D97706] flex items-center justify-center shrink-0">
                  <Gift className="w-[18px] h-[18px] sm:w-[19px] sm:h-[19px]" strokeWidth={2.4} />
                </div>
                <div className="flex flex-col items-center justify-center min-w-0 flex-1 text-center">
                  <span className="emp-kpi-label text-[10px] sm:text-[10.5px] font-black text-[#334155] uppercase tracking-[0.02em] leading-[1.1] whitespace-nowrap">
                    THƯỞNG
                  </span>
                  <span className={cn(
                    "emp-kpi-val text-[17.5px] min-[390px]:text-[18.5px] sm:text-[21px] font-black mt-[2px] leading-[1.1] tabular-nums whitespace-nowrap",
                    (staffBonusHientai !== null && staffBonusHientai !== undefined) ? "text-[#EA580C]" : "text-[#334155]"
                  )}>
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
            </div>
          </div>
        )}

        {/* SỐ LƯỢNG LŨY KẾ Table (Top - Emerald Theme) */}
        <SectionTable
          title="SỐ LƯỢNG LŨY KẾ"
          variant="emerald"
          daysPassed={daysPassed}
          totalDays={totalDays}
          rowData={sllkRows}
        />

        {/* DOANH THU LŨY KẾ Table (Bottom - Navy Theme) */}
        <SectionTable
          title="DOANH THU LŨY KẾ"
          variant="navy"
          daysPassed={daysPassed}
          totalDays={totalDays}
          rowData={dtlkRows}
        />

        {/* Other categories */}
        {otherRows.length > 0 && (
          <SectionTable
            title="NGÀNH HÀNG KHÁC"
            variant="emerald"
            daysPassed={daysPassed}
            totalDays={totalDays}
            rowData={otherRows}
          />
        )}
      </div>

      {/* Loading Overlay if capture takes > 2s */}
      <CaptureLoadingOverlay isLoading={showSlowNotice} message="ĐANG XUẤT ẢNH BÁO CÁO, VUI LÒNG ĐỢI GIÂY LÁT..." />
    </div>
  );
};

export default React.memo(EmployeeDetailTable, (prev, next) => {
  return (
    prev.staffName === next.staffName &&
    prev.luyKeNganhHang === next.luyKeNganhHang &&
    prev.thiDuaNv === next.thiDuaNv &&
    prev.staffCount === next.staffCount &&
    prev.selectedStaffIds === next.selectedStaffIds &&
    prev.daysPassed === next.daysPassed &&
    prev.totalDays === next.totalDays &&
    prev.categoryTargets === next.categoryTargets &&
    prev.luykeCategories === next.luykeCategories &&
    prev.staffTargetQd === next.staffTargetQd &&
    prev.staffDtqd === next.staffDtqd &&
    prev.staffPercentHT === next.staffPercentHT &&
    prev.staffHieuQuaQd === next.staffHieuQuaQd &&
    prev.staffBonusHientai === next.staffBonusHientai &&
    prev.staffInstallmentPercent === next.staffInstallmentPercent
  );
});
