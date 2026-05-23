/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { RefreshCw, ShoppingBag, TrendingUp, Camera, LayoutGrid, Activity, Globe, ChevronDown, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import OverviewDashboard from './RTST/components/OverviewDashboard';
import CategoryTable from './RTST/components/CategoryTable';

import { ConfirmationModal } from './RTST/components/Modals';
import { normalize, isKhoLuuDong } from './RTST/utils';

const LuyKe: React.FC = () => {
  const { userProfile } = useAuth();
  const { marketFilter, setMarketFilter, availableMarkets } = useMarket();
  const filteredMarkets = React.useMemo(() => {
    return (availableMarkets || []).filter(m => !isKhoLuuDong(m.name));
  }, [availableMarkets]);
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');
  const [activeTab, setActiveTab] = useState<'summary' | 'efficiency'>('summary');

  const {
    clusterSummaryInput, setClusterSummaryInput,
    clusterCategoryInput, setClusterCategoryInput,
    categoryTargets,
    processedData: displayData,
    processData,
    saveLuykeData,
    syncFromRealtime,
    isLoading
  } = useLuykeData(maKho);

  const { 
    daysPassed, totalDays, 
    stName, setStName,
    stTargetQuyDoi, setStTargetQuyDoi,
    allStoreTargets,
    stDtDuKienQD, setStDtDuKienQD,
    stDtlk, setStDtlk,
    stDtqd, setStDtqd,
    stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
    stPercentTarget, setStPercentTarget,
    stTargetSauHeSo, setStTargetSauHeSo,
    storeSettings,
    saveStoreRevenue,
    loadStoreRevenue,
    isLoadingStoreRevenue,
    isSavingStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES
  } = useRTSTSharedData(maKho);



  // Track whether the initial load has completed — suppress loading overlay on store switches
  const hasInitiallyLoaded = useRef(false);
  useEffect(() => {
    if (!isLoading && !isLoadingStoreRevenue) {
      hasInitiallyLoaded.current = true;
    }
  }, [isLoading, isLoadingStoreRevenue]);

  const isInitialLoading = !hasInitiallyLoaded.current && (isLoading || isLoadingStoreRevenue);

  // Sync maKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && userProfile.ma_kho !== maKho) {
      setMaKho(userProfile.ma_kho);
      localStorage.setItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile?.ma_kho]);

  // Sync maKho from report data if available
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      const firstMarket = filteredMarkets[0];
      if (firstMarket.ma_kho) {
        const detectedMaKho = firstMarket.ma_kho.toString().trim().replace(/^0+/, '');
        if (detectedMaKho && detectedMaKho !== maKho) {
          console.log('[LuyKe] Detected ma_kho from report:', detectedMaKho);
          setMaKho(detectedMaKho);
        }
      }
    }
  }, [filteredMarkets, maKho]);

  // PERF: Sync stName and revenue fields when marketFilter or data changes
  // PERF: Sync stName and revenue fields when marketFilter or data changes
  // Only trigger on external changes (marketFilter, filteredMarkets, allStoreTargets)
  // NOT on the values we set — avoids re-render cascade
  useEffect(() => {
    if (marketFilter === 'ALL') return;
    const market = filteredMarkets.find(m => m.name === marketFilter);
    if (!market) return;

    if (stName !== market.name) setStName(market.name);
    if (stDtlk !== (market.actualReal || 0)) setStDtlk(market.actualReal || 0);
    if (stDtqd !== (market.actualVirtual || 0)) setStDtqd(market.actualVirtual || 0);

    const dtDuKienQD = market.targetQD || 0;
    const percentHT = market.percentHT || 0;
    if (stDtDuKienQD !== dtDuKienQD) setStDtDuKienQD(dtDuKienQD);
    if (stPercentHTTargetDuKienQD !== percentHT) setStPercentHTTargetDuKienQD(percentHT);

    // Sync from DB cache (allStoreTargets) using normalized keys to prevent spacing/underscore mismatches
    const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normalize(market.name));
    const targetData = targetDataKey ? allStoreTargets[targetDataKey] : null;
    if (targetData) {
      if (targetData.stPercentTarget !== undefined && stPercentTarget !== targetData.stPercentTarget) {
        setStPercentTarget(targetData.stPercentTarget);
      }
    }
  }, [marketFilter, filteredMarkets, allStoreTargets, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, stPercentTarget, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD, setStPercentTarget]);

  // Sync marketFilter when filteredMarkets changes
  useEffect(() => {
    // Ensure the current marketFilter is valid within filteredMarkets,
    // otherwise auto-select the first available one.
    if (filteredMarkets.length > 0 && (marketFilter === 'ALL' || !filteredMarkets.some(m => m.name === marketFilter))) {
      setMarketFilter(filteredMarkets[0].name);
    }
  }, [filteredMarkets, marketFilter]);

  // NOTE: Luyke data auto-loads when currentStoreId changes (centralized in useLuykeData)

  // stTargetSauHeSo is synced from DB (KHAI BÁO > TARGET DOANH THU > TAGET SAU X HỆ SỐ)
  // — no local recalculation needed here

  // FastSync removed — allStoreTargets sync is handled in the unified effect above

  // Filter out any supermarkets containing (KHO BÁN HÀNG LƯU ĐỘNG)
  const filteredDisplayData = React.useMemo(() => {
    return {
      ...displayData,
      markets: (displayData.markets || []).filter(
        m => !isKhoLuuDong(m.name)
      ),
      categories: (displayData.categories || []).filter(
        c => !c.marketName || !isKhoLuuDong(c.marketName)
      )
    };
  }, [displayData]);

  // Pre-filter markets by the current store filter so the overview dashboard
  // only shows the store(s) matching the selected bộ lọc
  const marketsForDashboard = React.useMemo(() => {
    if (marketFilter === 'ALL') return filteredDisplayData.markets;
    const normFilter = normalize(marketFilter);
    return filteredDisplayData.markets.filter(m => {
      const normName = normalize(m.name);
      return normName.includes(normFilter) || normFilter.includes(normName);
    });
  }, [filteredDisplayData.markets, marketFilter]);

  // Categories from LUỸ KẾ TĐ already have correct data:
  // cat.target = Column 3 (TARGET) and cat.revenue = Column 2 (LUỸ KẾ)
  // No adjustment needed — pass through raw parsed values directly.
  const adjustedCategories = filteredDisplayData.categories;

  // Filter categories by marketFilter (store button selection)
  const filteredCategories = React.useMemo(() => {
    let cats = adjustedCategories;
    if (marketFilter !== 'ALL') {
      cats = cats.filter(c => {
        // Data is already isolated per-store from the DB via useLuykeData.
        // Bypassing strict string matching prevents "Chưa có dữ liệu" bugs 
        // caused by React state sync delays between marketFilter and activeStore.
        if (!c.marketName) return true;
        
        const normMarketName = normalize(c.marketName);
        const normFilter = normalize(marketFilter);
        
        // If they match, great. If not, still return true to trust the DB isolation,
        // unless we explicitly know it belongs to a completely different store (multi-store edge case).
        if (normMarketName && normFilter && normMarketName !== normFilter && !normMarketName.includes(normFilter) && !normFilter.includes(normMarketName)) {
           // In single-store view, even if names mismatch slightly, we trust the data source.
           // Only filter if we have multiple stores loaded in filteredDisplayData.markets.
           if (filteredDisplayData.markets && filteredDisplayData.markets.length > 1) {
             return false;
           }
        }
        return true;
      });
    }
    // Dedup by name + type (prevent duplicate category rows from broad matching)
    const seen = new Set<string>();
    return cats.filter(c => {
      // User request: "CHỈ LẤY NHỮNG DÒNG TÊN NGÀNH HÀNG CÓ TARGET"
      if (!c.target || c.target <= 0) return false;

      const key = `${(c.name || '').trim().toUpperCase()}__${c.type || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [adjustedCategories, marketFilter, filteredDisplayData.markets]);

  // Removed window focus re-processing to improve performance

  // Filter states
  const [catGroupFilter, setCatGroupFilter] = useState('ALL');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const [excludedYcxStaffNames, setExcludedYcxStaffNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('BI_REAL_EXCLUDED_YCX_V1');
    return saved ? JSON.parse(saved) : [];
  });

  const clearData = () => {
    setClusterSummaryInput('');
    setClusterCategoryInput('');
    // ... clear other states
  };

  // Refs for capture
  const captureRefs = {
    overview: useRef<HTMLDivElement>(null),
    fullDashboard: useRef<HTMLDivElement>(null),
    overviewInternal: useRef<HTMLDivElement>(null),
    category: useRef<HTMLDivElement>(null),
    categorySL: useRef<HTMLDivElement>(null),
    categoryDT: useRef<HTMLDivElement>(null)
  };



  const captureElement = async (ref: React.RefObject<HTMLDivElement | null>, fileName: string) => {
    if (!ref.current) return;
    setIsCapturing(true);
    document.body.classList.add('capturing-screenshot');
    
    const element = ref.current;
    const originalWidth = element.style.width;
    const originalMinWidth = element.style.minWidth;
    
    try {
      // Store original overflow styles and set to visible to get true scrollWidth
      const scrollContainers = element.querySelectorAll('.overflow-x-auto');
      const originalOverflows: { el: HTMLElement, overflowX: string }[] = [];
      
      scrollContainers.forEach(el => {
        const htmlEl = el as HTMLElement;
        originalOverflows.push({ el: htmlEl, overflowX: htmlEl.style.overflowX });
        htmlEl.style.overflowX = 'visible';
      });

      // Temporarily set width to max-content to allow flex containers to expand fully
      element.style.width = 'max-content';
      element.style.minWidth = 'max-content';
      
      // Get the true full width after expanding
      const fullWidth = element.scrollWidth;
      element.style.width = `${fullWidth}px`;
      element.style.minWidth = `${fullWidth}px`;

      // Small delay for CSS to apply
      await new Promise(resolve => setTimeout(resolve, 150));

      const dataUrl = await htmlToImage.toPng(element, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => !(node instanceof Element && node.classList?.contains('no-capture')),
        style: {
          transform: 'scale(1)',
          borderRadius: '0'
        }
      });
      
      const link = document.createElement('a');
      link.download = `${fileName}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();

      // Restore overflows
      originalOverflows.forEach(({ el, overflowX }) => {
        el.style.overflowX = overflowX;
      });
    } catch (error) {
      console.error('Error capturing element:', error);
    } finally {
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      document.body.classList.remove('capturing-screenshot');
      setIsCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 selection:bg-indigo-100 selection:text-indigo-900" style={{ fontFamily: '"Inter", sans-serif' }}>
      {isInitialLoading && (
        <div className="fixed inset-0 z-[100] bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs font-black text-indigo-600 uppercase tracking-widest animate-pulse">ĐANG TẢI DỮ LIỆU...</p>
        </div>
      )}

      <main className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 p-8">
        {/* Left Vertical Navigation */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="flex flex-col gap-3 py-4 sticky top-[116px]">
            {[
              { id: 'summary', label: 'TỔNG QUAN', icon: LayoutGrid, color: 'text-indigo-600' },
              { id: 'efficiency', label: 'HIỆU QUẢ', icon: Activity, color: 'text-emerald-600' }
            ].map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white border-indigo-500 shadow-[0_15px_35px_-10px_rgba(79,70,229,0.15)] -translate-y-0.5 translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-indigo-50 ' + item.color : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[15px] font-black tracking-tight uppercase ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area - Right Side */}
        <div className="flex-1 min-w-0 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
          <div ref={captureRefs.fullDashboard}>
            <OverviewDashboard 
              markets={marketsForDashboard}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
              captureRef={captureRefs.overviewInternal}
              fullCaptureRef={captureRefs.fullDashboard}
              captureElement={captureElement}
              title="TỔNG QUAN SIÊU THỊ (LUỸ KẾ)"
              showFilters={false}
              hideTargetQD={true}
              hideDashboard={true}
              daysPassed={daysPassed}
              totalDays={totalDays}
              stName={stName}
              stTargetQuyDoi={stTargetQuyDoi}
              stTargetSauHeSo={stTargetSauHeSo}
              allStoreTargets={allStoreTargets}
              storeSettings={storeSettings}
              stDtDuKienQD={stDtDuKienQD}
              stPercentTarget={stPercentTarget}
            />

        {/* CHI TIẾT NGÀNH HÀNG - Same layout as BC Ngày */}
          <div className="mt-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 text-center">
                    <h3 className="text-[27px] font-black text-slate-900 tracking-tight">CHI TIẾT NGÀNH HÀNG</h3>
                    <p className="text-[17px] text-slate-400 mt-0.5">Thống kê chi tiết theo ngành hàng (Luỹ kế tháng)</p>
                  </div>
                  <button
                    onClick={() => captureElement(captureRefs.categorySL, 'NganhHang_LuyKe')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95 no-capture"
                  >
                    <Camera size={14} />
                    <span>Chụp ảnh báo cáo</span>
                  </button>
                </div>
              </div>

              <div ref={captureRefs.categorySL} className="bg-white rounded-3xl overflow-hidden border border-slate-300">
                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Table: SLLK */}
                  <div className="border border-slate-300 overflow-hidden">
                   <div className="bg-white p-[15px]">
                    <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG (SL)</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">LUỸ KẾ THÁNG</span>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          ĐẠT : {filteredCategories.filter(c => c.type === 'SL').filter(c => c.target > 0 && daysPassed > 0 && (((c.revenue / daysPassed) * totalDays) / c.target) * 100 >= 100).length}/{filteredCategories.filter(c => c.type === 'SL').length} || TGSD: {daysPassed}/{totalDays}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
                        <thead>
                          <tr className="text-slate-900 h-[60px]">
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-[60px]">TARGET</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">LUỸ KẾ</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">%HT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[60px]">CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories.filter(c => c.type === 'SL').length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm border-r border-b border-slate-300">Chưa có dữ liệu</td></tr>
                          ) : (
                            filteredCategories.filter(c => c.type === 'SL')
                              .sort((a, b) => {
                                let rA = 0, rB = 0;
                                if (a.target > 0 && daysPassed > 0) rA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
                                if (b.target > 0 && daysPassed > 0) rB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
                                return rB - rA;
                              })
                              .map((cat, idx) => {
                                let rate = 0;
                                if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                const remaining = cat.target - cat.revenue;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 text-black">{cat.name}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                    <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${Math.round(rate) >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(rate)}%</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>

                  {/* Right Table: DTLK */}
                  <div className="border border-slate-300 overflow-hidden">
                   <div className="bg-white p-[15px]">
                    <div className="grid grid-cols-2 border-b border-slate-300 divide-x divide-slate-300">
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">NGÀNH HÀNG (DT)</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">LUỸ KẾ THÁNG</span>
                      </div>
                      <div className="p-4 flex flex-col items-center justify-center">
                        <h2 className="text-xl font-black text-rose-600 uppercase tracking-tight pb-2 mb-2 border-b border-slate-300 w-full text-center">DỰ KIẾN</h2>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                          ĐẠT : {filteredCategories.filter(c => c.type === 'DT').filter(c => c.target > 0 && daysPassed > 0 && (((c.revenue / daysPassed) * totalDays) / c.target) * 100 >= 100).length}/{filteredCategories.filter(c => c.type === 'DT').length} || TGSD: {daysPassed}/{totalDays}
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
                        <thead>
                          <tr className="text-slate-900 h-[60px]">
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-10">STT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981]">NGÀNH HÀNG</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#10b981] w-[60px]">TARGET</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">LUỸ KẾ</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#facc15] w-[60px]">%HT</th>
                            <th className="px-2 py-0 text-[13px] font-black uppercase text-center border-r border-b border-slate-300 bg-[#f97316] w-[60px]">CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories.filter(c => c.type === 'DT').length === 0 ? (
                            <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-sm border-r border-b border-slate-300">Chưa có dữ liệu</td></tr>
                          ) : (
                            filteredCategories.filter(c => c.type === 'DT')
                              .sort((a, b) => {
                                let rA = 0, rB = 0;
                                if (a.target > 0 && daysPassed > 0) rA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
                                if (b.target > 0 && daysPassed > 0) rB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
                                return rB - rA;
                              })
                              .map((cat, idx) => {
                                let rate = 0;
                                if (cat.target > 0 && daysPassed > 0) rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                                const remaining = cat.target - cat.revenue;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50 transition-colors h-[40px]">
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-slate-700 text-center border-r border-b border-slate-300 bg-[#fef08a]">{idx + 1}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold uppercase border-r border-b border-slate-300 text-black">{cat.name}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-slate-800">{Math.round(cat.target).toLocaleString()}</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-emerald-700">{cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}</td>
                                    <td className={`px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 ${Math.round(rate) >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>{Math.round(rate)}%</td>
                                    <td className="px-2 py-0 text-[13px] font-extrabold text-center border-r border-b border-slate-300 text-rose-600">{remaining > 0 ? Math.round(remaining).toLocaleString() : ""}</td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
              </motion.div>
            )}

            {activeTab === 'efficiency' && (
              <motion.div
                key="efficiency"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Activity size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">HIỆU QUẢ KINH DOANH</h3>
                      <p className="text-sm text-slate-400">Phân tích hiệu quả theo tháng</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-wider">Đang phát triển</p>
                    <p className="text-xs text-slate-300 mt-1">Tính năng sẽ sớm ra mắt</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <ConfirmationModal 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          clearData();
          setShowConfirm(false);
        }}
        title="XÓA DỮ LIỆU?"
        message="Hành động này sẽ xóa toàn bộ dữ liệu hiện tại và không thể hoàn tác."
      />

      {isCapturing && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-black text-indigo-600 uppercase tracking-widest animate-pulse">ĐANG XUẤT ẢNH...</p>
        </div>
      )}
    </div>
  );
};

export default LuyKe;