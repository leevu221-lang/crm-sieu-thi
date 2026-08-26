import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  BarChart3, 
  Database, 
  HeartPulse, 
  Wrench, 
  Trophy, 
  Gift, 
  MessageSquare, 
  FileSpreadsheet, 
  ShoppingBag, 
  CalendarDays 
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: any;
  color?: string;
}

interface GradientV2NavigationProps {
  navItems: NavItem[];
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const GradientV2Navigation: React.FC<GradientV2NavigationProps> = ({
  navItems,
  currentPage,
  setCurrentPage
}) => {
  return (
    <nav className="relative z-30 w-full max-w-[1720px] mx-auto px-2 sm:px-3 md:px-[15px] pt-3 pb-1">
      <div className="w-full bg-white/95 backdrop-blur-xl p-1.5 sm:p-2 rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`relative flex items-center justify-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 cursor-pointer shrink-0 active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#EC4899] text-white shadow-md shadow-indigo-500/25 scale-[1.02] border border-white/30'
                  : 'bg-slate-50 text-[#0F172A]/70 hover:text-[#0F172A] hover:bg-slate-100/90 border border-slate-200/60 hover:border-slate-300 transition-colors'
              }`}
            >
              <div className={`flex items-center justify-center transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white drop-shadow-sm' : 'text-slate-500'} />
              </div>
              <span className="leading-none">{item.label}</span>
              
              {isActive && (
                <motion.div
                  layoutId="active-indicator-v2"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
