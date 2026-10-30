import React, { useState, useMemo } from 'react';
import { BarChart3, PieChart, Trophy, ArrowRight, ChevronDown } from 'lucide-react';

export interface CategoryAnalyticsItem {
  name: string;
  target: number;
  revenue: number;
  actual?: number;
  rate?: number;
  type?: string;
}

interface EnterpriseCategoryAnalyticsProps {
  categories: CategoryAnalyticsItem[];
  totalRevenueOverride?: number;
  onViewDetail?: () => void;
  isMonthly?: boolean;
}

const CHART_COLORS = [
  '#0D6EFD', // 1. Royal Blue
  '#10B981', // 2. Emerald Green
  '#8B5CF6', // 3. Violet Purple
  '#F97316', // 4. Vibrant Orange
  '#EF4444', // 5. Crimson Red
  '#F59E0B', // 6. Amber Gold
  '#94A3B8', // 7. Slate Grey (Khác)
];

const cleanCategoryLabel = (rawName: string): string => {
  if (!rawName) return '';
  return rawName
    .replace(/^T\d+\s*[-–—]\s*/i, '')
    .replace(/^THÁNG\s*\d+\s*[-–—]\s*/i, '')
    .trim();
};

/**
 * Tách tên ngành hàng dài thành tối đa 2 dòng cân đối theo khoảng trắng từ ngữ
 * để ưu tiên hiển thị đầy đủ trên 2 dòng thay vì cắt dấu "..."
 */
const formatCategoryTwoLines = (name: string): [string, string | null] => {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return ['', null];
  const words = clean.split(' ');
  // Từ đơn (VD: PANASONIC, LAPTOP) hoặc cụm rất ngắn (<= 7 ký tự, VD: TỦ LẠNH) giữ 1 dòng nếu đủ chỗ
  if (words.length === 1) {
    return [clean, null];
  }
  if (words.length === 2) {
    // Tách 2 từ thành 2 dòng cân đối (VD: "TRẢ CHẬM", "T10 IPHONE", "BẢO HIỂM", "TỦ LẠNH", "MÁY GIẶT", "ĐIỆN THOẠI")
    // để hiển thị cỡ chữ 12–13px rõ nét mà không bao giờ bị cắt thành "..."
    if (clean.length <= 5) return [clean, null];
    return [words[0], words[1]];
  }
  // Với tên có từ 3 từ trở lên (VD: "TRẢ CHẬM KHÁC", "MÁY LỌC NƯỚC"):
  // Tìm vị trí ngắt giữa các từ sao cho độ dài 2 dòng cân bằng nhất
  let bestSplit = 1;
  let minDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(' ');
    const line2 = words.slice(i).join(' ');
    const diff = Math.abs(line1.length - line2.length);
    if (diff <= minDiff) {
      minDiff = diff;
      bestSplit = i;
    }
  }
  const firstLine = words.slice(0, bestSplit).join(' ');
  const secondLine = words.slice(bestSplit).join(' ');
  return [firstLine, secondLine];
};

const formatTrValue = (val: number): string => {
  const abs = Math.abs(val);
  if (abs === 0) return '0 tr';
  if (abs >= 1000) {
    const rounded = Math.round(val * 10) / 10;
    return `${rounded.toLocaleString('vi-VN')} tr`;
  }
  const rounded = Math.round(val * 10) / 10;
  return `${rounded % 1 === 0 ? Math.round(rounded) : rounded.toFixed(1)} tr`;
};

