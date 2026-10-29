import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Crown } from 'lucide-react';
import { StaffData } from '../../RTST/types';
import { cn, formatCurrencyValue, extractStaffRevFromReport, getStoredStaffThucInput } from '../../RTST/utils';

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
  dtThucNv?: string;
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
  tragopNv = '',
  dtThucNv = ''
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

  const [thucVersion, setThucVersion] = useState(0);
  useEffect(() => {
    const handleUpdate = () => setThucVersion(v => v + 1);
    window.addEventListener('staff_thuc_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('staff_thuc_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Parse Doanh Thu Thực (Cột DOANH THU THỰC)
  const thucMap = useMemo(() => {
    const storeHint = data.find(s => s.storeName && s.storeName !== 'N/A')?.storeName;
    const raw = (dtThucNv && dtThucNv.trim()) ? dtThucNv : getStoredStaffThucInput(storeHint);
    return raw ? extractStaffRevFromReport(raw) : new Map();
  }, [dtThucNv, thucVersion, data]);

  // Helper tìm doanh thu thực của nhân viên từ thucMap hoặc staff.actualVal (ưu tiên tuyệt đối Mã NV)
  const getStaffActualRevenue = (staff: StaffData): number => {
    let a = staff.actualVal ?? 0;
    if (thucMap.size > 0) {
      const cleanId = (staff.fullId || '').replace(/\D/g, '');
      const pureStaffName = (staff.employeeName || (staff.displayName.split(/[-–—]/).slice(1).join(' ') || staff.displayName))
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let m = (cleanId ? thucMap.get(cleanId) : null) || thucMap.get(staff.fullId);
      if (!m) {
        for (const item of thucMap.values()) {
          const itemCleanId = (item.id || '').replace(/\D/g, '');
          if (cleanId && itemCleanId) {
            if (cleanId === itemCleanId) {
              m = item;
              break;
            }
            continue;
          }
          const itemNorm = (item.name || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (pureStaffName && itemNorm && pureStaffName === itemNorm) {
            m = item;
            break;
          }
        }
      }
      if (m && m.revenue !== null && m.revenue !== undefined && !isNaN(m.revenue)) {
        a = m.revenue;
      }
    }
    return a;
  };

  const totalVirtual = sortedData.reduce((sum, staff) => sum + staff.virtualVal, 0);
  const actualTotalVirtual = Math.abs(totalVirtual) > 1000000 ? totalVirtual : totalVirtual * 1000000;

  const totalActual = sortedData.reduce((sum, staff) => {
    const a = getStaffActualRevenue(staff);
    const aNorm = Math.abs(a) > 1000000 ? a : a * 1000000;
    return sum + aNorm;
  }, 0);

  // Sum of DT. THỰC matching the scale of totalVirtual
  const totalActualDisplay = sortedData.reduce((sum, staff) => {
    const rawA = getStaffActualRevenue(staff);
    const vRaw = staff.virtualVal || 0;
    let a = rawA;
    if (Math.abs(vRaw) <= 1000000 && Math.abs(rawA) > 1000000) {
      a = Math.round(rawA / 1000000);
    } else if (Math.abs(vRaw) > 1000000 && Math.abs(rawA) <= 1000000) {
      a = rawA * 1000000;
    }
    return sum + a;
  }, 0);

  const totalEffQd = totalActual > 0 ? ((actualTotalVirtual - totalActual) / totalActual) * 100 : 0;
  // Lấy đúng giá trị từ cấu hình màn hình BC THÁNG -> THẺ TARGET QUY ĐỔI và chia cho số nhân viên
  const targetQdPerStaff = sortedData.length > 0 ? stTargetQuyDoi / sortedData.length : 0;
  const totalTargetQd = stTargetQuyDoi;
  const actualTotalTargetQd = totalTargetQd > 1000000 ? totalTargetQd : totalTargetQd * 1000000;
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
      <div className="w-full max-w-[900px] bg-[#F4F8FC] border border-[#DCE7F2] p-[10px] sm:p-[16px] rounded-[18px] sm:rounded-[22px] shadow-[0_6px_24px_-4px_rgba(16,35,63,0.05)] flex flex-col gap-[12px] sm:gap-[14px] overflow-hidden">
        {/* Enterprise Header Card (Date selector button hidden as required) */}
        <div className="relative overflow-hidden bg-white border border-[#DCE7F2] rounded-[16px] sm:rounded-[18px] px-[14px] py-[12px] sm:px-[20px] sm:py-[16px] shadow-[0_2px_10px_rgba(16,35,63,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-[10px] shrink-0">
          {/* Decorative soft wave & chart watermark on the right matching reference image */}
          <svg
            className="pointer-events-none select-none absolute bottom-0 right-0 w-[56%] h-full opacity-60"
            viewBox="0 0 520 96"
            preserveAspectRatio="none"
          >
            <path
              d="M0,96 C115,94 185,32 300,52 C385,66 445,14 520,24 L520,96 Z"
              fill="#E3F8EF"
            />
            <path
              d="M110,96 C210,96 270,48 370,62 C435,72 480,30 520,38 L520,96 Z"
              fill="#D0F2E4"
              opacity="0.7"
            />
          </svg>
          <div className="pointer-events-none select-none hidden sm:flex items-end gap-[5px] absolute right-[22px] bottom-[16px] opacity-80">
            <span className="w-[5px] h-[10px] rounded-full bg-[#34D399]" />
            <span className="w-[5px] h-[18px] rounded-full bg-[#10B981]" />
            <span className="w-[5px] h-[25px] rounded-full bg-[#059669]" />
            <span className="w-[5px] h-[33px] rounded-full bg-[#047857]" />
          </div>

          <div className="relative z-10 flex items-start sm:items-center gap-[12px] sm:gap-[14px] min-w-0">
            <div className="w-[44px] h-[44px] sm:w-[50px] sm:h-[50px] rounded-[13px] sm:rounded-[15px] bg-gradient-to-b from-[#009B83] via-[#007F5F] to-[#055A44] flex items-center justify-center text-white shadow-[0_6px_14px_rgba(0,127,95,0.26)] shrink-0">
              <BarChart3 size={24} className="stroke-[2.5] shrink-0" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h2
                className="text-[16px] sm:text-[21px] font-black text-[#10233F] uppercase tracking-tight leading-snug break-words"
                style={{ fontFamily: "'UTM Avo', sans-serif", fontWeight: 900 }}
              >
                BẢNG XẾP HẠNG DOANH THU
              </h2>
              <div
                className="flex flex-wrap items-center gap-x-[8px] gap-y-[3px] mt-[3px] text-[11.5px] sm:text-[13px] font-bold text-[#64748B] leading-snug"
                style={{ fontFamily: "'UTM Avo', sans-serif" }}
              >
                <span className="inline-flex items-center gap-[5px]">
                  <span className="text-[#F59E0B]">⚡</span>
                  <span>Lũy kế dự kiến đến ngày: <strong className="font-black text-[#10233F]">{yesterdayDate}</strong></span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div 
          className="overflow-x-auto w-full grow rounded-[14px] sm:rounded-[16px] border border-[#DCE7F2] bg-white shadow-[0_2px_12px_rgba(16,35,63,0.03)] custom-scrollbar"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <table 
            className="w-full border-separate border-spacing-0 table-fixed bg-white text-[12px] sm:text-[13.5px]" 
            style={{ 
              fontFamily: "'UTM Avo', 'Inter', sans-serif", 
              fontWeight: 900, 
              minWidth: '868px',
              width: '100%'
            }}
          >
            <colgroup>
              <col style={{ width: '52px', minWidth: '52px' }} />
              <col style={{ width: '236px', minWidth: '220px' }} />
              <col style={{ width: '82px', minWidth: '82px' }} />
              <col style={{ width: '88px', minWidth: '88px' }} />
              <col style={{ width: '84px', minWidth: '84px' }} />
              <col style={{ width: '84px', minWidth: '84px' }} />
              <col style={{ width: '82px', minWidth: '82px' }} />
              <col style={{ width: '82px', minWidth: '82px' }} />
              <col style={{ width: '78px', minWidth: '78px' }} />
            </colgroup>
            <thead>
              <tr className="text-white font-black text-[11.5px] sm:text-[12.5px] uppercase tracking-wide h-[42px] sm:h-[46px]">
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#007F5F] whitespace-nowrap">
                  STT
                </th>
                <th style={{ fontWeight: 900 }} className="px-[10px] sm:px-[14px] py-0 text-left text-white border-r border-white/10 border-b border-[#065F46] bg-[#007F5F] whitespace-nowrap">
                  NHÂN VIÊN
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#037559] whitespace-nowrap">
                  TARGET
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#046C52] whitespace-nowrap">
                  DT. THỰC
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#05634C] whitespace-nowrap">
                  DTQĐ
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#065A46] whitespace-nowrap">
                  %HT
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#075140] whitespace-nowrap">
                  HQ.QĐ
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-r border-white/10 border-b border-[#065F46] bg-[#08473A] whitespace-nowrap">
                  % T.CHẬM
                </th>
                <th style={{ fontWeight: 900 }} className="px-[6px] py-0 text-center text-white border-b border-[#065F46] bg-[#0A3E36] whitespace-nowrap">
                  XH
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length > 0 ? (
                sortedData.map((staff, index) => {
                  // Resolve Doanh thu Thực (actualVal) from Cột 3 từ trái sang ô "D.THU THỰC NHÂN VIÊN"
                  const rawActual = getStaffActualRevenue(staff);
                  const vRaw = staff.virtualVal || 0;
                  let displayActual = rawActual;
                  if (Math.abs(vRaw) <= 1000000 && Math.abs(rawActual) > 1000000) {
                    displayActual = Math.round(rawActual / 1000000);
                  } else if (Math.abs(vRaw) > 1000000 && Math.abs(rawActual) <= 1000000) {
                    displayActual = rawActual * 1000000;
                  }

                  // HQ.QĐ = (DOANH THU QĐ - DOANH THU THỰC) / DOANH THU THỰC × 100
                  const vNorm = Math.abs(staff.virtualVal || 0) > 1000000 ? (staff.virtualVal || 0) : (staff.virtualVal || 0) * 1000000;
                  const aNorm = Math.abs(rawActual || 0) > 1000000 ? (rawActual || 0) : (rawActual || 0) * 1000000;
                  const effQd = aNorm > 0 ? ((vNorm - aNorm) / aNorm) * 100 : (staff.effVal || 0);

                  const actualTargetQdPerStaff = targetQdPerStaff > 1000000 ? targetQdPerStaff : targetQdPerStaff * 1000000;
                  const actualVirtualVal = vNorm;
                  
                  const percentHT = (actualTargetQdPerStaff > 0 && daysPassed > 0) 
                    ? (((actualVirtualVal / daysPassed) * totalDays) / actualTargetQdPerStaff) * 100 
                    : 0;
                  
                  const topCount = Math.max(1, Math.round(sortedData.length * 0.2));
                  const isTop = index < topCount;
                  const isBottom = index >= sortedData.length - topCount;
                  const isEven = index % 2 === 0;

                  const hasTraCham = staff.fullId in traChamMap;
                  const traChamPercent = hasTraCham ? (traChamMap[staff.fullId] ?? 0) : null;
                  const isLowEff = effQd < (totalEffQd !== 0 ? totalEffQd : stPercentHTTargetDuKienQD);

                  return (
                    <tr 
                      key={staff.fullId}
                      onClick={() => onSelectStaff && onSelectStaff(staff.fullId)}
                      className={cn(
                        "transition-colors h-[42px] sm:h-[45px] cursor-pointer",
                        isBottom
                          ? "bg-[#FFF5F7] hover:bg-[#FFEBEF]"
                          : isEven
                          ? "bg-white hover:bg-[#F2FBF7]"
                          : "bg-[#F8FBFF] hover:bg-[#F2FBF7]",
                        selectedStaffId === staff.fullId && "!bg-emerald-100/60"
                      )}
                    >
                      {/* 1. STT */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] whitespace-nowrap">
                        {index === 0 ? (
                          <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-gradient-to-b from-[#FDE047] via-[#F59E0B] to-[#D97706] text-white font-black text-[12px] shadow-[0_2px_5px_rgba(245,158,11,0.35)] border border-[#FEF08A]">
                            1
                          </span>
                        ) : index === 1 ? (
                          <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-gradient-to-b from-[#CBD5E1] via-[#94A3B8] to-[#64748B] text-white font-black text-[12px] shadow-[0_2px_5px_rgba(100,116,139,0.28)] border border-[#E2E8F0]">
                            2
                          </span>
                        ) : index === 2 ? (
                          <span className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-full bg-gradient-to-b from-[#FB923C] via-[#EA580C] to-[#9A3412] text-white font-black text-[12px] shadow-[0_2px_5px_rgba(234,88,12,0.3)] border border-[#FED7AA]">
                            3
                          </span>
                        ) : (
                          <span className={cn(
                            "inline-flex items-center justify-center w-[26px] h-[26px] rounded-full font-black text-[12px]",
                            isBottom ? "bg-[#FFE3E8] text-[#F4144F]" : "bg-[#EDF2F7] text-[#10233F]"
                          )}>
                            {index + 1}
                          </span>
                        )}
                      </td>

                      {/* 2. NHÂN VIÊN */}
                      <td style={{ fontWeight: 900 }} className="px-[10px] sm:px-[14px] py-[4px] border-r border-b border-[#E8EFF7] text-left">
                        <div className="flex flex-wrap items-baseline gap-x-[4px] gap-y-[1px] min-w-0 leading-snug">
                          <span className={cn(
                            "font-black uppercase tracking-tight text-[12px] sm:text-[13.5px]",
                            isBottom ? "text-[#F4144F]" : "text-[#10233F]"
                          )} title={`${formatName(staff.displayName)} - ${staff.fullId}`}>
                            {formatName(staff.displayName)}
                          </span>
                          <span className="text-[#64748B] font-bold text-[11px] sm:text-[12.5px] whitespace-nowrap">
                            - {staff.fullId}
                          </span>
                        </div>
                      </td>

                      {/* 3. TARGET */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] font-black text-[12.5px] sm:text-[13.5px] text-[#10233F] whitespace-nowrap">
                        {targetQdPerStaff > 0 ? formatStaffTarget(targetQdPerStaff) : '0'}
                      </td>

                      {/* 4. DT. THỰC (Chỉ hiển thị số căn giữa màu xanh lá đậm, KHÔNG có thanh progress bar) */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] font-black text-[12.5px] sm:text-[13.5px] text-[#007F5F] whitespace-nowrap">
                        {displayActual !== null && displayActual !== undefined && displayActual !== 0 ? formatCurrencyValue(displayActual) : (rawActual === 0 ? '0' : '-')}
                      </td>

                      {/* 5. DTQĐ */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] font-black text-[12.5px] sm:text-[13.5px] text-[#F4144F] whitespace-nowrap">
                        {formatCurrencyValue(staff.virtualVal || 0)}
                      </td>

                      {/* 6. %HT */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center justify-center gap-[3px] min-w-[58px] px-[9px] py-[4px] rounded-[7px] font-black text-[11.5px] sm:text-[12.5px] leading-none",
                          percentHT >= 100 ? "bg-[#DDF8E9] text-[#007F5F]" : "bg-[#FFE3E8] text-[#F4144F]"
                        )}>
                          <span>{Math.round(percentHT)}%</span>
                          <span className="text-[10.5px] leading-none">{percentHT >= 100 ? '↑' : '↓'}</span>
                        </span>
                      </td>

                      {/* 7. HQ.QĐ */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center justify-center min-w-[56px] px-[9px] py-[4px] rounded-[7px] font-black text-[11.5px] sm:text-[12.5px] leading-none",
                          isLowEff
                            ? "bg-[#FFE3E8] text-[#F4144F]"
                            : "bg-[#DDF8E9] text-[#007F5F]"
                        )}>
                          {effQd.toFixed(1)}%
                        </span>
                      </td>

                      {/* 8. % T.CHẬM */}
                      <td style={{ fontWeight: 900 }} className={cn(
                        "px-[6px] py-[4px] text-center border-r border-b border-[#E8EFF7] font-black text-[12px] sm:text-[13px] whitespace-nowrap",
                        traChamPercent !== null
                          ? (traChamPercent >= 50 ? "text-[#007F5F]" : "text-[#F4144F]")
                          : "text-[#64748B]"
                      )}>
                        {traChamPercent !== null ? `${traChamPercent.toFixed(1)}%` : '-'}
                      </td>

                      {/* 9. XH */}
                      <td style={{ fontWeight: 900 }} className="px-[6px] py-[4px] text-center border-b border-[#E8EFF7] whitespace-nowrap">
                        {isTop ? (
                          <span className="inline-flex items-center justify-center gap-[4px] px-[9px] py-[4px] rounded-[8px] bg-[#DDF8E9] text-[#007F5F] font-black text-[11px] sm:text-[12px] leading-none">
                            <Crown size={12} className="text-[#F59E0B] fill-[#F59E0B] shrink-0" />
                            <span>Top</span>
                          </span>
                        ) : isBottom ? (
                          <span className="inline-flex items-center justify-center gap-[4px] px-[9px] py-[4px] rounded-[8px] bg-[#FFE3E8] text-[#F4144F] font-black text-[11px] sm:text-[12px] leading-none">
                            <span>↓</span>
                            <span>Bot</span>
                          </span>
                        ) : (
                          <span className="text-[#64748B] font-bold text-[12px]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-[16px] py-[40px] text-center h-[100px]">
                    <p className="text-[12.5px] font-bold text-slate-400 uppercase tracking-widest">
                      Chưa có dữ liệu xếp hạng doanh thu
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            {sortedData.length > 0 && (
              <tfoot>
                <tr className="h-[46px] sm:h-[50px] bg-[#E3F7ED]">
                  <td colSpan={2} style={{ fontWeight: 900 }} className="px-[10px] sm:px-[14px] py-[6px] text-left border-t border-r border-[#C3ECDA] bg-[#E3F7ED] whitespace-nowrap">
                    <div className="flex items-center gap-[10px]">
                      <span className="w-[28px] h-[28px] rounded-[8px] bg-white border border-[#C3ECDA] text-[#007F5F] inline-flex items-center justify-center shrink-0 shadow-2xs">
                        <BarChart3 size={15} className="stroke-[2.5]" />
                      </span>
                      <span className="font-black text-[13.5px] sm:text-[15px] text-[#10233F] uppercase tracking-wide">
                        TỔNG
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-r border-[#C3ECDA] text-[#10233F] font-black text-[13.5px] sm:text-[15px] whitespace-nowrap bg-[#E3F7ED]">
                    {totalTargetQd > 0 ? formatCurrencyValue(totalTargetQd) : '0'}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-r border-[#C3ECDA] text-[#10233F] font-black text-[13.5px] sm:text-[15px] whitespace-nowrap bg-[#E3F7ED]">
                    {totalActualDisplay > 0 ? formatCurrencyValue(totalActualDisplay) : '-'}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-r border-[#C3ECDA] text-[#10233F] font-black text-[13.5px] sm:text-[15px] whitespace-nowrap bg-[#E3F7ED]">
                    {formatCurrencyValue(totalVirtual)}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-r border-[#C3ECDA] whitespace-nowrap bg-[#E3F7ED]">
                    <span className={cn(
                      "inline-flex items-center justify-center min-w-[58px] px-[10px] py-[4px] rounded-[8px] font-black text-[12px] sm:text-[13px] leading-none",
                      totalPercentHT >= 100 ? "bg-[#ADEAD0] text-[#00684A]" : "bg-[#FFE3E8] text-[#F4144F]"
                    )}>
                      {Math.round(totalPercentHT)}%
                    </span>
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-r border-[#C3ECDA] whitespace-nowrap bg-[#E3F7ED]">
                    {(totalEffQd !== 0 || stPercentHTTargetDuKienQD > 0) ? (
                      <span className="inline-flex items-center justify-center min-w-[56px] px-[10px] py-[4px] rounded-[8px] bg-[#FFE3E8] text-[#F4144F] font-black text-[12px] sm:text-[13px] leading-none">
                        {totalEffQd !== 0 ? `${totalEffQd.toFixed(1)}%` : `${stPercentHTTargetDuKienQD.toFixed(1)}%`}
                      </span>
                    ) : (
                      <span className="text-[#64748B] font-bold">-</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-r border-[#C3ECDA] text-[#10233F] font-black text-[12.5px] sm:text-[13.5px] whitespace-nowrap bg-[#E3F7ED]">
                    {validTraChamVals.length > 0 ? `${avgTraCham.toFixed(1)}%` : '-'}
                  </td>
                  <td style={{ fontWeight: 900 }} className="px-[6px] py-[6px] text-center border-t border-[#C3ECDA] text-[#10233F] font-black text-[12.5px] whitespace-nowrap bg-[#E3F7ED]">
                    -
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RevenueRankingTableQd);
