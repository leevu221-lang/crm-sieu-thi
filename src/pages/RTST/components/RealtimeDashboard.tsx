/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Target, TrendingUp, BarChart3, Zap, Smartphone, PieChart } from 'lucide-react';
import { MarketInfo } from '../types';
import { cn } from '../utils';

interface RealtimeDashboardProps {
  market: MarketInfo;
}

const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({ market }) => {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-8" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br from-[#2563EB] to-[#7C3AED]">
          <Smartphone size={24} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight" style={{ fontWeight: 900 }}>{market.name}</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          { label: 'TARGET QUY ĐỔI', value: `${Math.round(market.targetST).toLocaleString('vi-VN')} Tr`, grad: 'from-rose-600 via-pink-600 to-rose-700 shadow-rose-500/20', icon: <Target size={22} /> },
          { label: 'DT QUY ĐỔI (DTQĐ)', value: market.actualVirtual !== undefined && market.actualVirtual !== null ? `${Math.round(market.actualVirtual).toLocaleString('vi-VN')} Tr` : '---', grad: 'from-[#2563EB] via-[#6366F1] to-[#7C3AED] shadow-indigo-500/20', icon: <TrendingUp size={22} /> },
          { label: '% HT TARGET (QĐ)', value: `${Math.round(market.percentHT || 0)}%`, grad: 'from-emerald-600 via-teal-600 to-cyan-600 shadow-emerald-500/20', icon: <BarChart3 size={22} /> },
          { label: '%QĐ', value: `${market.percentQD?.toFixed(1) || '0'}%`, grad: 'from-orange-500 via-amber-500 to-rose-500 shadow-orange-500/20', icon: <Zap size={22} /> },
          { label: 'TỶ TRỌNG TRẢ GÓP', value: `${market.installmentRate?.toFixed(1) || '0'}%`, grad: 'from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/20', icon: <PieChart size={22} /> },
        ].map((card, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl md:rounded-3xl p-5 text-white shadow-lg bg-gradient-to-br ${card.grad} border border-white/20 transition-all hover:scale-[1.02]`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/30 shrink-0">
                {card.icon}
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-white/90 leading-tight">{card.label}</p>
            </div>
            <div className="relative z-10">
              <p className="text-[34px] sm:text-[38px] font-bold font-oswald text-white drop-shadow-sm leading-none py-1" style={{ fontFamily: "'Oswald', sans-serif" }}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtimeDashboard;
