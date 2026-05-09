/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRealtimeData } from './RTST/hooks/useRealtimeData';
import { useLuykeData } from './RTST/hooks/useLuykeData';
import { useRTSTSharedData } from './RTST/hooks/useRTSTSharedData';
import { useAuth } from '../contexts/AuthContext';
import { useMarket } from '../contexts/MarketContext';
import InputSection from './RTST/components/InputSection';
import { Loader2, Database, Eye, EyeOff, BarChart3, Clock, Users, Target, TrendingUp, Globe, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, parseMarketData, getMarketRegistry, cleanNum, extractSection, safeSetItem, normalize, isValidStoreName } from './RTST/utils';

const KhaiBao: React.FC = () => {
  const { userProfile } = useAuth();
  const { marketFilter, setMarketFilter, setAvailableMarkets } = useMarket();
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
    ycxData, setYcxData,
    categoryRevenueInput, setCategoryRevenueInput,
    activeStore,
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
    categoryTargets, setCategoryTargets,
    processedData,
    saveLuykeData,
    isProcessingSave,
    isSavingStaff,
    isSavingTargets,
    isLoading,
    processData: processLuykeData,
    syncFromRealtime,
    clearField: clearLuykeField
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
    isValidStoreName,
    VALID_STORE_PREFIXES
  } = useRTSTSharedData(maKho, isYcxDirty);

  // Sync available markets to global context
  React.useEffect(() => {
    if (processedData.markets.length > 0) {
      const filtered = processedData.markets.filter(m => isValidStoreName(m.name));
      if (filtered.length > 0) {
        setAvailableMarkets(filtered);
      }
    }
  }, [processedData.markets, setAvailableMarkets, isValidStoreName]);

  // Sync marketFilter when processedData.markets changes
  React.useEffect(() => {
    if (processedData.markets.length > 0 && (marketFilter === 'ALL' || !processedData.markets.some(m => m.name === marketFilter))) {
      const filtered = processedData.markets.filter(m => isValidStoreName(m.name));
      if (filtered.length > 0 && marketFilter === 'ALL') {
         setMarketFilter(filtered[0].name);
      }
    }
  }, [processedData.markets, isValidStoreName]);

  // Sync stName and revenue fields when marketFilter changes in Khai Bao
  React.useEffect(() => {
    if (marketFilter !== 'ALL' && processedData.markets.length > 0) {
      const market = processedData.markets.find(m => m.name === marketFilter);
      if (market) {
        if (stName !== market.name) setStName(market.name);
        if (stDtlk !== (market.actualReal || 0)) setStDtlk(market.actualReal || 0);
        if (stDtqd !== (market.actualVirtual || 0)) setStDtqd(market.actualVirtual || 0);
        if (stDtDuKienQD !== (market.targetQD || 0)) setStDtDuKienQD(market.targetQD || 0);
        if (stPercentHTTargetDuKienQD !== (market.percentHT || 0)) setStPercentHTTargetDuKienQD(market.percentHT || 0);
      }
    }
  }, [marketFilter, processedData.markets, stName, stDtlk, stDtqd, stDtDuKienQD, stPercentHTTargetDuKienQD, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD]);

  // Sync category targets from processed data
  // Logic moved to useLuykeData hook to prevent race conditions and F5 resets

  // Tự động tính toán Target Quy Đổi khi DT Dự Kiến hoặc % HT thay đổi
  React.useEffect(() => {
    if (stPercentHTTargetDuKienQD > 0) {
      const calculated = Math.round(stDtDuKienQD / (stPercentHTTargetDuKienQD / 100));
      if (calculated !== stTargetQuyDoi) {
        setStTargetQuyDoi(calculated);
      }
    }
  }, [stDtDuKienQD, stPercentHTTargetDuKienQD, stTargetQuyDoi, setStTargetQuyDoi]);

  // Tự động tính toán Target Sau X Hệ Số
  React.useEffect(() => {
    const calculated = Math.round(stTargetQuyDoi * (stPercentTarget / 100));
    if (calculated !== stTargetSauHeSo) {
      setStTargetSauHeSo(calculated);
    }
  }, [stTargetQuyDoi, stPercentTarget, stTargetSauHeSo, setStTargetSauHeSo]);

  const lastProcessedRef = React.useRef({ input: '', maKho: '' });

  // Sync supermarket revenue settings from clusterSummaryInput
  React.useEffect(() => {
    // Chỉ đồng bộ nếu có dữ liệu và (dữ liệu mới HOẶC mã kho mới)
    if (!clusterSummaryInput || !maKho) return;
    
    if (clusterSummaryInput === lastProcessedRef.current.input && maKho === lastProcessedRef.current.maKho) return;
    
    lastProcessedRef.current = { input: clusterSummaryInput, maKho };
    console.log('[KHAI_BAO] Đang đồng bộ dữ liệu từ BC Tổng Hợp Cụm cho mã kho:', maKho);

    try {
      // Trích xuất phần "1. BC TỔNG HỢP CỤM" từ dữ liệu đầu vào
      const inputToParse = extractSection(clusterSummaryInput, "1. BC TỔNG HỢP CỤM");
      console.log('[KHAI_BAO] Đã trích xuất section "1. BC TỔNG HỢP CỤM"');

      const allMarkets = parseMarketData(inputToParse, 0, 'LUYKE');
      console.log('[KHAI_BAO] Tổng số siêu thị tìm thấy trong section:', allMarkets.length);
      
      // Lọc siêu thị theo tiền tố quy định
      const filteredMarkets = allMarkets.filter(m => isValidStoreName(m.name || ''));
      console.log('[KHAI_BAO] Số siêu thị sau khi lọc tiền tố:', filteredMarkets.length);

      const cleanMaKho = maKho.trim().replace(/^0+/, '');
      const normMaKho = cleanMaKho.replace(/[\s_]+/g, '_').toUpperCase();
      const registry = getMarketRegistry();
      const registeredName = registry[cleanMaKho];
      
      console.log('[KHAI_BAO] Thử khớp siêu thị với mã kho:', cleanMaKho, 'Norm:', normMaKho, 'Tên đăng ký:', registeredName);
      
      // Tìm siêu thị khớp với mã kho hiện tại trong danh sách đã lọc
      const currentMarket = filteredMarkets.find(m => {
        // 1. Kiểm tra mã kho nếu có
        if (m.ma_kho) {
          const mCode = m.ma_kho.toString().trim().replace(/^0+/, '').replace(/[\s_]+/g, '').toUpperCase();
          if (mCode === normMaKho) return true;
        }
        
        // 2. Kiểm tra trong tên
        const marketName = m.name.toUpperCase();
        const normMarketName = marketName.replace(/[\s_]+/g, '').toUpperCase();
        
        // 3. Kiểm tra với tên trong registry
        if (registeredName) {
          const normRegistered = registeredName.toUpperCase().replace(/[\s_]+/g, '').toUpperCase();
          if (normMarketName === normRegistered || normMarketName.includes(normRegistered) || normRegistered.includes(normMarketName)) {
            return true;
          }
        }

        // 4. Kiểm tra mã kho xuất hiện trong tên (ví dụ: "96 - ĐMM_BLI_GRA")
        if (normMarketName.includes(normMaKho)) return true;
        
        // 5. Sử dụng normalize để so khớp linh hoạt hơn
        const nMarket = normalize(m.name);
        const nMaKho = normalize(maKho);
        if (nMarket.includes(nMaKho)) return true;

        return false;
      });
      
      if (currentMarket) {
        console.log('[KHAI_BAO] Đã tìm thấy siêu thị khớp:', currentMarket.name);
        
        // Extract values from currentMarket (already parsed by parseMarketData)
        const dtlkValue = currentMarket.actualReal || 0;
        const dtqdValue = currentMarket.actualVirtual || 0;
        const dtDuKienQD = currentMarket.targetQD || 0;
        const percentHT = currentMarket.percentHT || 0;

        setStName(currentMarket.name || '');
        setStDtlk(dtlkValue);
        setStDtqd(dtqdValue);
        setStDtDuKienQD(dtDuKienQD); 
        setStPercentHTTargetDuKienQD(percentHT);
        
        console.log('[KHAI_BAO] Đã cập nhật stName:', currentMarket.name);
        
        // CỘT "TAGET QUY ĐỔI" = CỘT "DT Dự Kiến (QĐ)" / (CỘT "% HT Target Dự Kiến (QĐ)" / 100)
        if (percentHT > 0) {
          setStTargetQuyDoi(Math.round(dtDuKienQD / (percentHT / 100)));
        } else {
          setStTargetQuyDoi(0);
        }
        
        // Mặc định % Target là 100 nếu chưa có
        setStPercentTarget(prev => prev || 100);
      } else if (filteredMarkets.length === 1) {
        // Nếu không tìm thấy theo mã kho, nhưng chỉ có 1 siêu thị hợp lệ trong báo cáo thì lấy luôn
        const m = filteredMarkets[0];
        console.log('[KHAI_BAO] Tự động lấy siêu thị duy nhất hợp lệ trong báo cáo:', m.name);
        setStName(m.name || '');
        setStDtlk(m.actualReal || 0);
        setStDtqd(m.actualVirtual || 0);
        setStDtDuKienQD(m.targetQD || 0);
        setStPercentHTTargetDuKienQD(m.percentHT || 0);
        if (m.percentHT && m.percentHT > 0 && m.targetQD) {
          setStTargetQuyDoi(Math.round(m.targetQD / (m.percentHT / 100)));
        } else {
          setStTargetQuyDoi(0);
        }
        setStPercentTarget(prev => prev || 100);
      } else {
        console.warn('[KHAI_BAO] Không tìm thấy siêu thị hợp lệ khớp với mã kho:', cleanMaKho);
      }
    } catch (err) {
      console.error('[KHAI_BAO] Lỗi khi đồng bộ dữ liệu:', err);
    }
  }, [clusterSummaryInput, maKho, isValidStoreName, setStName, setStDtlk, setStDtqd, setStDtDuKienQD, setStPercentHTTargetDuKienQD, setStTargetQuyDoi, setStPercentTarget]);

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
      {/* Professional Header - Spans full width */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-400 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Hệ thống quản trị</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Khai báo dữ liệu</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-[11px] font-black uppercase tracking-tighter"
            >
              {showAll ? <EyeOff size={16} /> : <Eye size={16} />}
              {showAll ? "Thu gọn giao diện" : "Mở rộng giao diện"}
            </button>
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="w-2 h-2 bg-indigo-600 rounded-full" />
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter">Kho: {maKho || '---'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-8 p-8">
        {/* Left Vertical Navigation */}
        <div className="w-full lg:w-[340px] shrink-0">
          <div className="flex flex-col gap-3 py-4 sticky top-[116px]">
            {[
              { id: 'REALTIME', label: 'REALTIME', icon: Database },
              { id: 'THOI_GIAN', label: 'CÀI ĐẶT THỜI GIAN', icon: Clock },
              { id: 'NHAN_VIEN', label: 'DỮ LIỆU NV', icon: Users },
              { id: 'TARGET_NGANH_HANG', label: 'CÀI ĐẶT TAGET NGÀNH HÀNG', icon: Target },
              { id: 'TARGET_DOANH_THU', label: 'CÀI ĐẶT TAGET DOANH THU', icon: TrendingUp },
              { id: 'RESOURCES', label: 'TÀI NGUYÊN', icon: Globe }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-[22px] border transition-all duration-300 group ${
                    isActive 
                      ? 'bg-white border-indigo-500 shadow-[0_15px_35px_-10px_rgba(79,70,229,0.15)] -translate-y-0.5 translate-x-1' 
                      : 'bg-transparent border-transparent hover:bg-white/50 hover:border-slate-200 text-slate-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-500'
                  }`}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[13px] font-black tracking-tight uppercase text-left ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>
                    {tab.label}
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
        <div className="flex-1 min-w-0">
          <InputSection 
            marketInput={marketInput}
            setMarketInput={setMarketInput}
            categoryInput={categoryInput}
            setCategoryInput={setCategoryInput}
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
            stName={stName}
            setStName={setStName}
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
          />
        </div>
      </div>
    </div>
  );
};

export default KhaiBao;
