import React from 'react';
import { Users, Shield, Settings, ChevronRight } from 'lucide-react';

interface UserManagementCardProps {
  onNavigate: (page: 'users') => void;
  userCount: number;
}

export default function UserManagementCard({ onNavigate, userCount }: UserManagementCardProps) {
  return (
    <div 
      onClick={() => onNavigate('users')}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
          <Users size={24} />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
          <Shield size={10} className="text-indigo-500" />
          Hệ thống
        </div>
      </div>
      
      <h3 className="text-lg font-bold text-slate-800 mb-1">Quản lý Người dùng</h3>
      <p className="text-slate-500 text-sm mb-4 leading-relaxed">
        Phân quyền truy cập, quản lý tài khoản và bảo mật hệ thống.
      </p>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Tổng số nhân sự</span>
          <span className="text-xl font-black text-indigo-600">{userCount}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <ChevronRight size={18} />
        </div>
      </div>
    </div>
  );
}
