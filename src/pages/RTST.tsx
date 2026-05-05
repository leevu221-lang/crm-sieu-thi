/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import * as htmlToImage from 'html-to-image';
import { RefreshCw } from 'lucide-react';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import { isValidStoreName } from './RTST/utils';
import Header from './RTST/components/Header';
import OverviewDashboard from './RTST/components/OverviewDashboard';
import CategoryTable from './RTST/components/CategoryTable';
import StaffRevenueTable from './RTST/components/StaffRevenueTable';
import StaffEfficiencyTable from './RTST/components/StaffEfficiencyTable';
import YcxStaffTable from './RTST/components/YcxStaffTable';
import { ConfirmationModal } from './RTST/components/Modals';

const RTST: React.FC = () => {
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
    marketInput, setMarketInput,
    categoryInput, setCategoryInput,
    ycxData, setYcxData,
    excludedYcxStaffNames, setExcludedYcxStaffNames,
    processedData: displayData,
    isSavingRealtime,
    isLoadingRealtime,
    processData,
    saveRealtimeData,
    loadData,
    clearData
  } = useRealtimeData(maKho);

  const { 
    stName, 
    stTargetQuyDoi, 
    stTargetSauHeSo,
    allStoreTargets,
    stDtDuKienQD, 
    daysPassed, 
    totalDays 
  } = useRTSTSharedData(maKho);

  useEffect(() => {
    const handleFocus = () => {
      console.log('[RTST] Window focused, processing data...');
      processData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [processData]);

  const filteredMarkets = React.useMemo(() => {
    return displayData.markets.filter(m => isValidStoreName(m.name));
  }, [displayData.markets]);

  // Sync available markets to global context
  useEffect(() => {
    if (filteredMarkets.length > 0) {
      setAvailableMarkets(filteredMarkets);
    }
  }, [filteredMarkets, setAvailableMarkets]);

  // Filter states
  const [catGroupFilter, setCatGroupFilter] = useState('ALL');
  const [expandedStaffRows, setExpandedStaffRows] = useState<Set<string>>(new Set());
  const [isYcxDropdownOpen, setIsYcxDropdownOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Refs for capture
  const captureRefs = {
    overview: useRef<HTMLDivElement>(null),
    fullDashboard: useRef<HTMLDivElement>(null),
    category: useRef<HTMLDivElement>(null),
    staffRevenue: useRef<HTMLDivElement>(null),
    staffEfficiency: useRef<HTMLDivElement>(null)
  };

  const toggleStaffRow = (name: string) => {
    setExpandedStaffRows(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAllStaffRows = () => {
    if (expandedStaffRows.size === displayData.staff.length) {
      setExpandedStaffRows(new Set());
    } else {
      setExpandedStaffRows(new Set(displayData.staff.map(s => s.staffName)));
    }
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
      <Header 
        userProfile={userProfile}
        maKho={maKho}
        isProcessing={isSavingRealtime || isLoadingRealtime}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col gap-0 bg-slate-50">
          {displayData.markets.length > 0 && (
            <OverviewDashboard 
              markets={displayData.markets}
              marketFilter={marketFilter}
              setMarketFilter={setMarketFilter}
              categories={displayData.categories}
              catGroupFilter={catGroupFilter}
              setCatGroupFilter={setCatGroupFilter}
              captureRef={captureRefs.fullDashboard}
              categoryCaptureRef={captureRefs.category}
              captureElement={captureElement}
              daysPassed={daysPassed}
              totalDays={totalDays}
              stName={stName}
              stTargetQuyDoi={stTargetQuyDoi}
              stTargetSauHeSo={stTargetSauHeSo}
              allStoreTargets={allStoreTargets}
              stDtDuKienQD={stDtDuKienQD}
              showFilters={false}
            />
          )}
        </div>

        <StaffRevenueTable 
          ycxStaffData={displayData.staff}
          excludedYcxStaffNames={excludedYcxStaffNames}
          setExcludedYcxStaffNames={setExcludedYcxStaffNames}
          expandedStaffRows={expandedStaffRows}
          toggleStaffRow={toggleStaffRow}
          toggleAllStaffRows={toggleAllStaffRows}
          isYcxDropdownOpen={isYcxDropdownOpen}
          setIsYcxDropdownOpen={setIsYcxDropdownOpen}
          catMarketFilter={marketFilter}
          captureRef={captureRefs.staffRevenue}
          captureElement={captureElement}
        />

        <YcxStaffTable ycxData={ycxData} />

        <StaffEfficiencyTable 
          ycxStaffData={displayData.staff}
          excludedYcxStaffNames={excludedYcxStaffNames}
          catMarketFilter={marketFilter}
          captureRef={captureRefs.staffEfficiency}
          captureElement={captureElement}
        />
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

      {/* Floating Refresh Button */}
      <button
        onClick={() => {
          loadData();
        }}
        className="fixed bottom-24 right-6 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all group flex items-center gap-2"
        title="Làm mới dữ liệu từ Database"
      >
        <RefreshCw size={24} className={`${(isSavingRealtime || isLoadingRealtime) ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
        <span className="font-bold pr-2">LÀM MỚI</span>
      </button>

      {isCapturing && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-black text-indigo-600 uppercase tracking-widest animate-pulse">ĐANG XUẤT ẢNH...</p>
        </div>
      )}
    </div>
  );
};

export default RTST;
