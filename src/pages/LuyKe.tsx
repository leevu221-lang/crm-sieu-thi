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
import { normalize } from './RTST/utils';

const LuyKe: React.FC = () => {
  const { userProfile } = useAuth();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
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
    isLoading,
    loadData
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

  const isInitialLoading = isLoading || isLoadingStoreRevenue;

  // MUST be declared before any useEffect that references it
  const filteredMarkets = React.useMemo(() => {
    const allowedPrefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR"];
    return displayData.markets.filter(m => 
      allowedPrefixes.some(prefix => m.name.toUpperCase().startsWith(prefix))
    );
  }, [displayData.markets]);

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

  // Sync available markets to global context
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      setAvailableMarkets(filteredMarkets);
    }
  }, [filteredMarkets, setAvailableMarkets]);

  // Sync stName and other fields when marketFilter changes
  useEffect(() => {
    if (marketFilter !== 'ALL' && allStoreTargets) {
      const market = filteredMarkets.find(m => m.name === marketFilter);
      if (market) {
        // 1. Sync name and basic revenue from parsed data
        if (stName !== market.name) setStName(market.name);
        if (stDtlk !== (market.actualReal || 0)) setStDtlk(market.actualReal || 0);
        if (stDtqd !== (market.actualVirtual || 0)) setStDtqd(market.actualVirtual || 0);

        // 2. Sync targets from allStoreTargets (Source of Truth)
        // Use robust normalized matching to find the correct target
        const normSearch = normalize(market.name);
        const targetEntry = Object.entries(allStoreTargets || {}).find(([name]) => normalize(name) === normSearch);
        const targetData = targetEntry ? targetEntry[1] : null;

        if (targetData) {
          if (stTargetQuyDoi !== (targetData.stTargetQuyDoi || 0)) setStTargetQuyDoi(targetData.stTargetQuyDoi || 0);
          if (stPercentTarget !== (targetData.stPercentTarget ?? 100)) setStPercentTarget(targetData.stPercentTarget ?? 100);
          if (stTargetSauHeSo !== (targetData.stTargetSauHeSo || 0)) setStTargetSauHeSo(targetData.stTargetSauHeSo || 0);
          if (stDtDuKienQD !== (targetData.stDtDuKienQD || 0)) setStDtDuKienQD(targetData.stDtDuKienQD || 0);
          if (stPercentHTTargetDuKienQD !== (targetData.stPercentHTTargetDuKienQD || 0)) setStPercentHTTargetDuKienQD(targetData.stPercentHTTargetDuKienQD || 0);
        }
      }
    }
  }, [
    marketFilter, filteredMarkets, allStoreTargets, stName, stDtlk, stDtqd, 
    stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, stDtDuKienQD, stPercentHTTargetDuKienQD,
    setStName, setStDtlk, setStDtqd, setStTargetQuyDoi, setStPercentTarget, 
    setStTargetSauHeSo, setStDtDuKienQD, setStPercentHTTargetDuKienQD
  ]);

  // Sync marketFilter when filteredMarkets changes
  useEffect(() => {
    if (filteredMarkets.length > 0 && (marketFilter === 'ALL' || !filteredMarkets.some(m => m.name === marketFilter))) {
      setMarketFilter(filteredMarkets[0].name);
    }
  }, [filteredMarkets]);

  const adjustedCategories = React.useMemo(() => {
    if (!Array.isArray(categoryTargets) || categoryTargets.length === 0) return displayData.categories;
    const targetMap = new Map(categoryTargets.map(t => [t.name.trim().toUpperCase(), t]));
    return displayData.categories.map(cat => {
      const matchName = cat.name.trim().toUpperCase();
      const targetData = targetMap.get(matchName);
      if (targetData !== undefined) {
        // Cập nhật Target = Target gốc * (% Target / 100)
        return {
          ...cat,
          target: cat.target * (targetData.percent / 100)
        };
      }
      return cat;
    });
  }, [displayData.categories, categoryTargets]);

  // Filter categories by marketFilter (store button selection)
  const filteredCategories = React.useMemo(() => {
    if (marketFilter === 'ALL') return adjustedCategories;
    return adjustedCategories.filter(c => {
      if (!c.marketName) return true;
      return c.marketName.toUpperCase().includes(marketFilter.toUpperCase()) || marketFilter.toUpperCase().includes(c.marketName.toUpperCase());
    });
  }, [adjustedCategories, marketFilter]);

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
    <div className="min-h-screen bg-slate-50 pb-24 font-sans selection:bg-indigo-100 selection:text-indigo-900">
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
          {displayData.markets.length > 0 && (
            <OverviewDashboard 
              markets={displayData.markets}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
              captureRef={captureRefs.fullDashboard}
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
            />
          )}

        {/* CHI TIẾT NGÀNH HÀNG - Same layout as BC Ngày */}
        {filteredCategories.length > 0 && (
          <div className="mt-6">
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-[18px] font-black text-slate-900 tracking-tight">CHI TIẾT NGÀNH HÀNG</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Thống kê chi tiết theo ngành hàng (Luỹ kế tháng)</p>
                  </div>
                  <button
                    onClick={() => captureElement(captureRefs.categorySL, 'NganhHang_LuyKe')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    <Camera size={14} />
                    <span>Chụp ảnh báo cáo</span>
                  </button>
                </div>
              </div>

              <div ref={captureRefs.categorySL} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
                <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Table: SLLK */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                          <ShoppingBag size={24} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">NGÀNH HÀNG (SL)</h3>
                          <p className="text-[14px] font-medium text-slate-500">Lọc theo số lượng luỹ kế</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 px-5 py-2.5 rounded-full border border-indigo-100 shadow-sm">
                          <span className="text-[18px] font-black text-indigo-700">
                            {filteredCategories.filter(c => c.type === 'SL').filter(c => {
                              if (c.target > 0 && daysPassed > 0) {
                                return (((c.revenue / daysPassed) * totalDays) / c.target) * 100 >= 100;
                              }
                              return false;
                            }).length} / {filteredCategories.filter(c => c.type === 'SL').length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100/80">
                            <th className="py-3 px-3 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider border border-emerald-500">NGÀNH HÀNG</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider text-center border border-emerald-500 w-[60px] min-w-[60px] max-w-[60px]">TARGET</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">LUỸ KẾ</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">%HT</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories
                            .filter(c => c.type === 'SL')
                            .sort((a, b) => {
                              let rA = 0, rB = 0;
                              if (a.target > 0 && daysPassed > 0) rA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
                              if (b.target > 0 && daysPassed > 0) rB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
                              return rB - rA;
                            })
                            .map((cat, idx) => {
                              let rate = 0;
                              if (cat.target > 0 && daysPassed > 0) {
                                rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                              }
                              const remaining = cat.target - cat.revenue;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-3 text-[13px] font-bold text-slate-700 border border-slate-300">{cat.name}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-slate-900 text-center border border-slate-300 w-[60px]">{Math.round(cat.target).toLocaleString()}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-indigo-600 text-center border border-slate-300 w-[60px]">
                                    {cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-1 text-center border border-slate-300 w-[60px]">
                                    <span className={`text-[13px] font-bold px-1.5 py-0.5 rounded ${Math.round(rate) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                      {Math.round(rate)}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-rose-600 text-center border border-slate-300 w-[60px]">
                                    {remaining > 0 ? Math.round(remaining).toLocaleString() : ""}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Table: DTLK */}
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-emerald-600 shrink-0">
                          <TrendingUp size={24} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">NGÀNH HÀNG (DT)</h3>
                          <p className="text-[14px] font-medium text-slate-500">Lọc theo doanh thu luỹ kế</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 px-5 py-2.5 rounded-full border border-emerald-100 shadow-sm">
                          <span className="text-[18px] font-black text-emerald-700">
                            {filteredCategories.filter(c => c.type === 'DT').filter(c => {
                              if (c.target > 0 && daysPassed > 0) {
                                return (((c.revenue / daysPassed) * totalDays) / c.target) * 100 >= 100;
                              }
                              return false;
                            }).length} / {filteredCategories.filter(c => c.type === 'DT').length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100/80">
                            <th className="py-3 px-3 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider border border-emerald-500">NGÀNH HÀNG</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-emerald-600 text-white uppercase tracking-wider text-center border border-emerald-500 w-[60px] min-w-[60px] max-w-[60px]">TARGET</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">LUỸ KẾ</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">%HT</th>
                            <th className="py-3 px-1 text-[12px] font-black bg-amber-500 text-white uppercase tracking-wider text-center border border-amber-400 w-[60px] min-w-[60px] max-w-[60px]">CÒN LẠI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCategories
                            .filter(c => c.type === 'DT')
                            .sort((a, b) => {
                              let rA = 0, rB = 0;
                              if (a.target > 0 && daysPassed > 0) rA = (((a.revenue / daysPassed) * totalDays) / a.target) * 100;
                              if (b.target > 0 && daysPassed > 0) rB = (((b.revenue / daysPassed) * totalDays) / b.target) * 100;
                              return rB - rA;
                            })
                            .map((cat, idx) => {
                              let rate = 0;
                              if (cat.target > 0 && daysPassed > 0) {
                                rate = (((cat.revenue / daysPassed) * totalDays) / cat.target) * 100;
                              }
                              const remaining = cat.target - cat.revenue;
                              return (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-3 px-3 text-[13px] font-bold text-slate-700 border border-slate-300">{cat.name}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-slate-900 text-center border border-slate-300 w-[60px]">{Math.round(cat.target).toLocaleString()}</td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-indigo-600 text-center border border-slate-300 w-[60px]">
                                    {cat.revenue === 0 ? "" : Math.round(cat.revenue).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-1 text-center border border-slate-300 w-[60px]">
                                    <span className={`text-[13px] font-bold px-1.5 py-0.5 rounded ${Math.round(rate) >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                      {Math.round(rate)}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-1 text-[13px] font-bold text-rose-600 text-center border border-slate-300 w-[60px]">
                                    {remaining > 0 ? Math.round(remaining).toLocaleString() : ""}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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