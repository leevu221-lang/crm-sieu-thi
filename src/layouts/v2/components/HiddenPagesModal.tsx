import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye, X, Search, ShieldAlert, Sparkles, Check, CheckCircle2, Filter } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export interface HiddenTargetItem {
  key: string;
  name: string;
  group: string;
  subtitle?: string;
  isSubTab?: boolean;
  parentPage?: string;
}

export const ALL_HIDDEN_TARGETS: HiddenTargetItem[] = [
  // Trang chính - MENU QUẢN LÝ
  { key: 'realtime', name: 'Realtime (Doanh thu ngày)', group: 'Menu Quản lý', subtitle: 'Toàn bộ trang Realtime' },
  { key: 'luyke', name: 'Luỹ Kế (Tổng hợp tháng)', group: 'Menu Quản lý', subtitle: 'Toàn bộ trang Luỹ Kế' },
  { key: 'khaibao', name: 'Khai Báo (Dán dữ liệu)', group: 'Menu Quản lý', subtitle: 'Cấu hình siêu thị & dán dữ liệu' },
  { key: 'health', name: 'Sức Khỏe Nhân Viên', group: 'Menu Quản lý', subtitle: 'Toàn bộ trang Sức khỏe nhân viên' },
  { key: 'tnbleader', name: 'Thi Đua TNB Leader', group: 'Menu Quản lý', subtitle: 'Bảng xếp hạng thi đua' },

  // Trang chính - DỮ LIỆU & TIỆN ÍCH
  { key: 'toolhotro', name: 'Tool Hỗ Trợ', group: 'Dữ liệu & Tiện ích', subtitle: 'In sticker, địa chỉ, bảo hành' },
  { key: 'bbkq', name: 'Kiểm Quỹ (BBKQ)', group: 'Dữ liệu & Tiện ích', subtitle: 'Biên bản kiểm quỹ tiền mặt' },
  { key: 'tienich', name: 'Tiện Ích', group: 'Dữ liệu & Tiện ích', subtitle: 'Phân ca, biên bản, tương tác LINE' },
  { key: 'birthday', name: 'Sinh Nhật Nhân Viên', group: 'Dữ liệu & Tiện ích', subtitle: 'Danh sách sinh nhật' },
  { key: 'excelviewer', name: 'Excel Viewer', group: 'Dữ liệu & Tiện ích', subtitle: 'Xem & tải file Excel' },
  { key: 'bangiasoc', name: 'Bảng Giá Sốc', group: 'Dữ liệu & Tiện ích', subtitle: 'Giá sốc siêu thị' },
  { key: 'lichpg', name: 'Lịch Làm Việc PG', group: 'Dữ liệu & Tiện ích', subtitle: 'Lịch trình PG hàng ngày' },
  { key: 'feedback', name: 'Góp Ý & Hướng Dẫn', group: 'Dữ liệu & Tiện ích', subtitle: 'Phản hồi hệ thống' },

  // Tabs con - SỨC KHỎE NHÂN VIÊN
  { key: 'health_DOANH_THU', name: 'SKNV: Doanh Thu NV', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_TONG_HOP_NV', name: 'SKNV: Tổng Hợp NV', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_CHI_TIET', name: 'SKNV: Chi Tiết NV', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_THI_DUA', name: 'SKNV: TH Thi Đua', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_NGANH_HANG', name: 'SKNV: CT Ngành Hàng', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_PHUC_VU', name: 'SKNV: Phục Vụ', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_BAN_KEM_NV', name: 'SKNV: Bán Kèm NV', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_THUONG_NV', name: 'SKNV: Thưởng NV', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_TRA_CHAM_NV', name: 'SKNV: Trả Chậm NV', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_RANK_3T_NV', name: 'SKNV: Xếp Hạng NV 3T', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },
  { key: 'health_GIA_TRI_DH', name: 'SKNV: Giá Trị ĐH', group: 'Tabs Sức Khỏe NV', isSubTab: true, parentPage: 'health' },

  // Tabs con - REALTIME
  { key: 'realtime_summary', name: 'Realtime: Tổng Quan', group: 'Tabs Realtime', isSubTab: true, parentPage: 'realtime' },
  { key: 'realtime_muc_tieu_ngay', name: 'Realtime: Mục Tiêu Ngày', group: 'Tabs Realtime', isSubTab: true, parentPage: 'realtime' },
  { key: 'realtime_real_dthu_nv', name: 'Realtime: Real D.Thu NV', group: 'Tabs Realtime', isSubTab: true, parentPage: 'realtime' },
  { key: 'realtime_khai_thac', name: 'Realtime: Data YCX', group: 'Tabs Realtime', isSubTab: true, parentPage: 'realtime' },
  { key: 'realtime_khai_thac_moi', name: 'Realtime: Data YCX Mới', group: 'Tabs Realtime', isSubTab: true, parentPage: 'realtime' },

  // Tabs con - LŨY KẾ
  { key: 'luyke_summary', name: 'Lũy Kế: Tổng Quan', group: 'Tabs Lũy Kế', isSubTab: true, parentPage: 'luyke' },
  { key: 'luyke_cum', name: 'Lũy Kế: Cụm', group: 'Tabs Lũy Kế', isSubTab: true, parentPage: 'luyke' },
  { key: 'luyke_efficiency', name: 'Lũy Kế: Thưởng QL/TC', group: 'Tabs Lũy Kế', isSubTab: true, parentPage: 'luyke' },
  { key: 'luyke_thuong_st', name: 'Lũy Kế: Thưởng ST', group: 'Tabs Lũy Kế', isSubTab: true, parentPage: 'luyke' },
  { key: 'luyke_bcdtnh', name: 'Lũy Kế: BC DT Ngành Hàng', group: 'Tabs Lũy Kế', isSubTab: true, parentPage: 'luyke' },
  { key: 'luyke_ssg_boss', name: 'Lũy Kế: SSG Boss', group: 'Tabs Lũy Kế', isSubTab: true, parentPage: 'luyke' },

  // Tabs con - TIỆN ÍCH
  { key: 'tienich_phan-ca-thang', name: 'Tiện Ích: Phân Ca Tháng', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
  { key: 'tienich_phan-ca-tuan', name: 'Tiện Ích: Phân Ca Tuần', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
  { key: 'tienich_quay-so', name: 'Tiện Ích: Quay Số', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
  { key: 'tienich_tuong-tac-line', name: 'Tiện Ích: Tương Tác LINE', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
  { key: 'tienich_bien-ban', name: 'Tiện Ích: Biên Bản', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
  { key: 'tienich_kiem-ke', name: 'Tiện Ích: Kiểm Kê', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
  { key: 'tienich_roadshow', name: 'Tiện Ích: Roadshow', group: 'Tabs Tiện Ích', isSubTab: true, parentPage: 'tienich' },
];

interface HiddenPagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageHiddenState: Record<string, boolean>;
  onToggleHide: (key: string, nextVal: boolean) => Promise<void>;
  effectivePageKey: string;
}

export const HiddenPagesModal: React.FC<HiddenPagesModalProps> = ({
  isOpen,
  onClose,
  pageHiddenState,
  onToggleHide,
  effectivePageKey,
}) => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [isUpdatingKey, setIsUpdatingKey] = useState<string | null>(null);

  const groups = useMemo(() => {
    const set = new Set<string>();
    ALL_HIDDEN_TARGETS.forEach(t => set.add(t.group));
    return ['ALL', ...Array.from(set)];
  }, []);

  const currentTarget = useMemo(() => {
    return ALL_HIDDEN_TARGETS.find(t => t.key === effectivePageKey) || {
      key: effectivePageKey,
      name: effectivePageKey,
      group: 'Hiện tại'
    };
  }, [effectivePageKey]);

  const isCurrentHidden = !!pageHiddenState[effectivePageKey];

  const filteredTargets = useMemo(() => {
    return ALL_HIDDEN_TARGETS.filter(item => {
      if (selectedGroup !== 'ALL' && item.group !== selectedGroup) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.key.toLowerCase().includes(q) || (item.subtitle && item.subtitle.toLowerCase().includes(q));
    });
  }, [search, selectedGroup]);

  const totalHiddenCount = useMemo(() => {
    return Object.values(pageHiddenState).filter(Boolean).length;
  }, [pageHiddenState]);

  const handleToggle = async (key: string) => {
    const nextVal = !pageHiddenState[key];
    setIsUpdatingKey(key);
    try {
      await onToggleHide(key, nextVal);
    } finally {
      setIsUpdatingKey(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shrink-0 shadow-sm">
              <EyeOff size={22} className="text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] sm:text-[16px] font-black tracking-wide uppercase">ẨN KHỎI NGƯỜI DÙNG</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-400/20 text-purple-200 border border-purple-300/30">
                  User 43751
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-purple-200/80 font-medium">
                Quản lý các trang & tab bị ẩn hoàn toàn khỏi người dùng thông thường
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Quick Active Page Banner */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
            isCurrentHidden 
              ? 'bg-purple-50/80 border-purple-200 text-purple-900' 
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    Trang / Mục hiện tại
                  </span>
                  {isCurrentHidden && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                      Đang ẩn
                    </span>
                  )}
                </div>
                <h4 className="text-[14px] sm:text-[15px] font-black text-slate-900 mt-1">
                  {currentTarget.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  key: {effectivePageKey}
                </p>
              </div>

              <button
                onClick={() => handleToggle(effectivePageKey)}
                disabled={isUpdatingKey === effectivePageKey}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all ${
                  isCurrentHidden
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-200'
                }`}
              >
                {isCurrentHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                <span>{isCurrentHidden ? 'HIỆN VỚI NGƯỜI DÙNG' : 'ẨN KHỎI NGƯỜI DÙNG'}</span>
              </button>
            </div>
          </div>

          {/* Search & Group Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm trang hoặc tab cần ẩn..."
                className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {groups.map(grp => (
                <button
                  key={grp}
                  onClick={() => setSelectedGroup(grp)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedGroup === grp
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {grp === 'ALL' ? 'Tất cả' : grp}
                </button>
              ))}
            </div>
          </div>

          {/* Status summary banner */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 font-medium">
            <span>Hiển thị {filteredTargets.length} mục</span>
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              Đang ẩn: {totalHiddenCount} mục
            </span>
          </div>

          {/* List of Targets */}
          <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white max-h-[340px] overflow-y-auto">
            {filteredTargets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Không tìm thấy trang hoặc tab nào phù hợp với tìm kiếm.
              </div>
            ) : (
              filteredTargets.map(item => {
                const isHidden = !!pageHiddenState[item.key];
                const isCurrent = item.key === effectivePageKey;
                return (
                  <div
                    key={item.key}
                    className={`flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                      isHidden ? 'bg-purple-50/40 hover:bg-purple-50/70' : 'hover:bg-slate-50/70'
                    } ${isCurrent ? 'ring-1 ring-inset ring-purple-300' : ''}`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[12px] sm:text-[13px] font-bold truncate ${
                          isHidden ? 'text-purple-900 font-black' : 'text-slate-800'
                        }`}>
                          {item.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded shrink-0">
                            Đang mở
                          </span>
                        )}
                        {isHidden && (
                          <span className="text-[9px] font-black uppercase bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded shrink-0">
                            Ẩn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.key}
                        </span>
                        {item.subtitle && (
                          <span className="text-[10.5px] text-slate-500 truncate">
                            • {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(item.key)}
                      disabled={isUpdatingKey === item.key}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isHidden ? 'bg-purple-600' : 'bg-slate-200'
                      }`}
                      title={isHidden ? 'Bấm để Hiện lại với người dùng' : 'Bấm để Ẩn khỏi người dùng'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isHidden ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <ShieldAlert size={14} className="text-purple-600 shrink-0" />
            <span>Chỉ áp dụng với tài khoản khách/thường. Tài khoản 43751 luôn truy cập được.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
};
