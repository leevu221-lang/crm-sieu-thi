/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Target, TrendingUp, BarChart3, Zap, Store, Smartphone, Watch, Monitor, Globe } from 'lucide-react';
import { MarketInfo } from '../types';
import { formatRealtimeDate, cn, formatShortCurrency, isValidStoreName, normalize, isKhoLuuDong } from '../utils';
import Dashboard from './Dashboard';

import CategoryTable from './CategoryTable';


interface OverviewDashboardProps {
  markets: MarketInfo[];
  marketFilter: string;
  setMarketFilter: (val: string) => void;
  categories?: any[];
  catGroupFilter?: string;
  setCatGroupFilter?: (val: string) => void;
  captureRef: React.RefObject<HTMLDivElement | null>;
  fullCaptureRef?: React.RefObject<HTMLDivElement | null>;
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
  stPercentTarget?: number;
}

const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  markets,
  marketFilter,
  setMarketFilter,
  categories = [],
  catGroupFilter = 'ALL',
  setCatGroupFilter = () => {},
  captureRef,
  fullCaptureRef,
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
  stDtDuKienQD = 0,
  stPercentTarget = 100
}) => {
  const getIcon = (name: string) => {
    const upper = name.toUpperCase();
    if (upper.includes('ĐMM')) return <Smartphone size={20} />;
    if (upper.includes('ĐMS3')) return <Watch size={20} />;
    if (upper.includes('ĐML')) return <Monitor size={20} />;
    return <Store size={20} />;
  };

  const validMarkets = markets.filter(m => 
    isValidStoreName(m.name) && 
    m.name.trim() !== '104' && 
    !normalize(m.name || '').includes('kho ban hang luu dong')
  );
  const filteredMarkets = validMarkets.filter(m => 
    marketFilter === 'ALL' || 
    normalize(m.name).includes(normalize(marketFilter)) || 
    normalize(marketFilter).includes(normalize(m.name))
  );

  const formatCurrencyUnit = (num: number) => {
    const abs = Math.abs(Math.round(num));
    if (abs >= 1000) return `${Math.round(num).toLocaleString('vi-VN')} tỷ`;
    if (abs > 0) return `${Math.round(num).toLocaleString('vi-VN')} tr`;
    return '0';
  };

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
          {/* Temporarily hidden */}
          {false && title.toUpperCase().includes('LUỸ KẾ') && (
            <button
              onClick={() => window.open('https://bi.thegioididong.com/khoi-ban-hang-sub?id=73920&tab=bcth&rt=1&dm=1', '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-amber-500 hover:to-amber-600 transition-all shadow-lg shadow-amber-200/50 active:scale-95 border-t border-white/20 ml-auto"
            >
              <Globe size={14} />
              Lấy dữ liệu BI
            </button>
          )}
        </div>
      )}

      <div ref={captureRef} className="flex flex-col gap-6 bg-white p-4 rounded-3xl border border-slate-200 mt-0 md:mt-4">
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
            onClick={() => captureElement(fullCaptureRef || captureRef, 'Realtime_Dashboard')}
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
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white bg-indigo-600")}>
                {getIcon(market.name)}
              </div>
              <h2 className="text-base md:text-xl font-black text-slate-900 uppercase tracking-tight">{market.name}</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
                {(() => {
                  // Compute targetValue from parsed market data (DT Dự Kiến QĐ / % HT Target Dự Kiến QĐ)
                  // Data synced from: LUỸ KẾ DT, BÁO CÁO TỔNG HỢP, KHAI BÁO
                  const targetDataKey = Object.keys(allStoreTargets || {}).find(k => normalize(k) === normalize(market.name));
                  const targetData: any = targetDataKey ? allStoreTargets[targetDataKey] : null;
                  const dtDuKienQD = market.targetQD || 0;
                  const percentHT = market.percentHT || 0;
                  const targetValue = (dtDuKienQD > 0 && percentHT > 0) ? Math.round(dtDuKienQD / (percentHT / 100)) : ((targetData as any)?.stTargetSauHeSo || (targetData as any)?.stTargetQuyDoi || stTargetSauHeSo || stTargetQuyDoi || 0);
                  const percentTargetVal = (targetData as any)?.stPercentTarget ?? stPercentTarget ?? 100;
                  const targetSauHeSo = Math.round(targetValue * (percentTargetVal / 100));

                  return [
                    { label: 'TARGET QUY ĐỔI', value: formatCurrencyUnit(targetSauHeSo), color: 'bg-blue-900', icon: <Target size={20} /> },
                    { label: 'DT QUY ĐỔI (DTQĐ)', value: formatCurrencyUnit(market.actualVirtual || 0), color: 'bg-emerald-600', icon: <TrendingUp size={20} /> },
                    { 
                      label: '% HT TARGET (QĐ)', 
                      value: title.toUpperCase().includes('LUỸ KẾ')
                        ? `${targetSauHeSo > 0 ? Math.round((daysPassed > 0 && totalDays > 0 ? (((market.actualVirtual || 0) / daysPassed) * totalDays) : (market.actualVirtual || 0)) / targetSauHeSo * 100) : 0}%`
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
                      if (card.label === 'TARGET (QĐ)') return false;
                    }
                    return true;
                  }).map((card, i) => (
                    <div key={i} className={cn("p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between h-full text-white", card.color)}>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 backdrop-blur-sm shrink-0">
                          {React.cloneElement(card.icon as any, { size: 18, strokeWidth: 2.5 })}
                        </div>
                        <p className="text-[11px] font-bold text-white uppercase tracking-widest leading-tight">{card.label}</p>
                      </div>
                      <div>
                        <p className="text-[45px] font-bold tracking-tight whitespace-nowrap font-oswald">{card.value}</p>
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
              <CategoryTable 
                categories={categories}
                catMarketFilter={marketFilter}
                setCatMarketFilter={setMarketFilter}
                catGroupFilter={catGroupFilter}
                setCatGroupFilter={setCatGroupFilter}
                captureRef={fullCaptureRef || captureRef}
                captureElement={captureElement}
              />
            ) : (
              <CategoryTable 
                categories={categories}
                catMarketFilter={marketFilter}
                setCatMarketFilter={setMarketFilter}
                catGroupFilter={catGroupFilter}
                setCatGroupFilter={setCatGroupFilter}
                captureRef={fullCaptureRef || captureRef}
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
