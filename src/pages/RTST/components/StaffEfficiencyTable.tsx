/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Calendar, Clock } from 'lucide-react';
import { YcxStaffData } from '../types';
import { formatRealtimeDate, getWorkingDayProgress, cn, formatStaffName } from '../utils';

interface StaffEfficiencyTableProps {
  ycxStaffData: YcxStaffData[];
  excludedYcxStaffNames: string[];
  catMarketFilter: string;
  captureRef: React.RefObject<HTMLDivElement | null>;
  captureElement: (ref: React.RefObject<HTMLDivElement | null>, name: string) => void;
}

const StaffEfficiencyTable: React.FC<StaffEfficiencyTableProps> = ({
  ycxStaffData,
  excludedYcxStaffNames,
  catMarketFilter,
  captureRef,
  captureElement
}) => {
  const visibleStaff = ycxStaffData
    .filter(s => {
      const matchesMarket = catMarketFilter === 'ALL' || (s.marketName && s.marketName.toUpperCase().includes(catMarketFilter.toUpperCase()));
      const isExcluded = excludedYcxStaffNames.includes(s.staffName);
      return matchesMarket && !isExcluded;
    })
    .sort((a, b) => b.convertedRevenue - a.convertedRevenue);

  return (
    <div className="p-0 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-10 bg-black rounded-full" />
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm sm:text-lg md:text-2xl font-black text-black uppercase tracking-tight">HIỆU QUẢ KHAI THÁC REALTIME NHÂN VIÊN</h3>
            </div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Hiệu suất quy đổi & Trả chậm</p>
          </div>
        </div>
        <button 
          onClick={() => captureElement(captureRef, 'HieuQua_Realtime_NV')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all duration-300 no-capture"
        >
          <Camera size={12} />
          CHỤP ẢNH
        </button>
      </div>
      <div ref={captureRef} className="p-4 bg-white">
        <div className="overflow-x-auto border border-slate-300 bg-white scrollbar-thin scrollbar-thumb-slate-300">
          <table className="w-full text-left border-collapse border border-slate-300 min-w-[1200px]">
            <thead>
              <tr className="border-b border-slate-300 bg-white">
                <th colSpan={6} className="px-1 py-3 sm:px-2 sm:py-4 text-[24px] font-black text-black uppercase tracking-tight border-r border-slate-300 text-center whitespace-nowrap">
                  HIỆU QUẢ KHAI THÁC
                </th>
                <th colSpan={19} className="px-1 py-3 sm:px-2 sm:py-4 text-[24px] font-black text-[#e11d48] uppercase tracking-tight text-center whitespace-nowrap">
                  {catMarketFilter !== 'ALL' ? (catMarketFilter.split(' - ')[1] || catMarketFilter) : 'CHI TIẾT'}
                </th>
              </tr>
              <tr className="border-b border-slate-300 bg-white">
                <th colSpan={6} className="px-1 py-2 sm:px-2 sm:py-2 text-[13px] font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <Camera size={14} className="text-blue-600" />
                    <span className="uppercase tracking-widest">REALTIME : {formatRealtimeDate()}</span>
                  </div>
                </th>
                <th colSpan={26} className="px-1 py-2 sm:px-2 sm:py-2 text-[13px] font-bold text-slate-900 whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={14} className="text-orange-600" />
                    <span className="uppercase tracking-widest">THỜI GIAN SỬ DỤNG: {getWorkingDayProgress().toFixed(1)}%</span>
                  </div>
                </th>
              </tr>
              <tr className="border-b border-slate-300">
                <th rowSpan={2} className="px-2 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#10b981] min-w-[40px] whitespace-nowrap">HẠNG</th>
                <th rowSpan={2} className="px-3 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#10b981] whitespace-nowrap w-px">NHÂN VIÊN</th>
                <th rowSpan={2} className="px-1 py-3 text-[14px] font-black text-black uppercase tracking-wider text-center border-r border-slate-300 bg-[#facc15] w-[65px] whitespace-nowrap">DT THỰC</th>
                <th rowSpan={2} className="px-1 py-3 text-[14px] font-black text-black uppercase tracking-wider text-center border-r border-slate-300 bg-[#facc15] w-[65px] whitespace-nowrap">DT QUY ĐỔI</th>
                <th rowSpan={2} className="px-1 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#f97316] w-[65px] whitespace-nowrap">%QUY ĐỔI</th>
                <th rowSpan={2} className="px-1 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center border-r border-slate-300 bg-[#f97316] w-[65px] whitespace-nowrap">%TRẢ CHẬM</th>
                <th colSpan={6} className="px-1 py-3 text-[14px] font-black text-black uppercase tracking-wider text-center bg-[#fde047] border-b border-slate-300 border-r border-slate-300 whitespace-nowrap">GIA DỤNG</th>
                <th colSpan={6} className="px-1 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center bg-[#84cc16] border-b border-slate-300 border-r border-slate-300 whitespace-nowrap">BẢO HIỂM</th>
                <th colSpan={7} className="px-1 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center bg-[#3b82f6] border-b border-slate-300 border-r border-slate-300 whitespace-nowrap">ICT</th>
                <th colSpan={7} className="px-1 py-3 text-[14px] font-black text-white uppercase tracking-wider text-center bg-[#f97316] border-b border-slate-300 whitespace-nowrap">CE</th>
              </tr>
              <tr className="border-b border-slate-300 bg-white">
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fef08a] w-[65px] whitespace-nowrap">DT THỰC</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fef08a] w-[65px] whitespace-nowrap">MÁY LỌC NƯỚC</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fef08a] w-[65px] whitespace-nowrap">NỒI CƠM</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fef08a] w-[65px] whitespace-nowrap">NỒI CHIÊN</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fef08a] w-[65px] whitespace-nowrap">QUẠT GIÓ</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fef08a] w-[65px] whitespace-nowrap">BẾP CÁC LOẠI</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#d9f99d] w-[65px] whitespace-nowrap">DOANH THU</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#d9f99d] w-[65px] whitespace-nowrap">SỐ LƯỢNG</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#d9f99d] w-[65px] whitespace-nowrap">1 ĐỔI 1</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#d9f99d] w-[65px] whitespace-nowrap">MỞ RỘNG</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#d9f99d] w-[65px] whitespace-nowrap">RƠI VỠ</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#d9f99d] w-[65px] whitespace-nowrap">KHÁC</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">SMARTPHONE</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">SẠC DỰ PHÒNG</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">TAI NGHE</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">CAMERA</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">SIM SỐ</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">VIEON</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#bfdbfe] w-[65px] whitespace-nowrap">MIẾNG DÁN</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fed7aa] w-[65px] whitespace-nowrap">DOANH THU CE</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fed7aa] w-[65px] whitespace-nowrap">SL TIVI</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fed7aa] w-[65px] whitespace-nowrap">SL TỦ LẠNH</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fed7aa] w-[65px] whitespace-nowrap">SL MÁY GIẶT</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fed7aa] w-[65px] whitespace-nowrap">SL MÁY LẠNH</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center border-r border-slate-300 bg-[#fed7aa] w-[65px] whitespace-nowrap">SL MÁY NƯỚC NÓNG</th>
                <th className="px-1 py-2 text-[12px] font-black text-black uppercase text-center bg-[#fed7aa] w-[65px] whitespace-nowrap">SL MS / MRC</th>
              </tr>
            </thead>
            <tbody>
              {visibleStaff.length > 0 ? visibleStaff.map((staff, idx) => {
                const qdRate = staff.totalRevenue > 0 ? (staff.convertedRevenue / staff.totalRevenue) * 100 : 0;
                return (
                  <tr key={`${staff.staffName}-${idx}`} className="border-b border-slate-300 bg-white hover:bg-slate-50 transition-colors" style={{ height: '45px' }}>
                    <td className="px-1 py-2 text-[13px] font-black text-black text-center border-r border-slate-300 bg-[#fef08a] whitespace-nowrap">{idx + 1}</td>
                    <td className="px-3 py-2 text-[13px] font-black border-r border-slate-300 text-[#2563eb] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[#2563eb]">›</span>
                        <span className="uppercase whitespace-nowrap">{formatStaffName(staff.staffName)}</span>
                      </div>
                    </td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 whitespace-nowrap",
                      staff.totalRevenue === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{Math.round(staff.totalRevenue).toLocaleString('vi-VN')}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 whitespace-nowrap",
                      staff.convertedRevenue === 0 ? "text-rose-600 font-normal" : "font-black text-[#059669]"
                    )}>{Math.round(staff.convertedRevenue).toLocaleString('vi-VN')}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] font-black text-center border-r border-slate-300 whitespace-nowrap",
                      qdRate === 0 ? "text-rose-600 font-normal" : (qdRate >= 100 ? "text-[#059669]" : "text-orange-600")
                    )}>{qdRate.toFixed(0)}%</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 whitespace-nowrap",
                      staff.installmentRevenue === 0 ? "text-rose-600 font-normal" : "font-black text-indigo-600"
                    )}>{staff.totalRevenue > 0 ? ((staff.installmentRevenue / staff.totalRevenue) * 100).toFixed(0) : 0}%</td>
                    
                    {/* Gia Dung */}
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#fef9c3] whitespace-nowrap",
                      staff.giaDung.total === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{Math.round(staff.giaDung.total).toLocaleString('vi-VN')}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#fef9c3] whitespace-nowrap",
                      staff.giaDung.mayLocNuoc === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.giaDung.mayLocNuoc}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#fef9c3] whitespace-nowrap",
                      staff.giaDung.noiCom === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.giaDung.noiCom}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#fef9c3] whitespace-nowrap",
                      staff.giaDung.noiChien === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.giaDung.noiChien}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#fef9c3] whitespace-nowrap",
                      staff.giaDung.quatGio === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.giaDung.quatGio}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#fef9c3] whitespace-nowrap",
                      staff.giaDung.bep === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.giaDung.bep}</td>
                    
                    {/* Bao Hiem */}
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#ecfdf5] whitespace-nowrap",
                      staff.baoHiem.total === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{Math.round(staff.baoHiem.total).toLocaleString('vi-VN')}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#ecfdf5] whitespace-nowrap",
                      staff.baoHiem.count === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.baoHiem.count}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#ecfdf5] whitespace-nowrap",
                      staff.baoHiem.motDoiMot === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.baoHiem.motDoiMot}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#ecfdf5] whitespace-nowrap",
                      staff.baoHiem.moRong === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.baoHiem.moRong}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#ecfdf5] whitespace-nowrap",
                      staff.baoHiem.roiVo === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.baoHiem.roiVo}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#ecfdf5] whitespace-nowrap",
                      staff.baoHiem.khac === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.baoHiem.khac}</td>
                    
                    {/* ICT */}
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.smartphone === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.smartphone}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.sdp === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.sdp}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.taiNghe === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.taiNghe}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.camera === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.camera}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.sim === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.sim}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.vieon === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.vieon}</td>
                    <td className={cn(
                      "px-1 py-2 text-[13px] text-center border-r border-slate-300 bg-[#eff6ff] whitespace-nowrap",
                      staff.ict.miengDan === 0 ? "text-rose-600 font-normal" : "font-black text-slate-700"
                    )}>{staff.ict.miengDan}</td>

                    {/* CE */}
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center border-r border-slate-300 bg-[#f8cbad]",
                      staff.ce.total === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{Math.round(staff.ce.total).toLocaleString('vi-VN')}</td>
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center border-r border-slate-300 bg-[#f8cbad]",
                      staff.ce.tivi === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{staff.ce.tivi}</td>
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center border-r border-slate-300 bg-[#f8cbad]",
                      staff.ce.tuLanh === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{staff.ce.tuLanh}</td>
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center border-r border-slate-300 bg-[#f8cbad]",
                      staff.ce.mayGiat === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{staff.ce.mayGiat}</td>
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center border-r border-slate-300 bg-[#f8cbad]",
                      staff.ce.mayLanh === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{staff.ce.mayLanh}</td>
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center border-r border-slate-300 bg-[#f8cbad]",
                      staff.ce.mayNuocNong === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{staff.ce.mayNuocNong}</td>
                    <td className={cn(
                      "px-1 py-1 text-[10.67px] text-center bg-[#f8cbad]",
                      staff.ce.msMrc === 0 ? "text-red-600 font-normal" : "font-black text-slate-600"
                    )}>{staff.ce.msMrc}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={31} className="px-4 py-12 text-center text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] bg-white">
                    Chưa có dữ liệu hiệu quả nhân viên
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffEfficiencyTable;
