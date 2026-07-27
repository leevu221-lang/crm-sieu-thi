/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LayoutGrid, RefreshCw, Save, Trash2 } from 'lucide-react';

import { UserProfile } from '../../../types';

interface HeaderProps {
  userProfile: UserProfile | null;
  maKho: string;
  isProcessing: boolean;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  userProfile,
  maKho,
  isProcessing,
  children
}) => {
  return (
    <header className="sticky top-[100px] md:top-[148px] z-[45] bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
            <LayoutGrid size={20} className="md:w-6 md:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none truncate">⚡ BI REALTIME SIÊU THỊ</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SIÊU THỊ:</span>
              <div className="bg-slate-100 rounded-lg px-3 py-1 text-[11px] font-black text-indigo-600 shadow-inner border border-slate-200/50">
                {userProfile?.ten_sieu_thi || maKho || '---'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {children}
        </div>
      </div>
    </header>
  );
};

export default Header;
