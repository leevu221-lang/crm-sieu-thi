/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { RefreshCw } from 'lucide-react';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import OverviewDashboard from './RTST/components/OverviewDashboard';
import CategoryTable from './RTST/components/CategoryTable';
import LuyKeCategoryTable from './LuyKeCategoryTable';
import { ConfirmationModal } from './RTST/components/Modals';

const LuyKe: React.FC = () => {
  const { userProfile } = useAuth();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
  const [maKho, setMaKho] = useState(() => userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '');

  // Sync maKho when userProfile changes
  useEffect(() => {
    if (userProfile?.ma_kho && userProfile.ma_kho !== maKho) {
      setMaKho(userProfile.ma_kho);
      localStorage.setItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile?.ma_kho]);

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
    stTargetSauHeSo,
    storeSettings,
    saveStoreRevenue,
    loadStoreRevenue,
    isLoadingStoreRevenue,
    isSavingStoreRevenue,
    isValidStoreName,
    VALID_STORE_PREFIXES
  } = useRTSTSharedData(maKho);

  const isInitialLoading = isLoading || isLoadingStoreRevenue;

  const filteredMarkets = React.useMemo(() => {
    const allowedPrefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR"];
    return displayData.markets.filter(m => 
      allowedPrefixes.some(prefix => m.name.toUpperCase().startsWith(prefix))
    );
  }, [displayData.markets]);

  // Sync available markets to global context
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      setAvailableMarkets(filteredMarkets);
    }
  }, [filteredMarkets, setAvailableMarkets]);

  // Sync stName and other fields when marketFilter changes
  useEffect(() => {
    if (marketFilter !== 'ALL') {
      const market = filteredMarkets.find(m => m.name === marketFilter);
      if (market) {
        // Only update if values have changed to avoid unnecessary re-renders
        if (stName !== market.name) setStName(market.name);
        if (stDtlk !== (market.actualReal || 0)) setStDtlk(market.actualReal || 0);
        if (stDtqd !== (market.actualVirtual || 0)) setStDtqd(market.actualVirtual || 0);
      }
    }
  }, [marketFilter, filteredMarkets, stName, stDtlk, stDtqd, setStName, setStDtlk, setStDtqd]);

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
    category: useRef<HTMLDivElement>(null)
  };

  const toggleStaffRow = (name: string) => {
    // Removed
  };

  const toggleAllStaffRows = () => {
    // Removed
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mt-4">
          {displayData.markets.length > 0 && (
            <OverviewDashboard 
              markets={displayData.markets}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
              categories={adjustedCategories}
              catGroupFilter={catGroupFilter}
              setCatGroupFilter={setCatGroupFilter}
              captureRef={captureRefs.fullDashboard}
              categoryCaptureRef={captureRefs.category}
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