export const EnterpriseCategoryAnalytics: React.FC<EnterpriseCategoryAnalyticsProps> = ({
  categories,
  totalRevenueOverride,
  onViewDetail,
}) => {
  const [topN, setTopN] = useState<number>(8);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Normalize category list with real revenue & target values
  const normalizedCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories
      .map((c) => {
        const rev = typeof c.revenue === 'number' && !isNaN(c.revenue)
          ? c.revenue
          : (typeof c.actual === 'number' && !isNaN(c.actual) ? c.actual : 0);
        const tgt = typeof c.target === 'number' && !isNaN(c.target) ? c.target : 0;
        const cleanName = cleanCategoryLabel(c.name || '');
        const rate = tgt > 0 ? Math.round((rev / tgt) * 100) : 0;
        return {
          rawName: c.name || '',
          name: cleanName || c.name || 'Ngành hàng',
          revenue: Math.max(0, rev),
          target: Math.max(0, tgt),
          rate,
        };
      })
      .filter((c) => c.revenue > 0 || c.target > 0);
  }, [categories]);

  // 1. Bar Chart Data (Sorted by highest activity: max(revenue, target) or revenue)
  const barChartItems = useMemo(() => {
    const sorted = [...normalizedCategories].sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      return b.target - a.target;
    });
    return topN > 0 ? sorted.slice(0, topN) : sorted;
  }, [normalizedCategories, topN]);

  const maxBarValue = useMemo(() => {
    if (barChartItems.length === 0) return 100;
    const rawMax = Math.max(
      ...barChartItems.map((i) => Math.max(i.revenue, i.target)),
      10
    );
    // Calculate a clean ceiling divisible by 4
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const normalized = rawMax / magnitude;
    let ceilNorm = Math.ceil(normalized);
    if (normalized <= 1.2) ceilNorm = 1.2;
    else if (normalized <= 1.5) ceilNorm = 1.6;
    else if (normalized <= 2) ceilNorm = 2;
    else if (normalized <= 2.5) ceilNorm = 2.5;
    else if (normalized <= 3) ceilNorm = 3.2;
    else if (normalized <= 4) ceilNorm = 4;
    else if (normalized <= 5) ceilNorm = 5;
    else if (normalized <= 6) ceilNorm = 6;
    else if (normalized <= 8) ceilNorm = 8;
    else ceilNorm = 10;
    return Math.ceil((ceilNorm * magnitude) / 4) * 4;
  }, [barChartItems]);

  const yAxisTicks = useMemo(() => {
    const step = maxBarValue / 4;
    return [maxBarValue, step * 3, step * 2, step, 0];
  }, [maxBarValue]);

  // 2. Donut Chart & Top Contribution Data (Strictly from real positive revenue categories)
  const revenueSortedCategories = useMemo(() => {
    return [...normalizedCategories]
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [normalizedCategories]);

  const totalCategoryRevenue = useMemo(() => {
    return revenueSortedCategories.reduce((sum, item) => sum + item.revenue, 0);
  }, [revenueSortedCategories]);

  const displayCenterTotal = useMemo(() => {
    if (typeof totalRevenueOverride === 'number' && totalRevenueOverride > 0) {
      return totalRevenueOverride;
    }
    return totalCategoryRevenue;
  }, [totalRevenueOverride, totalCategoryRevenue]);

  const donutSlices = useMemo(() => {
    if (revenueSortedCategories.length === 0 || totalCategoryRevenue <= 0) return [];
    const top6 = revenueSortedCategories.slice(0, 6);
    const others = revenueSortedCategories.slice(6);
    const otherRev = others.reduce((sum, item) => sum + item.revenue, 0);

    const slices = top6.map((item, idx) => ({
      name: item.name,
      revenue: item.revenue,
      share: Math.round((item.revenue / totalCategoryRevenue) * 100),
      exactShare: (item.revenue / totalCategoryRevenue) * 100,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));

    if (otherRev > 0) {
      slices.push({
        name: 'Khác',
        revenue: otherRev,
        share: Math.max(1, 100 - slices.reduce((s, x) => s + x.share, 0)),
        exactShare: (otherRev / totalCategoryRevenue) * 100,
        color: CHART_COLORS[6],
      });
    } else if (slices.length > 0) {
      // Normalize rounding so shares sum to 100%
      const sumShares = slices.reduce((s, x) => s + x.share, 0);
      if (sumShares !== 100 && slices[0]) {
        slices[0].share += 100 - sumShares;
      }
    }

    return slices;
  }, [revenueSortedCategories, totalCategoryRevenue]);

  // Top 5 Contributing Categories for Right Table
  const topContributingList = useMemo(() => {
    const source = revenueSortedCategories.length > 0 ? revenueSortedCategories : barChartItems;
    return source.slice(0, 5).map((item, idx) => {
      const share = totalCategoryRevenue > 0
        ? Math.round((item.revenue / totalCategoryRevenue) * 100)
        : 0;
      return {
        ...item,
        rank: idx + 1,
        share: Math.max(0, Math.min(100, share)),
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });
  }, [revenueSortedCategories, barChartItems, totalCategoryRevenue]);

  if (normalizedCategories.length === 0) {
    return null;
  }

  // Donut SVG geometry
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div
      className="enterprise-analytics-grid grid grid-cols-1 lg:grid-cols-12 gap-[12px] sm:gap-[16px] items-stretch"
      style={{ fontFamily: "'UTM Avo', sans-serif" }}
    >
      {/* ─── PANEL 1: DOANH THU THEO NGÀNH HÀNG (BAR CHART) ─── */}
      <div className="lg:col-span-5 bg-white rounded-[16px] border border-slate-200/85 p-[12px] sm:p-[16px] md:p-[18px] shadow-[0_4px_20px_-4px_rgba(11,31,58,0.05)] flex flex-col justify-between min-w-0">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-[8px] mb-[10px] sm:mb-[12px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <div className="w-[28px] h-[28px] rounded-[8px] bg-[#EBF3FF] text-[#0D6EFD] flex items-center justify-center shrink-0">
              <BarChart3 size={16} strokeWidth={2.4} />
            </div>
            <h3 className="text-[12.5px] sm:text-[14px] md:text-[14.5px] font-black text-[#0B1F3A] uppercase tracking-tight truncate">
              DOANH THU THEO NGÀNH HÀNG
            </h3>
          </div>

          <div className="flex items-center gap-[6px] sm:gap-[8px] shrink-0 no-capture">
            <div className="relative inline-flex items-center">
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0B1F3A] text-[11px] font-bold rounded-[8px] pl-[9px] pr-[22px] py-[4px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={8}>Top 8</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={0}>Tất cả</option>
              </select>
              <ChevronDown size={12} className="absolute right-[6px] pointer-events-none text-slate-500" />
            </div>

            {onViewDetail && (
              <button
                onClick={onViewDetail}
                className="inline-flex items-center gap-[4px] px-[9px] py-[4px] rounded-[8px] bg-[#F0F7FF] hover:bg-[#E0EFFF] text-[#0D6EFD] text-[11px] font-bold transition-colors cursor-pointer"
              >
                <span>Xem chi tiết</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-[14px] mb-[12px] text-[11px] font-bold text-slate-600">
          <div className="flex items-center gap-[6px]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#2677FF] inline-block shrink-0" />
            <span>Doanh thu thực</span>
          </div>
          <div className="flex items-center gap-[6px]">
            <span className="w-[9px] h-[9px] rounded-full bg-[#C9DCFF] inline-block shrink-0" />
            <span>Target</span>
          </div>
        </div>

        {/* Bar Chart Area */}
        <div className="relative flex-1 min-h-[240px] sm:min-h-[258px] flex flex-col justify-end pt-[8px]">
          <div className="relative flex-1 flex items-stretch min-w-0">
            {/* Y-Axis Labels — pb-[52px] khớp chính xác với chiều cao vùng nhãn trục X bên dưới đường trục 0 */}
            <div className="flex flex-col justify-between pr-[8px] text-right text-[10.5px] font-semibold text-slate-400 select-none pb-[52px] shrink-0 w-[46px]">
              {yAxisTicks.map((tick, idx) => (
                <span key={idx} className="leading-none whitespace-nowrap">
                  {tick === 0 ? '0' : `${Math.round(tick)} tr`}
                </span>
              ))}
            </div>

            {/* Plot Area with Scrollable Wrapper on Mobile / Many Categories */}
            <div className="relative flex-1 min-w-0 overflow-x-auto no-scrollbar">
              <div
                className="relative h-full w-full flex flex-col justify-end"
                style={{
                  minWidth: barChartItems.length > 8
                    ? `${barChartItems.length * 64}px`
                    : undefined,
                }}
              >
                {/* Horizontal Grid Lines — dừng ở bottom-[52px] ngay tại đường trục ngang 0 */}
                <div className="absolute inset-x-0 top-0 bottom-[52px] flex flex-col justify-between pointer-events-none">
                  {yAxisTicks.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-full border-b ${idx === yAxisTicks.length - 1 ? 'border-slate-200/90' : 'border-slate-100 border-dashed'}`}
                    />
                  ))}
                </div>

                {/* Bars + X-Axis Labels Row */}
                <div className="relative z-10 flex-1 flex items-end justify-between gap-[4px] sm:gap-[6px] pt-[6px] px-[2px] sm:px-[4px] min-w-[440px] sm:min-w-0">
                  {barChartItems.map((item, idx) => {
                    const revPct = maxBarValue > 0 ? Math.min(100, (item.revenue / maxBarValue) * 100) : 0;
                    const tgtPct = maxBarValue > 0 ? Math.min(100, (item.target / maxBarValue) * 100) : 0;
                    const isHovered = hoveredIdx === idx;
                    const [line1, line2] = formatCategoryTwoLines(item.name);

                    // Căn vị trí tooltip tránh tràn mép trái/phải
                    const tooltipPosClass =
                      idx === 0
                        ? 'left-0 translate-x-0'
                        : idx === barChartItems.length - 1
                        ? 'right-0 translate-x-0'
                        : 'left-1/2 -translate-x-1/2';

                    return (
                      <div
                        key={item.rawName + idx}
                        className="relative flex-1 min-w-[50px] sm:min-w-0 flex flex-col items-center h-full justify-end group select-none cursor-pointer"
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        onClick={() => setHoveredIdx(hoveredIdx === idx ? null : idx)}
                      >
                        {/* Tooltip xem đầy đủ tên ngành hàng + số liệu (hỗ trợ cả hover trên PC và chạm trên Mobile) */}
                        {isHovered && (
                          <div
                            className={`no-capture absolute -top-[48px] ${tooltipPosClass} z-30 bg-[#0B1F3A] text-white text-[10.5px] font-bold rounded-[8px] px-[10px] py-[6px] shadow-lg whitespace-nowrap pointer-events-none`}
                          >
                            <div className="text-sky-300 font-extrabold mb-[2px]">{item.name}</div>
                            <div>
                              Thực: {formatTrValue(item.revenue)} | Target: {formatTrValue(item.target)} ({item.rate}%)
                            </div>
                          </div>
                        )}

                        {/* Paired Bars (nằm hoàn toàn phía trên đường trục ngang 0) */}
                        <div className="w-full max-w-[34px] flex items-end justify-center gap-[3px] sm:gap-[4px] h-[148px] sm:h-[164px]">
                          {/* Actual Revenue Bar (#2677FF) */}
                          <div
                            className="flex-1 max-w-[14px] rounded-t-[4px] transition-all duration-300"
                            style={{
                              height: `${Math.max(revPct, item.revenue > 0 ? 3 : 1)}%`,
                              backgroundColor: '#2677FF',
                            }}
                            title={`${item.name} — Doanh thu thực: ${formatTrValue(item.revenue)}`}
                          />
                          {/* Target Bar (#C9DCFF) */}
                          <div
                            className="flex-1 max-w-[14px] rounded-t-[4px] transition-all duration-300"
                            style={{
                              height: `${Math.max(tgtPct, item.target > 0 ? 3 : 1)}%`,
                              backgroundColor: '#C9DCFF',
                            }}
                            title={`${item.name} — Target: ${formatTrValue(item.target)}`}
                          />
                        </div>

                        {/* Vùng chứa nhãn trục X tách biệt hoàn toàn bên dưới chân cột (chiều cao 52px, cách chân cột 10px) */}
                        <div
                          className="w-full h-[52px] pt-[10px] flex flex-col items-center justify-start text-center"
                          title={item.name}
                          style={{
                            fontFamily: "'Inter', 'UTM Avo', sans-serif",
                          }}
                        >
                          {line2 ? (
                            <div
                              className="w-full text-[11.5px] sm:text-[12px] md:text-[12.5px] font-semibold text-[#475569] leading-[1.28] tracking-[-0.02em] text-center"
                            >
                              <span className="block whitespace-nowrap">{line1}</span>
                              <span className="block truncate max-w-full">{line2}</span>
                            </div>
                          ) : (
                            <span
                              className="block w-full text-[11.5px] sm:text-[12px] md:text-[12.5px] font-semibold text-[#475569] leading-[1.28] tracking-[-0.025em] text-center whitespace-nowrap"
                            >
                              {line1}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PANEL 2: CƠ CẤU DOANH THU (DONUT CHART) ─── */}
      <div className="lg:col-span-3 bg-white rounded-[16px] border border-slate-200/85 p-[12px] sm:p-[16px] md:p-[18px] shadow-[0_4px_20px_-4px_rgba(11,31,58,0.05)] flex flex-col justify-between min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-[8px] mb-[10px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <div className="w-[28px] h-[28px] rounded-[8px] bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
              <PieChart size={16} strokeWidth={2.4} />
            </div>
            <h3 className="text-[12.5px] sm:text-[14px] md:text-[14.5px] font-black text-[#0B1F3A] uppercase tracking-tight truncate">
              CƠ CẤU DOANH THU
            </h3>
          </div>

          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="no-capture inline-flex items-center gap-[4px] text-[#0D6EFD] hover:text-[#0055CC] text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
            >
              <span>Xem chi tiết</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Donut + Legend Body */}
        {donutSlices.length > 0 ? (
          <div className="flex-1 flex flex-row lg:flex-col xl:flex-row items-center justify-center gap-[12px] sm:gap-[16px] my-auto py-[4px]">
            {/* SVG Donut */}
            <div className="relative w-[138px] h-[138px] sm:w-[156px] sm:h-[156px] shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform">
                <circle
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke="#F1F5F9"
                  strokeWidth="22"
                />
                {donutSlices.map((slice, idx) => {
                  const strokeDash = (slice.exactShare / 100) * circumference;
                  const strokeOffset = -((accumulatedPercent / 100) * circumference);
                  accumulatedPercent += slice.exactShare;
                  return (
                    <circle
                      key={slice.name + idx}
                      cx="90"
                      cy="90"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth="22"
                      strokeDasharray={`${Math.max(0, strokeDash - 1.5)} ${circumference}`}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="butt"
                    >
                      <title>{`${slice.name}: ${formatTrValue(slice.revenue)} (${slice.share}%)`}</title>
                    </circle>
                  );
                })}
              </svg>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-[10px] pointer-events-none">
                <span className="text-[16px] sm:text-[19px] font-black text-[#0B1F3A] leading-tight tracking-tight">
                  {formatTrValue(displayCenterTotal)}
                </span>
                <span className="text-[9.5px] sm:text-[10px] font-bold text-slate-400 mt-[2px]">
                  Tổng doanh thu
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div className="w-full flex-1 space-y-[6px] min-w-0">
              {donutSlices.map((slice, idx) => (
                <div
                  key={slice.name + idx}
                  className="flex items-center justify-between gap-[8px] text-[11px] sm:text-[11.5px] leading-snug"
                >
                  <div className="flex items-center gap-[7px] min-w-0 flex-1">
                    <span
                      className="w-[9px] h-[9px] rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="font-bold text-slate-600 truncate" title={slice.name}>
                      {slice.name}
                    </span>
                  </div>
                  <span className="font-black text-[#0B1F3A] shrink-0">
                    {slice.share}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[12px] font-bold text-slate-400 py-[28px]">
            Chưa có dữ liệu doanh thu ngành hàng
          </div>
        )}
      </div>

      {/* ─── PANEL 3: TOP NGÀNH HÀNG ĐÓNG GÓP (RANKED TABLE) ─── */}
      <div className="lg:col-span-4 bg-white rounded-[16px] border border-slate-200/85 p-[12px] sm:p-[16px] md:p-[18px] shadow-[0_4px_20px_-4px_rgba(11,31,58,0.05)] flex flex-col justify-between min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-[8px] mb-[10px] sm:mb-[12px]">
          <div className="flex items-center gap-[8px] min-w-0">
            <div className="w-[28px] h-[28px] rounded-[8px] bg-[#FFFBEB] text-[#D97706] flex items-center justify-center shrink-0">
              <Trophy size={16} strokeWidth={2.4} />
            </div>
            <h3 className="text-[12.5px] sm:text-[14px] md:text-[14.5px] font-black text-[#0B1F3A] uppercase tracking-tight truncate">
              TOP NGÀNH HÀNG ĐÓNG GÓP
            </h3>
          </div>

          {onViewDetail && (
            <button
              onClick={onViewDetail}
              className="no-capture inline-flex items-center gap-[4px] text-[#0D6EFD] hover:text-[#0055CC] text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
            >
              <span>Xem chi tiết</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Table Header */}
          <div className="grid grid-cols-12 items-center gap-[6px] sm:gap-[8px] px-[8px] py-[6px] rounded-[8px] bg-[#F8FAFC] border-b border-slate-100 text-[10px] sm:text-[10.5px] font-extrabold text-slate-500 uppercase tracking-wider">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-6 text-left">Ngành hàng</div>
            <div className="col-span-3 text-right">Doanh thu</div>
            <div className="col-span-2 text-right">Tỷ trọng</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100 flex-1 flex flex-col justify-around py-[4px]">
            {topContributingList.map((item) => (
              <div
                key={item.rawName + item.rank}
                className="grid grid-cols-12 items-center gap-[6px] sm:gap-[8px] px-[8px] py-[7px] hover:bg-slate-50/80 transition-colors rounded-[8px]"
              >
                {/* Rank Badge */}
                <div className="col-span-1 flex justify-center">
                  <span
                    className="w-[20px] h-[20px] rounded-[6px] text-white text-[11px] font-black flex items-center justify-center shadow-2xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.rank}
                  </span>
                </div>

                {/* Category Name + Horizontal Progress Bar */}
                <div className="col-span-6 flex items-center gap-[6px] sm:gap-[8px] min-w-0">
                  <span
                    className="text-[11.5px] sm:text-[12px] font-extrabold text-[#0B1F3A] truncate min-w-[55px] sm:min-w-[68px] max-w-[95px] sm:max-w-[130px]"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <div className="flex-1 h-[7px] bg-slate-100 rounded-full overflow-hidden min-w-[28px] sm:min-w-[36px]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(8, Math.min(100, item.share * 1.8))}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>

                {/* Revenue */}
                <div className="col-span-3 text-right text-[11.5px] sm:text-[12px] font-black text-[#0B1F3A] whitespace-nowrap">
                  {formatTrValue(item.revenue)}
                </div>

                {/* Share % */}
                <div className="col-span-2 text-right text-[11.5px] sm:text-[12px] font-extrabold text-slate-600 whitespace-nowrap">
                  {item.share}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

