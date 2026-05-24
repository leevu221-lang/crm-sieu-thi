/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useEmployeeHealth } from './EmployeeHealth/hooks/useEmployeeHealth';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import InputSection from './RTST/components/InputSection';
import { Loader2, Database, Eye, EyeOff, BarChart3, Clock, Users, Target, TrendingUp, Globe, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, parseMarketData, getMarketRegistry, cleanNum, extractSection, safeSetItem, normalize, isValidStoreName } from './RTST/utils';

const KhaiBao: React.FC = () => {
  const { userProfile } = useAuth();
  const { currentStoreId: marketFilter, setCurrentStoreId: setMarketFilter, availableStores: storeSourceMarkets, setStoreReady } = useStore();
  const [maKho, setMaKho] = useState(() => {
    const initial = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '';
    console.log('[KHAI_BAO] Initial maKho:', initial);
    return initial;
  });
  const [showAll, setShowAll] = useState(true);

  // Update maKho when userProfile is loaded
  React.useEffect(() => {
    if (userProfile?.ma_kho) {
      console.log('[KHAI_BAO] userProfile loaded, setting maKho:', userProfile.ma_kho);
      setMaKho(userProfile.ma_kho);
      safeSetItem('rtst_ma_kho', userProfile.ma_kho);
    }
  }, [userProfile]);

  const {
    marketInput, setMarketInput,
    categoryInput, setCategoryInput,
    categoryTargetInput, setCategoryTargetInput,
    ycxData, setYcxData,
    categoryRevenueInput, setCategoryRevenueInput,
    activeStore,
    processedData: rtProcessedData,
    saveRealtimeData,
    syncRealtimeData,
    loadData,
    isSavingRealtime,
    isLoadingRealtime,
    isYcxDirty,
    lastUpdated: rtLastUpdated,
    processData: processRealtimeData,
    clearField: clearRealtimeField
  } = useRealtimeData(maKho);

  const {
    clusterSummaryInput, setClusterSummaryInput,
    clusterCategoryInput, setClusterCategoryInput,
    staffInput, setStaffInput,
    staffCategoryInput, setStaffCategoryInput,
    staffListInput, setStaffListInput,
    tragopMatran, setTragopMatran,
    tragopNv, setTragopNv,
    categoryTargets, setCategoryTargets,
    processedData,
    saveLuykeData,
    isProcessingSave,
    isSavingStaff,
    isSavingTargets,
    isLoading,
    processData: processLuykeData,
    syncFromRealtime,
    clearField: clearLuykeField,
    allStoresCache
  } = useLuykeData(maKho);

  const handleClearField = (setter: (val: string) => void) => {
    clearRealtimeField(setter);
    clearLuykeField(setter);
  };

  const {
    manualAdjustment, setManualAdjustment,
    ycxFileName, setYcxFileName,
    linkBcTongHop, setLinkBcTongHop,
    linkNganhHangTongHop, setLinkNganhHangTongHop,
    selectedMonth, setSelectedMonth,
    daysPassed, setDaysPassed,
    totalDays, setTotalDays,
    staffListFileName, setStaffListFileName,
    stName, setStName,
    stDtlk, setStDtlk,
    stDtqd, setStDtqd,
    stDtDuKienQD, setStDtDuKienQD,
    stPercentHTTargetDuKienQD, setStPercentHTTargetDuKienQD,
    stTargetQuyDoi, setStTargetQuyDoi,
    stPercentTarget, setStPercentTarget,
    stTargetSauHeSo, setStTargetSauHeSo,
    isSavingStoreRevenue,
    isLoadingStoreRevenue,
    saveStoreRevenue,
    loadStoreRevenue,
    updateStoreSettings,
    isValidStoreName,
    VALID_STORE_PREFIXES,
    allStoreTargets
  } = useRTSTSharedData(maKho, isYcxDirty);

  const { banKemNv, setBanKemNv, saveBanKemNv, phucVu, savePhucVu } = useEmployeeHealth(maKho, marketFilter !== 'ALL' ? marketFilter : undefined);

  // Synchronized with DB-declared stores list via useStore()

  // Sync marketFilter when available stores change
  React.useEffect(() => {
    if (storeSourceMarkets.length > 0 && (marketFilter === 'ALL' || !storeSourceMarkets.some(m => m.name === marketFilter))) {
      if (marketFilter === 'ALL') {
        setMarketFilter(storeSourceMarkets[0].name);
      }
    }
  }, [storeSourceMarkets, marketFilter]);

  // NOTE: Luyke data auto-loads when currentStoreId changes (centralized in useLuykeData)
  // Only handle 'ALL' case here — mark store ready immediately
  React.useEffect(() => {
    if (!marketFilter || marketFilter === 'ALL') {
      setStoreReady(true);
    }
  }, [marketFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════
  // AUTO-SYNC: LUỸ KẾ TĐ → TARGET THI ĐUA per store
  // When clusterCategoryInput changes (user paste/load) or store finishes loading,
  // re-process the cluster data so categoryTargets are extracted for the active store.
  // ═══════════════════════════════════════════════════════
  const prevClusterCategoryRef = React.useRef(clusterCategoryInput);
  React.useEffect(() => {
    if (marketFilter === 'ALL' || !marketFilter) return;
    if (isLoading) return; // Wait for store data to finish loading

    // Only trigger when clusterCategoryInput actually changed (not just on mount)
    const clusterChanged = prevClusterCategoryRef.current !== clusterCategoryInput;
    prevClusterCategoryRef.current = clusterCategoryInput;

    if (clusterChanged && clusterCategoryInput) {
      console.log(`[KhaiBao] LUỸ KẾ TĐ changed → re-processing TARGET THI ĐUA for: ${marketFilter}`);
      processLuykeData();
    }
  }, [clusterCategoryInput, marketFilter, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync stName and revenue fields from LUỸ KẾ data (BÁO CÁO TỔNG HỢP) when marketFilter changes
  // ONLY uses luykeMarkets (from categoryRevenueInput). When empty → reset all revenue fields.
  // PERF: Using functional setState (prev =>) to avoid depending on current state values,
  // which previously caused infinite re-render loops.
  React.useEffect(() => {
    const luykeMarkets = rtProcessedData.luykeMarkets || [];
    if (marketFilter !== 'ALL') {
      setStName((prev: string) => prev !== marketFilter ? marketFilter : prev);

      const market = luykeMarkets.find(m => normalize(m.name) === normalize(marketFilter));
      
      if (market) {
        setStDtlk((prev: number) => prev !== (market.actualReal || 0) ? (market.actualReal || 0) : prev);
        setStDtqd((prev: number) => prev !== (market.actualVirtual || 0) ? (market.actualVirtual || 0) : prev);
        const luykeTarget = market.targetQD || market.targetST || 0;
        setStDtDuKienQD((prev: number) => prev !== luykeTarget ? luykeTarget : prev);
        setStPercentHTTargetDuKienQD((prev: number) => prev !== (market.percentHT || 0) ? (market.percentHT || 0) : prev);
      } else {
        // Reset luyke-specific fields if not found in Luy Ke data
        setStDtlk((prev: number) => prev !== 0 ? 0 : prev);
        setStDtqd((prev: number) => prev !== 0 ? 0 : prev);
        
        // Try fallback to Realtime data for projected targets
        const rtMarket = (rtProcessedData.markets || []).find(m => normalize(m.name) === normalize(marketFilter));
        const dtDuKienQD = rtMarket?.targetQD || 0;
        const percentHT = rtMarket?.percentHT || 0;
        
        setStDtDuKienQD((prev: number) => prev !== dtDuKienQD ? dtDuKienQD : prev);
        setStPercentHTTargetDuKienQD((prev: number) => prev !== percentHT ? percentHT : prev);
      }
    } else if (luykeMarkets.length === 0) {
      // Reset khi ô LUỸ KẾ (BÁO CÁO TỔNG HỢP) bị xoá trống và đang ở ALL
      setStName((prev: string) => prev ? '' : prev);
      setStDtlk((prev: number) => prev ? 0 : prev);
      setStDtqd((prev: number) => prev ? 0 : prev);
      setStDtDuKienQD((prev: number) => prev ? 0 : prev);
      setStPercentHTTargetDuKienQD((prev: number) => prev ? 0 : prev);
    }
  }, [marketFilter, rtProcessedData.luykeMarkets, rtProcessedData.markets, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD]);

  // Restore % TARGET per-store when switching stores
  // Separate effect to avoid blocking user input on the % TARGET field
  React.useEffect(() => {
    if (marketFilter === 'ALL') return;
    const targetEntry = Object.entries(allStoreTargets || {}).find(([name]) => normalize(name) === normalize(marketFilter));
    const savedTarget = targetEntry ? targetEntry[1] : null;
    const newPercent = savedTarget?.stPercentTarget ?? 100;
    setStPercentTarget(newPercent);
  }, [marketFilter, allStoreTargets]);

  // Sync category targets from processed data
  // Logic moved to useLuykeData hook to prevent race conditions and F5 resets

  // Auto-calculation logic moved to useRTSTSharedData.ts to sync globally

  const lastProcessedRef = React.useRef({ input: '', maKho: '' });

  // Sync store name ONLY from clusterSummaryInput (BC TỔNG HỢP CỤM)
  // Revenue fields (DTLK, DTQD, etc.) are handled exclusively by the luykeMarkets effect above
  React.useEffect(() => {
    if (!clusterSummaryInput || !maKho) return;
    
    if (clusterSummaryInput === lastProcessedRef.current.input && maKho === lastProcessedRef.current.maKho) return;
    
    lastProcessedRef.current = { input: clusterSummaryInput, maKho };

    try {
      const inputToParse = extractSection(clusterSummaryInput, "1. BC TỔNG HỢP CỤM");
      const allMarkets = parseMarketData(inputToParse, 0, 'LUYKE');
      const filteredMarkets = allMarkets.filter(m => isValidStoreName(m.name || ''));

      const cleanMaKho = maKho.trim().replace(/^0+/, '');
      const normMaKho = cleanMaKho.replace(/[\s_]+/g, '_').toUpperCase();
      const registry = getMarketRegistry();
      const registeredName = registry[cleanMaKho];
      
      const currentMarket = filteredMarkets.find(m => {
        if (m.ma_kho) {
          const mCode = m.ma_kho.toString().trim().replace(/^0+/, '').replace(/[\s_]+/g, '').toUpperCase();
          if (mCode === normMaKho) return true;
        }
        const normMarketName = m.name.toUpperCase().replace(/[\s_]+/g, '').toUpperCase();
        if (registeredName) {
          const normRegistered = registeredName.toUpperCase().replace(/[\s_]+/g, '').toUpperCase();
          if (normMarketName === normRegistered || normMarketName.includes(normRegistered) || normRegistered.includes(normMarketName)) return true;
        }
        if (normMarketName.includes(normMaKho)) return true;
        const nMarket = normalize(m.name);
        const nMaKho = normalize(maKho);
        if (nMarket.includes(nMaKho)) return true;
        return false;
      });
      
      // Only sync store name - revenue fields are synced from LUỸ KẾ (BÁO CÁO TỔNG HỢP)
      if (currentMarket) {
        setStName(currentMarket.name || '');
        setStPercentTarget((prev: number) => prev || 100);
      } else if (filteredMarkets.length === 1) {
        setStName(filteredMarkets[0].name || '');
        setStPercentTarget((prev: number) => prev || 100);
      }
    } catch (err) {
      console.error('[KHAI_BAO] Lỗi khi đồng bộ tên siêu thị:', err);
    }
  }, [clusterSummaryInput, maKho, isValidStoreName, setStName, setStPercentTarget]);

  const handleStaffListUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Implement or mock if needed, or get from hook
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'save' | 'sync'>('save');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'REALTIME' | 'LUY_KE' | 'THOI_GIAN' | 'NHAN_VIEN' | 'TARGET_NGANH_HANG' | 'TARGET_DOANH_THU' | 'RESOURCES'>('REALTIME');

  const handleSync = async () => {
    console.log('[KHAI_BAO] Bắt đầu đồng bộ dữ liệu từ Realtime sang Luỹ kế cho mã kho:', maKho);
    setErrorMessage(null);
    if (!maKho) {
      setErrorMessage('Không tìm thấy mã kho để đồng bộ.');
      return;
    }

    try {
      await syncFromRealtime();
      console.log('[KHAI_BAO] Đồng bộ dữ liệu thành công!');
      setSuccessType('sync');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.error('[KHAI_BAO] Lỗi khi đồng bộ dữ liệu:', error);
      setErrorMessage('Lỗi khi đồng bộ dữ liệu: ' + error.message);
      setTimeout(() => setErrorMessage(null), 10000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">


      <div className="max-w-[1260px] mx-auto p-8">
         {/* Main Content Area */}
         <div>
          <InputSection 
            marketInput={marketInput}
            setMarketInput={setMarketInput}
            categoryInput={categoryInput}
            setCategoryInput={setCategoryInput}
            categoryTargetInput={categoryTargetInput}
            setCategoryTargetInput={setCategoryTargetInput}
            categoryRevenueInput={categoryRevenueInput}
            setCategoryRevenueInput={setCategoryRevenueInput}
            manualAdjustment={manualAdjustment}
            setManualAdjustment={setManualAdjustment}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            daysPassed={daysPassed}
            setDaysPassed={setDaysPassed}
            totalDays={totalDays}
            setTotalDays={setTotalDays}
            ycxFileName={ycxFileName}
            setYcxFileName={setYcxFileName}
            linkBcTongHop={linkBcTongHop}
            setLinkBcTongHop={setLinkBcTongHop}
            linkNganhHangTongHop={linkNganhHangTongHop}
            setLinkNganhHangTongHop={setLinkNganhHangTongHop}
            clusterSummaryInput={clusterSummaryInput}
            setClusterSummaryInput={setClusterSummaryInput}
            clusterCategoryInput={clusterCategoryInput}
            setClusterCategoryInput={setClusterCategoryInput}
            setYcxData={setYcxData}
            ycxData={ycxData}
            onAnalyze={() => { processRealtimeData(); processLuykeData(); }}
            onSaveRealtime={saveRealtimeData}
            clearField={handleClearField}
            onSyncRealtime={syncRealtimeData}
            onLoadRealtime={loadData}
            activeStore={marketFilter}
            onSaveLuyke={saveLuykeData}
            onSyncFromRealtime={handleSync}
            isSavingRealtime={isSavingRealtime}
            isLoadingRealtime={isLoadingRealtime}
            isProcessingLuyke={isProcessingSave}
            isLoadingLuyke={isLoading}
            isSavingStaff={isSavingStaff}
            isSavingTargets={isSavingTargets}
            staffListInput={staffListInput}
            setStaffListInput={setStaffListInput}
            staffListFileName={staffListFileName}
            setStaffListFileName={setStaffListFileName}
            handleStaffListUpload={handleStaffListUpload}
            staffInput={staffInput}
            setStaffInput={setStaffInput}
            staffCategoryInput={staffCategoryInput}
            setStaffCategoryInput={setStaffCategoryInput}
            categoryTargets={categoryTargets}
            setCategoryTargets={setCategoryTargets}
            banKemNv={banKemNv}
            setBanKemNv={setBanKemNv}
            phucVu={phucVu}
            setPhucVu={savePhucVu}
            tragopMatran={tragopMatran}
            setTragopMatran={setTragopMatran}
            tragopNv={tragopNv}
            setTragopNv={setTragopNv}
            stName={stName}
            setStName={setStName}
            isLuykeSynced={marketFilter !== 'ALL' && (rtProcessedData.luykeMarkets || []).some(m => m.name.toUpperCase() === marketFilter.toUpperCase())}
            stDtlk={stDtlk}
            setStDtlk={setStDtlk}
            stDtqd={stDtqd}
            setStDtqd={setStDtqd}
            stDtDuKienQD={stDtDuKienQD}
            setStDtDuKienQD={setStDtDuKienQD}
            stPercentHTTargetDuKienQD={stPercentHTTargetDuKienQD}
            setStPercentHTTargetDuKienQD={setStPercentHTTargetDuKienQD}
            stTargetQuyDoi={stTargetQuyDoi}
            setStTargetQuyDoi={setStTargetQuyDoi}
            stPercentTarget={stPercentTarget}
            setStPercentTarget={setStPercentTarget}
            stTargetSauHeSo={stTargetSauHeSo}
            updateStoreSettings={updateStoreSettings}
            onSaveStoreRevenue={() => saveStoreRevenue(maKho, activeStore)}
            onLoadStoreRevenue={() => loadStoreRevenue(maKho)}
            isSavingStoreRevenue={isSavingStoreRevenue}
            isLoadingStoreRevenue={isLoadingStoreRevenue}
            isValidStoreName={isValidStoreName}
            VALID_STORE_PREFIXES={VALID_STORE_PREFIXES}
            lastUpdatedRealtime={rtLastUpdated}
            isYcxDirty={isYcxDirty}
            showAll={showAll}
            activeTab={activeTab}
            availableMarkets={storeSourceMarkets.map(m => m.name)}
            onStoreChange={setMarketFilter}
            allStoresCache={allStoresCache}
          />
        </div>
      </div>
    </div>
  );
};

export default KhaiBao;
