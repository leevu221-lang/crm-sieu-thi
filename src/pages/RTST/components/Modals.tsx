/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, X, CheckCircle2, ChevronDown, ChevronUp, Camera, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRealtimeDate, getWorkingDayProgress, formatStaffName } from '../utils';
import { YcxStaffData } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed">{message}</p>
          </div>
          <div className="p-4 bg-slate-50 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-all"
            >
              HỦY BỎ
            </button>
            <button 
              onClick={onConfirm}
              className="flex-1 px-6 py-3 rounded-xl text-sm font-black text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all"
            >
              XÁC NHẬN XÓA
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onCapture?: () => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, title, children, onCapture }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-indigo-600 rounded-full" />
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {onCapture && (
                <button 
                  onClick={onCapture}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all"
                >
                  <Camera size={16} />
                  CHỤP ẢNH BẢNG
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

interface StaffMatrixTableProps {
  ycxStaffData: YcxStaffData[];
  catMarketFilter: string;
  captureRef?: React.RefObject<HTMLDivElement | null>;
}

export const StaffYcxDetailTable: React.FC<StaffMatrixTableProps> = ({ ycxStaffData, catMarketFilter, captureRef }) => (
  <div ref={captureRef} className="bg-white p-4">
    <div className="overflow-x-auto border border-slate-400 bg-white scrollbar-thin scrollbar-thumb-slate-300">
      <table className="w-full text-left border-collapse border border-slate-400 min-w-[1200px]">
        <thead>
          <tr className="border-b border-slate-400 bg-white">
            <th colSpan={6} className="px-1 py-1 sm:px-2 sm:py-2 text-[20px] font-black text-black uppercase tracking-wider border-r border-slate-400 text-center">
              HIỆU QUẢ KHAI THÁC
            </th>
            <th colSpan={19} className="px-1 py-1 sm:px-2 sm:py-2 text-[20px] font-black text-red-600 uppercase tracking-wider text-center">
              {catMarketFilter !== 'ALL' ? (catMarketFilter.split(' - ')[1] || catMarketFilter) : 'CHI TIẾT'}
            </th>
          </tr>
          <tr className="border-b border-slate-400 bg-white">
            <th colSpan={6} className="px-1 py-1 sm:px-2 sm:py-2 text-[12px] font-bold text-black border-r border-slate-400">
              <div className="flex items-center justify-center gap-2">
                <Calendar size={14} className="text-indigo-600" />
                {formatRealtimeDate()}
              </div>
            </th>
            <th colSpan={26} className="px-1 py-1 sm:px-2 sm:py-2 text-[12px] font-bold text-black">
              <div className="flex items-center justify-center gap-2">
                <Clock size={14} className="text-amber-600" />
                THỜI GIAN SỬ DỤNG: {getWorkingDayProgress().toFixed(1)}%
              </div>
            </th>
          </tr>
          <tr className="border-b border-slate-400">
            <th rowSpan={2} className="px-2 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center border-r border-slate-400 bg-[#00b050] min-w-[40px]">HẠNG</th>
            <th rowSpan={2} className="px-2 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center border-r border-slate-400 bg-[#00b050] whitespace-nowrap w-px">NHÂN VIÊN</th>
            <th rowSpan={2} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center border-r border-slate-400 bg-[#ffc000] w-[65px]">DT THỰC</th>
            <th rowSpan={2} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center border-r border-slate-400 bg-[#ffc000] w-[65px]">DT QUY ĐỔI</th>
            <th rowSpan={2} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center border-r border-slate-400 bg-[#ed7d31] w-[65px]">%QUY ĐỔI</th>
            <th rowSpan={2} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center border-r border-slate-400 bg-[#ed7d31] w-[65px]">%TRẢ CHẬM</th>
            <th colSpan={6} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center bg-[#ffe699] border-b border-slate-400 border-r border-slate-400">GIA DỤNG</th>
            <th colSpan={6} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center bg-[#c6e0b4] border-b border-slate-400 border-r border-slate-400">BẢO HIỂM</th>
            <th colSpan={7} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center bg-[#bdd7ee] border-b border-slate-400 border-r border-slate-400">ICT</th>
            <th colSpan={7} className="px-1 py-2 text-[12px] font-black text-black uppercase tracking-wider text-center bg-[#f4b084] border-b border-slate-400">CE</th>
          </tr>
          <tr className="border-b border-slate-400 bg-white">
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#fff2cc] w-[65px]">DT THỰC</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#fff2cc] w-[65px]">MÁY LỌC NƯỚC</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#fff2cc] w-[65px]">NỒI CƠM</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#fff2cc] w-[65px]">NỒI CHIÊN</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#fff2cc] w-[65px]">QUẠT GIÓ</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#fff2cc] w-[65px]">BẾP CÁC LOẠI</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#e2efda] w-[65px]">DOANH THU</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#e2efda] w-[65px]">SỐ LƯỢNG</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#e2efda] w-[65px]">1 ĐỔI 1</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#e2efda] w-[65px]">MỞ RỘNG</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#e2efda] w-[65px]">RƠI VỠ</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#e2efda] w-[65px]">KHÁC</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">SMARTPHONE</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">SẠC DỰ PHÒNG</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">TAI NGHE</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">CAMERA</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">SIM SỐ</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">VIEON</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#deeaf6] w-[65px]">MIẾNG DÁN</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#f8cbad] w-[65px]">DOANH THU CE</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#f8cbad] w-[65px]">SL TIVI</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#f8cbad] w-[65px]">SL TỦ LẠNH</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#f8cbad] w-[65px]">SL MÁY GIẶT</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#f8cbad] w-[65px]">SL MÁY LẠNH</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center border-r border-slate-400 bg-[#f8cbad] w-[65px]">SL MÁY NƯỚC NÓNG</th>
            <th className="px-1 py-1 text-[12px] font-black text-black uppercase text-center bg-[#f8cbad] w-[65px]">SL MS / MRC</th>
          </tr>
        </thead>
        <tbody>
          {ycxStaffData
            .filter(s => catMarketFilter === 'ALL' || (s.marketName && s.marketName.toUpperCase().includes(catMarketFilter.toUpperCase())))
            .sort((a, b) => b.convertedRevenue - a.convertedRevenue)
            .map((staff, idx) => {
              const qdRate = staff.totalRevenue > 0 ? (staff.convertedRevenue / staff.totalRevenue) * 100 : 0;
              return (
                <tr key={idx} className="border-b border-slate-400 bg-white hover:bg-slate-50">
                  <td className="px-1 py-1 text-[10.67px] font-black text-black text-center border-r border-slate-400 bg-[#ffff00]">{idx + 1}</td>
                  <td className="px-2 py-1 text-[10.67px] font-black text-slate-800 border-r border-slate-400 whitespace-nowrap">{formatStaffName(staff.staffName).toUpperCase()}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400",
                    staff.totalRevenue === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.totalRevenue.toLocaleString('vi-VN')}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400",
                    staff.convertedRevenue === 0 ? "text-red-600 font-normal" : "font-black text-emerald-600"
                  )}>{staff.convertedRevenue.toLocaleString('vi-VN')}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] font-black text-center border-r border-slate-400",
                    qdRate === 0 ? "text-red-600 font-normal" : (qdRate >= 100 ? "text-emerald-600 font-black" : "text-amber-600 font-black")
                  )}>{qdRate.toFixed(0)}%</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400",
                    staff.installmentRevenue === 0 ? "text-red-600 font-normal" : "font-black text-indigo-600"
                  )}>{staff.totalRevenue > 0 ? ((staff.installmentRevenue / staff.totalRevenue) * 100).toFixed(0) : 0}%</td>
                  
                  {/* Gia Dung */}
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#fff2cc]",
                    staff.giaDung.total === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.giaDung.total.toLocaleString('vi-VN')}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#fff2cc]",
                    staff.giaDung.mayLocNuoc === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.giaDung.mayLocNuoc}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#fff2cc]",
                    staff.giaDung.noiCom === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.giaDung.noiCom}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#fff2cc]",
                    staff.giaDung.noiChien === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.giaDung.noiChien}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#fff2cc]",
                    staff.giaDung.quatGio === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.giaDung.quatGio}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#fff2cc]",
                    staff.giaDung.bep === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.giaDung.bep}</td>
                  
                  {/* Bao Hiem */}
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#e2efda]",
                    staff.baoHiem.total === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.baoHiem.total.toLocaleString('vi-VN')}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#e2efda]",
                    staff.baoHiem.count === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.baoHiem.count}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#e2efda]",
                    staff.baoHiem.motDoiMot === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.baoHiem.motDoiMot}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#e2efda]",
                    staff.baoHiem.moRong === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.baoHiem.moRong}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#e2efda]",
                    staff.baoHiem.roiVo === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.baoHiem.roiVo}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#e2efda]",
                    staff.baoHiem.khac === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.baoHiem.khac}</td>
                  
                  {/* ICT */}
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.smartphone === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.smartphone}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.sdp === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.sdp}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.taiNghe === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.taiNghe}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.camera === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.camera}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.sim === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.sim}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.vieon === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.vieon}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#deeaf6]",
                    staff.ict.miengDan === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ict.miengDan}</td>

                  {/* CE */}
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#f8cbad]",
                    staff.ce.total === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.total.toLocaleString('vi-VN')}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#f8cbad]",
                    staff.ce.tivi === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.tivi}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#f8cbad]",
                    staff.ce.tuLanh === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.tuLanh}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#f8cbad]",
                    staff.ce.mayGiat === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.mayGiat}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#f8cbad]",
                    staff.ce.mayLanh === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.mayLanh}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center border-r border-slate-400 bg-[#f8cbad]",
                    staff.ce.mayNuocNong === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.mayNuocNong}</td>
                  <td className={cn(
                    "px-1 py-1 text-[10.67px] text-center bg-[#f8cbad]",
                    staff.ce.msMrc === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                  )}>{staff.ce.msMrc}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  </div>
);
