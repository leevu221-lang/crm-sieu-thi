/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Target, TrendingUp, BarChart3, Zap, Store, Smartphone, Watch, Monitor } from 'lucide-react';
import { MarketInfo } from '../types';
import { formatRealtimeDate, cn, formatShortCurrency, isValidStoreName, normalize } from '../utils';
import Dashboard from './Dashboard';

import CategoryTable from './CategoryTable';
import LuyKeCategoryTable from '../../LuyKeCategoryTable';

interface OverviewDashboardProps {
  markets: MarketInfo[];
  marketFilter: string;
  setMarketFilter: (val: string) => void;
  categories?: any[];
  catGroupFilter?: string;
  setCatGroupFilter?: (val: string) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  categoryCaptureRef?: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
  title?: string;
  showFilters?: boolean;
  hideTargetQD?: boolean;
  hideDashboard?: boolean;
  daysPassed?: number;
  totalDays?: number;
  stName?: string;
  stTargetQuyDoi?: number;
  stTargetSauHeSo?: number;
  allStoreTargets?: Record<string, any>;
  storeSettings?: Record<string, any>;
  stDtDuKienQD?: number;
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  markets,
  marketFilter,
  setMarketFilter,
  categories = [],
  catGroupFilter = 'ALL',
  setCatGroupFilter = () => {},
  captureRef,
  categoryCaptureRef,
  captureElement,
  title = 'TỔNG QUAN SIÊU THỊ (REALTIME)',
  showFilters = true,
  hideTargetQD = false,
  hideDashboard = false,
  daysPassed = 0,
  totalDays = 0,
  stName = '',
  stTargetQuyDoi = 0,
  stTargetSauHeSo = 0,
  allStoreTargets = {},
  storeSettings = {},
  stDtDuKienQD = 0
}) => {
  const getIcon = (name: string) => {
    const upper = name.toUpperCase();
    if (upper.includes('ĐMM')) return <Smartphone size={20} />;
    if (upper.includes('ĐMS3')) return <Watch size={20} />;
    if (upper.includes('ĐML')) return <Monitor size={20} />;
    return <Store size={20} />;
  };

  const validMarkets = markets.filter(m => isValidStoreName(m.name) && m.name.trim() !== '104');
  const filteredMarkets = validMarkets.filter(m => (marketFilter === 'ALL' || m.name === marketFilter));

  return (
    <div className="flex flex-col gap-0">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4 no-capture">
          <button 
            onClick={() => setMarketFilter('ALL')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm",
              marketFilter === 'ALL' ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
            )}
          >
            TẤT CẢ SIÊU THỊ
          </button>
          {validMarkets.map((m, i) => (
            <button 
              key={i}
              onClick={() => setMarketFilter(m.name)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm",
                marketFilter === m.name ? "bg-indigo-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      <div ref={captureRef} className="flex flex-col gap-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mt-0 md:mt-4">
        <div className="flex items-center justify-between px-2 sticky top-0 bg-white z-20 py-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-10 bg-black rounded-full" />
            <div>
              <h3 className={cn("text-sm sm:text-lg md:text-2xl font-black text-black uppercase tracking-tight", title.toUpperCase().includes('LUỸ KẾ') ? "no-capture" : "")}>{title}</h3>
              {!title.toUpperCase().includes('LUỸ KẾ') && (
                <div className="flex items-center gap-2">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">{formatRealtimeDate()}</p>
                  <span className="hidden sm:inline text-[9px] font-black text-slate-300">•</span>
                  <p className="hidden sm:block text-[9px] font-black text-slate-400 uppercase tracking-widest">Nguồn: 1. BI Tổng quan</p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => captureElement(captureRef, 'Realtime_Dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition-all no-capture"
          >
            <Camera size={14} />
            CHỤP TOÀN BỘ
          </button>
        </div>

        {!hideDashboard && <Dashboard markets={markets} marketFilter={marketFilter} />}

        {filteredMarkets.map((market, mIdx) => (
          <div key={mIdx} className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg bg-indigo-600")}>
                {getIcon(market.name)}
              </div>
              <h2 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight">{market.name}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
                {(() => {
                  // Find the target for this specific market from allStoreTargets using robust matching
                  const normMarketName = normalize(market.name);
                  
                  // 1. Calculate target based on current file data
                  const mDtDuKienQD = market.targetQD || 0;
                  const mPercentHT = market.percentHT || 0;
                  const mTargetQuyDoi = mPercentHT > 0 ? Math.round(mDtDuKienQD / (mPercentHT / 100)) : 0;

                  // 2. Find the target for this specific market from allStoreTargets using robust matching
                  const mTargetData = Object.entries(allStoreTargets || {}).find(([name, settings]) => {
                    // 1. Try matching by warehouse code if available
                    let mCode = market.ma_kho ? market.ma_kho.toString().trim().replace(/^0+/, '').replace(/[\s_]+/g, '').toUpperCase() : "";
                    
                    // Fallback: extract code from market name if ma_kho is missing
                    if (!mCode && market.name) {
                      const codeMatch = market.name.match(/^([^-]+)/);
                      if (codeMatch) mCode = codeMatch[1].trim().replace(/[\s_]+/g, '').toUpperCase();
                    }

                    if (mCode && settings.warehouse_code) {
                      const sCode = settings.warehouse_code.toString().trim().replace(/^0+/, '').replace(/[\s_]+/g, '').toUpperCase();
                      if (mCode === sCode) return true;
                    }
                    
                    // 2. Try matching by name
                    const normName = normalize(name);
                    const normMarketName = normalize(market.name || '');
                    return normName === normMarketName || normName.includes(normMarketName) || normMarketName.includes(normName);
                  })?.[1];
                  
                  // 4. Final target: STRICTLY use saved target from Khai Bao (CÀI ĐẶT DOANH THU SIÊU THỊ)
                  // No fallback calculation allowed (CẤM DỰ ĐOÁN KẾT QUẢ)
                  let finalTargetSauHeSo = mTargetData?.stTargetSauHeSo || 0;
                  
                  // If this is the active store, prioritize the prop value which is more up-to-date
                  if (stName && normalize(market.name) === normalize(stName) && stTargetSauHeSo > 0) {
                    finalTargetSauHeSo = stTargetSauHeSo;
                  }

                  return [
                    { label: 'TARGET (QĐ)', value: `${Math.round(market.targetQD || 0).toLocaleString('vi-VN')}`, color: 'bg-blue-600', icon: <Target size={20} /> },
                    { 
                      label: 'TARGET QUY ĐỔI', 
                      value: title.toUpperCase().includes('LUỸ KẾ')
                        ? Math.round(finalTargetSauHeSo).toLocaleString('vi-VN')
                        : Math.round(market.targetQD || 0).toLocaleString('vi-VN'), 
                      color: 'bg-blue-800', 
                      icon: <Target size={20} /> 
                    },
                    { label: 'DT QUY ĐỔI (DTQĐ)', value: `${Math.round(market.actualVirtual || 0).toLocaleString('vi-VN')}`, color: 'bg-emerald-600', icon: <TrendingUp size={20} /> },
                    { 
                      label: '% HT TARGET (QĐ)', 
                      value: title.toUpperCase().includes('LUỸ KẾ')
                        ? `${finalTargetSauHeSo > 0 ? Math.round((daysPassed > 0 && totalDays > 0 ? (((market.actualVirtual || 0) / daysPassed) * totalDays) : (market.actualVirtual || 0)) / finalTargetSauHeSo * 100) : 0}%`
                        : `${Math.round(market.percentHT || 0)}%`, 
                      color: 'bg-amber-500', 
                      icon: <BarChart3 size={20} /> 
                    },
                    { 
                      label: '%QĐ', 
                      value: title.toUpperCase().includes('LUỸ KẾ')
                        ? `${market.actualReal !== 0 ? Math.round((((market.actualVirtual || 0) - market.actualReal) / market.actualReal) * 100) : '0'}%`
                        : `${Math.round(market.percentQD || 0)}%`, 
                      color: 'bg-rose-500', 
                      icon: <Zap size={20} /> 
                    },
                    { 
                      label: title.toUpperCase().includes('LUỸ KẾ') ? '+/- DTCK Tháng' : 'TLPVTC LK', 
                      value: title.toUpperCase().includes('LUỸ KẾ')
                        ? `${Math.round(market.dtckThang || 0)}%`
                        : `${Math.round(market.tlpvtcLK || 0)}%`, 
                      color: 'bg-violet-600', 
                      icon: <Smartphone size={20} /> 
                    },
                    { 
                      label: 'Tỷ Trọng Trả Góp', 
                      value: `${Math.round(market.installmentRate || 0)}%`, 
                      color: 'bg-indigo-600', 
                      icon: <BarChart3 size={20} /> 
                    },
                  ].filter(card => {
                    if (hideTargetQD || title.toUpperCase().includes('LUỸ KẾ')) {
                      return card.label !== 'TARGET (QĐ)';
                    }
                    return card.label !== 'TARGET QUY ĐỔI';
                  }).map((card, i) => (
                    <div key={i} className={cn("p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full text-white", card.color)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm">
                          {React.cloneElement(card.icon as any, { size: 18, strokeWidth: 2.5 })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-3xl font-bold tracking-tight font-oswald">{card.value}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ))}

        {categories.length > 0 && (
          <div className="mt-4">
            {title.toUpperCase().includes('LUỸ KẾ') ? (
              <LuyKeCategoryTable 
                categories={categories}
                catMarketFilter={marketFilter}
                setCatMarketFilter={setMarketFilter}
                catGroupFilter={catGroupFilter}
                setCatGroupFilter={setCatGroupFilter}
                captureRef={categoryCaptureRef || captureRef}
                captureElement={captureElement}
                daysPassed={daysPassed}
                totalDays={totalDays}
              />
            ) : (
              <CategoryTable 
                categories={categories}
                catMarketFilter={marketFilter}
                setCatMarketFilter={setMarketFilter}
                catGroupFilter={catGroupFilter}
                setCatGroupFilter={setCatGroupFilter}
                captureRef={categoryCaptureRef || captureRef}
                captureElement={captureElement}
                title='REALTIME NGÀNH HÀNG'
                mode='realtime'
                daysPassed={daysPassed}
                totalDays={totalDays}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewDashboard;
