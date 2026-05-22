/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Target, TrendingUp, BarChart3, Zap, Smartphone, PieChart } from 'lucide-react';
import { MarketInfo } from '../types';
import { cn, normalize } from '../utils';

interface DashboardProps {
  markets: MarketInfo[];
  marketFilter: string;
  title?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ markets, marketFilter, title = '' }) => {
  const allowedPrefixes = ["ĐML", "ĐMM", "ĐMS", "ĐMS3", "TGD", "AAR"];
  const isValidStore = (name: string) => allowedPrefixes.some(prefix => name.toUpperCase().includes(prefix));

  const validMarkets = markets.filter(m => 
    isValidStore(m.name) && 
    m.name.trim() !== '104' && 
    !normalize(m.name || '').includes('kho ban hang luu dong')
  );
  const filteredMarkets = validMarkets.filter(m => 
    marketFilter === 'ALL' || 
    normalize(m.name).includes(normalize(marketFilter)) || 
    normalize(marketFilter).includes(normalize(m.name))
  );

  if (filteredMarkets.length === 0) return null;

  const totalTargetST = filteredMarkets.reduce((acc, m) => acc + (m.targetST || 0), 0);
  const totalActualVirtual = filteredMarkets.reduce((acc, m) => acc + (m.actualVirtual || 0), 0);
  const avgPercentHT = totalTargetST > 0 ? (totalActualVirtual / totalTargetST) * 100 : 0;
  
  const totalActualReal = filteredMarkets.reduce((acc, m) => acc + (m.actualReal || 0), 0);
  const avgPercentQD = totalActualReal > 0 ? ((totalActualVirtual - totalActualReal) / totalActualReal) * 100 : 0;

  const avgInstallmentRate = filteredMarkets.length > 0 ? filteredMarkets.reduce((acc, m) => acc + (m.installmentRate || 0), 0) / filteredMarkets.length : 0;

  const isLuyKe = title.toUpperCase().includes('LUỸ KẾ');

  const stats = [
    { 
      label: 'TARGET (QĐ)', 
      value: `${Math.round(totalTargetST)}`, 
      icon: Target, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50' 
    },
    { 
      label: 'DT QUY ĐỔI', 
      value: `${Math.round(totalActualVirtual)}`, 
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bgColor: 'bg-emerald-50' 
    },
    { 
      label: '% HT TARGET', 
      value: `${Math.round(avgPercentHT)}%`, 
      icon: BarChart3, 
      color: 'text-amber-600', 
      bgColor: 'bg-amber-50' 
    },
    { 
      label: '% QUY ĐỔI', 
      value: `${Math.round(avgPercentQD)}%`, 
      icon: Zap, 
      color: 'text-rose-600', 
      bgColor: 'bg-rose-50' 
    },
    { 
      label: 'TRẢ GÓP', 
      value: `${Math.round(avgInstallmentRate)}%`, 
      icon: PieChart, 
      color: 'text-indigo-600', 
      bgColor: 'bg-indigo-50' 
    }
  ].filter(stat => {
    if (isLuyKe) {
      // For Luy Ke, we might want to hide TARGET (QĐ) and % QUY ĐỔI based on typical requests
      return stat.label !== 'TARGET (QĐ)' && stat.label !== '% QUY ĐỔI';
    }
    return true;
  });

  return (
    <div className={cn(
      "grid gap-3 mb-4 px-1",
      isLuyKe ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    )}>
      {stats.map((stat, i) => (
        <div key={i} className="bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm bg-white", stat.color)}>
            <stat.icon size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
            <p className="text-lg font-black text-slate-900 tracking-tight">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
