import React, { useMemo } from 'react';
import { Trophy, TrendingDown, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { StaffData } from '../../RTST/types';
import { cn, formatCurrencyValue } from '../../RTST/utils';
import AutoFitTable from '../../../components/AutoFitTable';

interface RevenueRankingTableQdQProps {
  data: StaffData[];
  onCapture: () => void;
  stTargetQuyDoi?: number;
  daysPassed?: number;
  totalDays?: number;
  selectedStaffId?: string | null;
  onSelectStaff?: (id: string) => void;
  stPercentHTTargetDuKienQD?: number;
  tragopNv?: string;
}

const RevenueRankingTableQd: React.FC<RevenueRankingTableQdQProps> = ({ 
  data, 
  onCapture, 
  stTargetQuyDoi = 0,
  daysPassed = 1,
  totalDays = 30,
  selectedStaffId = null,
  onSelectStaff,
  stPercentHTTargetDuKienQD = 0,
  tragopNv = ''
}) => {
  // Pre-compute %HT for sorting
  const computePercentHT = (staff: StaffData) => {
    const tgtPerStaff = data.length > 0 ? stTargetQuyDoi / data.length : 0;
    const actualTgt = tgtPerStaff > 1000000 ? tgtPerStaff : tgtPerStaff * 1000000;
    const actualVVal = Math.abs(staff.virtualVal || 0) > 1000000 ? (staff.virtualVal || 0) : (staff.virtualVal || 0) * 1000000;
    return (actualTgt > 0 && daysPassed > 0) ? (((actualVVal / daysPassed) * totalDays) / actualTgt) * 100 : 0;
  };
  // Sort by %HT descending
  const sortedData = [...data].sort((a, b) => computePercentHT(b) - computePercentHT(a));

  const formatName = (name: string) => {
    if (!name) return '';
    const parts = name.split(' - ');
    if (parts.length > 1) {
      return parts[1].replace(/[-_]+$/, '').trim();
    }
    return name.replace(/[-_]+$/, '').trim();
  };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');

  const totalActual = sortedData.reduce((sum, staff) => sum + (staff.actualVal || 0), 0);
  const totalVirtual = sortedData.reduce((sum, staff) => sum + staff.virtualVal, 0);
  const totalEffQd = totalActual > 0 ? ((totalVirtual - totalActual) / totalActual) * 100 * 100 : 0;
  // Lấy đúng giá trị từ cấu hình màn hình BC THÁNG -> THẺ TARGET QUY ĐỔI và chia cho số nhân viên
  const targetQdPerStaff = sortedData.length > 0 ? stTargetQuyDoi / sortedData.length : 0;
  const totalTargetQd = stTargetQuyDoi;
  const actualTotalTargetQd = totalTargetQd > 1000000 ? totalTargetQd : totalTargetQd * 1000000;
  const actualTotalVirtual = Math.abs(totalVirtual) > 1000000 ? totalVirtual : totalVirtual * 1000000;
  const totalPercentHT = (actualTotalTargetQd > 0 && daysPassed > 0) ? (((actualTotalVirtual / daysPassed) * totalDays) / actualTotalTargetQd) * 100 : 0;

  // Parse Trả Góp / Trả Chậm NV data
  const traChamMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!tragopNv || !tragopNv.trim()) return map;

    const cleanNumber = (val: string): number => {
      if (!val) return 0;
      let s = val.trim();
      const hasComma = s.includes(',');
      const hasDot = s.includes('.');
      if (hasComma && hasDot) {
        if (s.indexOf(',') < s.indexOf('.')) {
          s = s.replace(/,/g, '');
        } else {
          s = s.replace(/\./g, '').replace(/,/g, '.');
        }
      } else if (hasComma) {
        s = s.replace(/,/g, '.');
      }
      const clean = s.replace(/[^\d.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const norm = (str: string): string => {
      return (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]/g, '');
    };

    const allKnownStaff = data.map(s => ({ fullId: s.fullId, displayName: s.displayName }));

    const matchStaff = (rawStaffStr: string, percent: number) => {
      if (!rawStaffStr) return;
      const rowNorm = norm(rawStaffStr);
      const rowIdMatch = rawStaffStr.match(/\b\d{4,8}\b/);
      const rowId = rowIdMatch ? rowIdMatch[0] : '';

      for (const staff of allKnownStaff) {
        const staffId = staff.fullId.toLowerCase().trim();
        // 1. Direct ID match
        if (rowId && staffId && rowId === staffId) {
          map[staff.fullId] = percent;
          return;
        }
        // 2. Staff ID contained in raw string
        if (staffId && rowNorm.includes(staffId)) {
          map[staff.fullId] = percent;
          return;
        }
        // 3. Name comparison (case-insensitive & accent-insensitive)
        const staffName = (staff.displayName.split(/[-–—]/).pop() || '').trim();
        const staffNorm = norm(staffName);
        if (rowNorm === staffNorm) {
          map[staff.fullId] = percent;
          return;
        }
        if (staffNorm.length >= 4 && rowNorm.length >= 4) {
          if (rowNorm.includes(staffNorm) || staffNorm.includes(rowNorm)) {
            map[staff.fullId] = percent;
            return;
          }
        }
      }
    };

    const lines = tragopNv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const ignoredKeywords = [
      'nhanvien', 'homecredit', 'fecredit', 'shinhan', 'dmsieuthi', 'tytrong',
      'logobi', 'trangchu', 'baocao', 'khoikinhdoanh', 'hdsudung', 'avatar',
      'vungtay', 'dashboard', 'hotrobi', 'chientranh', 'lichsu', 'quanly',
      'danhsach', 'saovang', 'chupanh', 'xuatpdf', 'xuatexcel', 'hotline',
      'tiendo', 'rank', 'tongcong', 'tong', 'phankhuc', 'nganhhang', 'thang', 'nam',
      'tgdd', 'tileduyet', 'realtime', 'tatcavung', 'xuattheomau', 'capnhatluc',
      'toggletheme', 'timbaocao', 'employee', 'guest', 'admin', 'xem', 'khuvuc', 'sieuthi', 'vung',
      'smartpos', 'payoo', 'kredivo', 'tpbank', 'paylater'
    ];

    const isHeaderString = (str: string) => {
      const clean = norm(str);
      if (!clean) return true;
      if (clean === 'dt' || clean === 'dttragop' || clean === 'dtsieuthi' || clean === 'tytrongtracham') return true;
      if (ignoredKeywords.some(k => clean === k || clean.includes(k))) return true;
      return false;
    };

    // Check if there are alternating 2-line Web BI entries (Name on line i, numbers on line i+1)
    let parsedAnyTwoLine = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.includes('\t')
        ? line.split('\t').map(p => p.trim())
        : line.split(/\t| {2,}/).map(p => p.trim());

      if (parts.length === 1 && /[a-zA-ZÀ-ỹ]/.test(line) && !isHeaderString(line) && i + 1 < lines.length) {
        const nextParts = lines[i + 1].includes('\t')
          ? lines[i + 1].split('\t').map(p => p.trim())
          : lines[i + 1].split(/\t| {2,}/).map(p => p.trim());

        if (nextParts.length >= 2 && /^[-]?\d/.test(nextParts[0])) {
          let percent = nextParts.length > 2 ? cleanNumber(nextParts[2]) : 0;
          if (percent === 0) {
            const installRev = cleanNumber(nextParts[0]);
            const totalRev = cleanNumber(nextParts[1]);
            if (totalRev > 0) percent = (installRev / totalRev) * 100;
          }
          matchStaff(line, percent);
          parsedAnyTwoLine = true;
          i++;
          continue;
        }
      }
    }

    if (parsedAnyTwoLine) {
      return map;
    }

    const hasTabs = lines.some(l => l.includes('\t'));
    const isDetailed = tragopNv.toLowerCase().includes('homecredit') ||
                       tragopNv.toLowerCase().includes('fecredit') ||
                       tragopNv.toLowerCase().includes('shinhan');

    if (hasTabs || lines.some(l => l.split(/ {2,}/).length >= 2)) {
      lines.forEach(line => {
        let parts = line.includes('\t')
          ? line.split('\t').map(p => p.trim())
          : line.split(/\t| {2,}/).map(p => p.trim());
        if (parts.length < 2) return;
        const firstColClean = norm(parts[0]);
        if (!firstColClean || ignoredKeywords.some(k => firstColClean === k || (k.length > 4 && firstColClean.includes(k)))) return;

        while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
        if (parts.length < 2) return;

        if (isDetailed) {
          if (parts.length >= 3) {
            let percent = cleanNumber(parts[parts.length - 1]);
            const lastPart = parts[parts.length - 1];
            if (percent > 0 && percent <= 1 && lastPart && !lastPart.includes('%')) {
              percent = percent * 100;
            }
            matchStaff(parts[0], percent);
          }
        } else {
          if (parts.length >= 3) {
            let percent = parts.length > 4 ? cleanNumber(parts[4]) : 0;
            if (percent > 0 && percent <= 1 && parts[4] && !parts[4].includes('%')) {
              percent = percent * 100;
            }
            let totalRevRaw = cleanNumber(parts[1]);
            let installRevRaw = cleanNumber(parts[2]);
            if (Math.abs(totalRevRaw) > 0 && Math.abs(totalRevRaw) < 1000000) totalRevRaw *= 1000000;
            if (Math.abs(installRevRaw) > 0 && Math.abs(installRevRaw) < 1000000) installRevRaw *= 1000000;
            if (percent === 0 && totalRevRaw > 0) {
              percent = (installRevRaw / totalRevRaw) * 100;
            }
            matchStaff(parts[0], percent);
          }
        }
      });
    }

    return map;
  }, [tragopNv, data]);

  // Compute average Tra Cham for valid records
  const validTraChamVals = useMemo(() => {
    return sortedData
      .map(s => s.fullId in traChamMap ? traChamMap[s.fullId] : null)
      .filter((v): v is number => v !== null);
  }, [sortedData, traChamMap]);

  const avgTraCham = useMemo(() => {
    return validTraChamVals.length > 0
      ? validTraChamVals.reduce((sum, v) => sum + v, 0) / validTraChamVals.length
      : 0;
  }, [validTraChamVals]);

  const formatStaffTarget = (val: number) => {
    if (!val || val === 0) return '0';
    if (val >= 1000) {
      return Math.round(val).toLocaleString('vi-VN');
    }
    const val1Dec = Math.floor(val * 10) / 10;
    return (val1Dec % 1 === 0) ? val1Dec.toString() : val1Dec.toFixed(1);
  };

  return (
    <div className="w-full flex justify-center" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      <div className="w-full max-w-[900px] bg-white border border-slate-200/90 p-2 sm:p-2.5 rounded-2xl shadow-sm flex flex-col">
        {/* Top Header Banner: Emerald Gradient with Gold/Yellow Title matching Bảng 2 */}
        <div className="bg-gradient-to-r from-[#047857] via-[#059669] to-[#10B981] p-4 rounded-2xl text-white relative shrink-0 mb-2.5 text-center flex flex-col items-center justify-center">
          <h2 className="text-[19px] sm:text-[23px] md:text-[27px] font-black text-[#FEF08A] uppercase tracking-wide leading-tight whitespace-nowrap" style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}>
            BẢNG XẾP HẠNG DOANH THU
          </h2>
          <div className="flex items-center justify-center flex-nowrap whitespace-nowrap gap-2 mt-1.5 text-xs sm:text-sm font-bold text-white/95" style={{ fontFamily: "'UTM Avo', sans-serif" }}>
            <span className="flex items-center gap-1 whitespace-nowrap">
              ⚡ Luỹ kế dự kiến đến ngày: {yesterdayDate}
            </span>
            <span className="opacity-70">||</span>
            <span className="text-white font-extrabold whitespace-nowrap">
              TGSD: {daysPassed}/{totalDays}
            </span>
          </div>
        </div>

        {/* Table Container */}
        <AutoFitTable minWidth={860}>
          <table className="w-full border-separate border-spacing-0 table-fixed bg-white text-[12px] sm:text-[14.5px]" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", fontWeight: 900, minWidth: '860px' }}>
            <colgroup>
              <col style={{ width: '45px' }} />
              <col style={{ width: '270px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '95px' }} />
              <col style={{ width: '105px' }} />
              <col style={{ width: '105px' }} />
              <col style={{ width: '55px' }} />
            </colgroup>
            <thead>
              <tr className="text-white font-black text-[12px] sm:text-[13.5px] uppercase tracking-tight h-[44px]">
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">STT</th>
                <th style={{ fontWeight: 900 }} className="px-2.5 sm:px-3.5 py-0 text-left text-white border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden">NHÂN VIÊN</th>
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">TARGET</th>
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">L.KẾ</th>
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden">%HT</th>
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">HQ.QĐ</th>
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-r border-b border-emerald-600 bg-[#059669] whitespace-nowrap overflow-hidden">% T.CHẬM</th>
                <th style={{ fontWeight: 900 }} className="px-1 py-0 text-center text-white border-b border-emerald-600 bg-[#047857] whitespace-nowrap overflow-hidden">XH</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((staff, index) => {
                  // HQ.QĐ = (DOANH THU QĐ - DOANH THU) / DOANH THU × 100
                  const effQd = (staff.actualVal || 0) > 0 
                    ? ((staff.virtualVal - (staff.actualVal || 0)) / (staff.actualVal || 0)) * 100 
                    : 0;
                  const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
                  const actualVirtualVal = Math.abs(staff.virtualVal || 0) > 1000000 ? (staff.virtualVal || 0) : (staff.virtualVal || 0) * 1000000;
                  
                  const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0) 
                    ? (((actualVirtualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100 
                    : 0;
                  
                  const topCount = Math.max(1, Math.round(sortedData.length * 0.2));
                  const isTop = index < topCount;
                  const isBottom = index >= sortedData.length - topCount;
                  const isEven = index % 2 === 0;

                  const hasTraCham = staff.fullId in traChamMap;
                  const traChamPercent = hasTraCham ? (traChamMap[staff.fullId] ?? 0) : null;

                  return (
                    <tr 
                      key={staff.fullId}
                      onClick={() => onSelectStaff && onSelectStaff(staff.fullId)}
                      className={cn(
                        "transition-colors h-[40px] cursor-pointer border-b border-emerald-100/90",
                        isEven ? "bg-white" : "bg-emerald-50/20",
                        "hover:bg-emerald-50/70",
                        selectedStaffId === staff.fullId && "!bg-emerald-100/60"
                      )}
                    >
                      <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 font-black text-[12px] sm:text-[14.5px] text-slate-700 bg-emerald-50/40 whitespace-nowrap">
                        #{index + 1}
                      </td>
                      <td style={{ fontWeight: 900 }} className="px-2.5 sm:px-3.5 py-0.5 border-r border-b border-emerald-100/90 whitespace-nowrap text-left">
                        <span className={cn(
                          "font-black uppercase tracking-tight text-[12.5px] sm:text-[14.5px] whitespace-nowrap inline-block",
                          isBottom ? "text-rose-600" : "text-slate-900"
                        )}>
                          {formatName(staff.displayName)} - {staff.fullId}
                        </span>
                      </td>
                      <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 font-bold text-[12.5px] sm:text-[14.5px] text-slate-800 whitespace-nowrap">
                        {targetQdPerStaff > 0 ? formatStaffTarget(targetQdPerStaff) : '0'}
                      </td>
                      <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-b border-emerald-100/90 font-black text-[12.5px] sm:text-[14.5px] text-rose-600 whitespace-nowrap">
                        {formatCurrencyValue(staff.virtualVal || 0)}
                      </td>
                      <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center border-r border-b border-emerald-100/90 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center justify-center px-1.5 py-0.5 rounded-md font-black text-[11px] sm:text-[13px] leading-none",
                          percentHT >= 100 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-600"
                        )}>
                          {Math.round(percentHT)}%
                        </span>
                      </td>
                      <td style={{ fontWeight: 900 }} className={cn(
                        "px-1 py-0 text-center border-r border-b border-emerald-100/90 font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap",
                        effQd < stPercentHTTargetDuKienQD ? "text-rose-600 font-bold" : "text-emerald-700 font-black"
                      )}>
                        {effQd.toFixed(1)}%
                      </td>
                      <td style={{ fontWeight: 900 }} className={cn(
                        "px-1 py-0 text-center border-r border-b border-emerald-100/90 font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap",
                        traChamPercent !== null
                          ? (traChamPercent >= 50 ? "text-emerald-700 font-black" : "text-rose-600 font-bold")
                          : "text-slate-400"
                      )}>
                        {traChamPercent !== null ? `${traChamPercent.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-b border-emerald-100/90 whitespace-nowrap font-black text-[12px] sm:text-[14px]">
                        {isTop ? (
                          <span className="text-emerald-700 font-black">Top</span>
                        ) : isBottom ? (
                          <span className="text-rose-600 font-black">Bot</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center h-[100px]">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Chưa có dữ liệu xếp hạng doanh thu
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            {sortedData.length > 0 && (
              <tfoot>
                <tr className="h-[44px] text-white">
                  <td colSpan={2} style={{ fontWeight: 900 }} className="px-2 sm:px-3 py-0 text-center border-r border-emerald-600/50 font-black text-[13px] sm:text-[15px] text-white uppercase tracking-widest whitespace-nowrap bg-[#047857]">
                    TỔNG
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[13.5px] sm:text-[15px] whitespace-nowrap bg-[#047857]">
                    {totalTargetQd > 0 ? formatCurrencyValue(totalTargetQd) : '0'}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[13.5px] sm:text-[15px] whitespace-nowrap bg-[#047857]">
                    {formatCurrencyValue(totalVirtual)}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-0.5 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[13px] sm:text-[15px] whitespace-nowrap bg-[#047857]">
                    {Math.round(totalPercentHT)}%
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap bg-[#047857]">
                    {stPercentHTTargetDuKienQD > 0 ? `${stPercentHTTargetDuKienQD.toFixed(1)}%` : ''}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-1 py-0 text-center border-r border-emerald-600/50 text-white font-black text-[12.5px] sm:text-[14.5px] whitespace-nowrap bg-[#047857]">
                    {validTraChamVals.length > 0 ? `${avgTraCham.toFixed(1)}%` : ''}
                  </td>
                  <td className="px-1 py-0 text-center whitespace-nowrap bg-[#047857]"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </AutoFitTable>
      </div>
    </div>
  );
};

export default React.memo(RevenueRankingTableQd);
