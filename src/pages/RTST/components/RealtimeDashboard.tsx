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
  console.log('RealtimeDashboard rendering for:', market.name);
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg mb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg bg-indigo-600">
          <Smartphone size={24} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">ĐML - 12 TRẦN HƯNG ĐẠO</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'TARGET QUY ĐỔI', value: `${Math.round(market.targetST).toLocaleString('vi-VN')} Tr`, color: 'bg-blue-700', icon: <Target size={24} /> },
          { label: 'DT QUY ĐỔI (DTQĐ)', value: market.actualVirtual !== undefined && market.actualVirtual !== null ? `${Math.round(market.actualVirtual).toLocaleString('vi-VN')} Tr` : 'null', color: 'bg-emerald-600', icon: <TrendingUp size={24} /> },
          { label: '% HT TARGET (QĐ)', value: `${Math.round(market.percentHT || 0)}%`, color: 'bg-amber-500', icon: <BarChart3 size={24} /> },
          { label: '%QĐ', value: `${market.percentQD?.toFixed(1) || '0'}%`, color: 'bg-rose-500', icon: <Zap size={24} /> },
          { label: 'TỶ TRỌNG TRẢ GÓP', value: `${market.installmentRate?.toFixed(1) || '0'}%`, color: 'bg-indigo-600', icon: <PieChart size={24} /> },
        ].map((card, i) => (
          <div key={i} className={cn("relative overflow-hidden rounded-2xl p-6 text-white shadow-md", card.color)}>
            <div className="relative z-10">
              <p className="text-xs font-black uppercase opacity-80 tracking-wider mb-2">{card.label}</p>
              <p className="text-3xl font-black">{card.value}</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20 rotate-12 scale-150">
              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtimeDashboard;
