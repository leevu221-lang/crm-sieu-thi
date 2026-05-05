/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, Save, User, Store, Loader2 } from 'lucide-react';
import { formatRealtimeDate } from '../../utils/rtstHelpers';

interface HeaderProps {
  user: any;
  maKho: string | undefined;
  lastSaved: Date | null;
  isProcessing: boolean;
  onSync: () => void;
  onSave: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  user, 
  maKho, 
  lastSaved, 
  isProcessing, 
  onSync, 
  onSave 
}) => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 ring-4 ring-blue-50">
              <RefreshCw className={`text-white w-5 h-5 md:w-6 md:h-6 ${isProcessing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                RTST <span className="text-blue-600">REPORT</span>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-bold uppercase tracking-wider">v1.1</span>
              </h1>
              <div className="flex items-center gap-3 text-[10px] md:text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                  <User size={12} className="text-slate-400" /> {user?.username || 'Guest'}
                </span>
                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Store size={12} className="text-slate-400" /> {maKho || 'N/A'}
                </span>
                <span className="hidden sm:flex items-center gap-1 text-blue-600 font-bold">
                  {formatRealtimeDate()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden lg:flex flex-col items-end mr-2">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Trạng thái</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Sẵn sàng
              </span>
            </div>
            
            <button 
              onClick={onSync}
              className="flex-1 sm:flex-none group flex items-center justify-center gap-2 bg-white text-blue-500 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold hover:bg-blue-50 transition-all border border-slate-200 shadow-sm"
            >
              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform" />
              <span>ĐỒNG BỘ DỮ LIỆU</span>
            </button>
            <button 
              onClick={onSave}
              className="flex-1 sm:flex-none group flex items-center justify-center gap-2 bg-white text-emerald-600 px-3 md:px-5 py-2 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold hover:bg-emerald-50 transition-all border border-slate-200 shadow-sm"
            >
              <Save size={14} className="group-hover:scale-110 transition-transform" />
              <span>LƯU DỮ LIỆU VÀO DATABASE</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
