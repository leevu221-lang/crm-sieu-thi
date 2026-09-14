import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CreditCard, LogOut, Loader2, CheckCircle2, Sparkles, Check, Info, RefreshCw, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface SubscriptionLockScreenProps {
  userProfile: UserProfile;
  onLogout?: () => void;
  onRefresh: () => Promise<void>;
  onClose?: () => void;
}

export default function SubscriptionLockScreen({ userProfile, onLogout, onRefresh, onClose }: SubscriptionLockScreenProps) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const handleSyncStatus = async () => {
    setIsSyncing(true);
    await onRefresh();
    setTimeout(() => {
      setIsSyncing(false);
    }, 1000);
  };

  useEffect(() => {
    // Detect if user transitioned to active status
    const isPending = isSuccess || userProfile.status === 'pending';
    if (isPending && userProfile.status === 'active' && userProfile.paymentConfirmed === true) {
      setIsApproved(true);
      const timer = setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [userProfile.status, userProfile.paymentConfirmed, isSuccess, onClose]);

  const isNewUserPendingApproval = (userProfile.status === 'pending' || userProfile.status === 'rejected') && !userProfile.requestedRenewPackage;

  if (isNewUserPendingApproval) {
    const isRejected = userProfile.status === 'rejected';

    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-pink-100 selection:text-pink-900" style={{ background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 35%, #eff6ff 65%, #ecfdf5 100%)' }}>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-100/40 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-100/40 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] p-8 text-center relative z-10"
        >
          {isRejected ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200/60 text-rose-400 flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/60 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isRejected ? 'text-rose-400' : 'text-amber-400'}`}>
            {isRejected ? 'Đăng ký bị từ chối' : 'Đăng ký tài khoản mới'}
          </span>
          <h2 className="text-xl font-black text-slate-700 tracking-tight uppercase mb-4">
            {isRejected ? 'Từ chối duyệt tài khoản' : 'Chờ phê duyệt tài khoản'}
          </h2>

          <div className="bg-violet-50/50 border border-violet-100/60 p-5 rounded-2xl text-left space-y-3 mb-6 text-slate-600 font-medium text-xs leading-relaxed">
            <div className="flex justify-between border-b border-violet-100/50 pb-2">
              <span className="text-slate-400 font-bold">Tài khoản (Username):</span>
              <span className="font-extrabold text-slate-700">{userProfile.username}</span>
            </div>
            <div className="flex justify-between border-b border-violet-100/50 pb-2">
              <span className="text-slate-400 font-bold">Mã kho (Store Code):</span>
              <span className="font-extrabold text-slate-700">{userProfile.ma_kho}</span>
            </div>
            <div className="flex flex-col gap-1 pb-1">
              <span className="text-slate-400 font-bold">Siêu thị khai báo:</span>
              <span className={`font-extrabold px-3 py-1.5 rounded-xl text-[13px] text-center ${isRejected ? 'text-rose-500 border-rose-200/60 bg-rose-50/50 border' : 'text-violet-600 bg-violet-50/60 border border-violet-100/60'}`}>{userProfile.ten_sieu_thi || `Siêu thị ${userProfile.ma_kho}`}</span>
            </div>
          </div>

          <p className="text-slate-400 font-medium text-xs leading-relaxed mb-8 max-w-sm mx-auto">
            {isRejected ? (
              <>
                Tài khoản của anh/chị đã bị Admin <strong className="text-rose-500">43751</strong> từ chối phê duyệt kích hoạt. Vui lòng liên hệ trực tiếp Admin để giải quyết.
              </>
            ) : (
              <>
                Thông tin đăng ký đã được lưu trên hệ thống. Vui lòng liên hệ Admin <strong className="text-violet-500">43751</strong> duyệt kích hoạt tài khoản dùng thử 7 ngày để truy cập vào ứng dụng.
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="flex-1 py-3.5 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              ĐỒNG BỘ TRẠNG THÁI
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-400 font-black rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0 cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  const packages = [
    { days: 7, label: 'Dùng thử 7 ngày', sublabel: 'Áp dụng tài khoản mới', price: '0đ', color: 'from-emerald-100 to-teal-50', textColor: 'text-emerald-800', borderColor: 'border-emerald-300 hover:border-emerald-400', selectedBg: 'from-emerald-500 to-teal-500' },
    { days: 30, label: '30 ngày', sublabel: '1 tháng', price: '49.000đ', color: 'from-violet-100 to-purple-50', textColor: 'text-violet-800', borderColor: 'border-violet-300 hover:border-violet-400', selectedBg: 'from-violet-500 to-purple-500' },
    { days: 60, label: '60 ngày', sublabel: '2 tháng', price: '98.000đ', color: 'from-blue-100 to-sky-50', textColor: 'text-blue-800', borderColor: 'border-blue-300 hover:border-blue-400', selectedBg: 'from-blue-500 to-sky-500' },
    { days: 90, label: '90 ngày', sublabel: '3 tháng', price: '147.000đ', color: 'from-pink-100 to-rose-50', textColor: 'text-pink-800', borderColor: 'border-pink-300 hover:border-pink-400', selectedBg: 'from-pink-500 to-rose-500' },
    { days: 180, label: '6 tháng', sublabel: 'Tiết kiệm', price: '294.000đ', color: 'from-amber-100 to-orange-50', textColor: 'text-amber-800', borderColor: 'border-amber-400 hover:border-amber-500', selectedBg: 'from-amber-500 to-orange-500' },
    { days: 270, label: '9 tháng', sublabel: 'Phổ biến', price: '441.000đ', color: 'from-cyan-100 to-sky-50', textColor: 'text-cyan-800', borderColor: 'border-cyan-300 hover:border-cyan-400', selectedBg: 'from-cyan-500 to-sky-500' },
    { days: 360, label: '12 tháng', sublabel: 'Tốt nhất', price: '588.000đ', color: 'from-fuchsia-100 to-pink-50', textColor: 'text-fuchsia-800', borderColor: 'border-fuchsia-300 hover:border-fuchsia-400', selectedBg: 'from-fuchsia-500 to-pink-500' },
  ];

  const handleRenewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) {
      setError('Vui lòng chọn gói cước trước khi xác nhận.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await supabase
        .from('ql_nguoi_dung')
        .update({
          status: 'pending',
          paymentConfirmed: false,
          requestedRenewPackage: selectedPackage,
          requestedAt: new Date().toISOString(),
          phone: phone.trim()
        })
        .eq('username', userProfile.username);

      if (dbError) throw dbError;

      // Save subscription history to Firebase
      await supabase.from('lich_su_dang_ky').insert({
        username: userProfile.username,
        storeCode: userProfile.ma_kho,
        action: 'REQUEST',
        packageDays: selectedPackage,
        status: 'pending',
        phone: phone.trim(),
        created_at: new Date().toISOString()
      });

      setIsSuccess(true);
      setTimeout(() => {
        onRefresh();
      }, 2000);
    } catch (err: any) {
      console.error('Lỗi yêu cầu gia hạn:', err);
      setError(err.message || 'Không thể gửi yêu cầu gia hạn. Vui lòng liên hệ trực tiếp Admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusText = () => {
    if (userProfile.status === 'pending') return 'Chờ phê duyệt';
    if (userProfile.status === 'expired') return 'Đã hết hạn';
    if (userProfile.status === 'inactive') return 'Chưa kích hoạt';
    return 'Chưa thanh toán gia hạn';
  };

  const selectedPkg = packages.find(p => p.days === selectedPackage);

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif", background: 'linear-gradient(135deg, #fdf2f8 0%, #faf5ff 35%, #eff6ff 65%, #ecfdf5 100%)' }}>
      {/* Background decoration — pastel blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-pink-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-100/50 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full bg-sky-100/30 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[980px] bg-white/70 backdrop-blur-2xl rounded-[24px] border border-white/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] overflow-hidden relative z-10 mx-3 my-3"
      >
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/80 hover:bg-white border border-slate-200/50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all z-20 cursor-pointer shadow-sm backdrop-blur-sm"
            title="Đóng"
          >
            <X size={16} />
          </button>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-12">

          {/* ═══ LEFT: Choose package ═══ */}
          <div className="md:col-span-5 p-7 md:p-10 border-b md:border-b-0 md:border-r border-slate-100/60">
            <AnimatePresence mode="wait">
              {isApproved ? (
                <motion.div key="approved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-400 border border-emerald-200/60 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-emerald-500 uppercase tracking-tight">THANH TOÁN THÀNH CÔNG!</h3>
                  <p className="text-slate-400 font-bold text-xs leading-relaxed max-w-xs mx-auto">
                    Cước dịch vụ đã được kích hoạt. Website đang tự động mở khóa truy cập...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-emerald-500 font-black text-xs uppercase tracking-widest pt-4 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang chuyển hướng...
                  </div>
                </motion.div>
              ) : (isSuccess || userProfile.status === 'pending') ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-12">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-400 border border-emerald-200/60 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight">Gửi yêu cầu thành công</h3>
                  <p className="text-slate-400 font-bold text-xs leading-relaxed max-w-xs mx-auto">
                    Yêu cầu gia hạn đang được chuyển đến Admin duyệt. Hệ thống sẽ tự động đăng nhập khi cước được kích hoạt.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncStatus}
                    disabled={isSyncing}
                    className="mt-6 w-full py-3 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%)' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'ĐANG TẢI LẠI...' : 'TẢI LẠI / KIỂM TRA DUYỆT'}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)' }}>
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest block">Bước 1</span>
                        <h3 className="text-base font-black text-slate-700 tracking-tight uppercase leading-tight">Chọn gói sử dụng</h3>
                      </div>
                    </div>
                  </div>

                  {/* Status info */}
                  {onClose ? (
                    <div className="bg-violet-50/70 border-2 border-violet-200/90 p-4 rounded-2xl">
                      <p className="text-[11px] font-bold text-violet-600 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        Tài khoản đang hoạt động — đăng ký gia hạn sớm để tích lũy cộng dồn ngày sử dụng.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-rose-50/70 border-2 border-rose-200/90 p-4 rounded-2xl space-y-1">
                      <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {getStatusText()} — MNV <strong className="text-rose-500">{userProfile.username}</strong> • Kho <strong className="text-slate-600">{userProfile.ma_kho}</strong>
                      </p>
                      {userProfile.expiredAt && (
                        <p className="text-[10px] text-rose-400 font-bold pl-5">
                          Hết hạn: {new Date(userProfile.expiredAt).toLocaleDateString('vi-VN')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Package grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage === pkg.days;
                      return (
                        <motion.button
                          key={pkg.days}
                          type="button"
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setSelectedPackage(pkg.days)}
                          className={`p-3 rounded-2xl border-2 text-left font-bold transition-all relative overflow-hidden flex flex-col justify-center gap-0.5 cursor-pointer ${
                            isSelected 
                              ? `bg-gradient-to-br ${pkg.selectedBg} border-white/50 text-white shadow-lg` 
                              : `bg-gradient-to-br ${pkg.color} ${pkg.borderColor} ${pkg.textColor} hover:shadow-md`
                          }`}
                          style={isSelected ? { boxShadow: '0 8px 25px -5px rgba(0,0,0,0.12)' } : {}}
                        >
                          <span className={`text-[12px] font-black uppercase leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {pkg.label}
                          </span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>
                            {pkg.sublabel}
                          </span>
                          <span className={`text-[11px] font-black mt-0.5 ${isSelected ? 'text-white/90' : 'text-slate-700'}`}>
                            {pkg.price}
                          </span>
                          {isSelected && (
                            <div className="absolute right-2 top-2 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Confirm package button */}
                  {selectedPackage && !showPayment && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      type="button"
                      onClick={() => { setShowPayment(true); setError(null); }}
                      className="w-full py-3 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%)', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.3)' }}
                    >
                      <CreditCard className="w-4 h-4" />
                      XÁC NHẬN GÓI — TIẾP TỤC THANH TOÁN
                    </motion.button>
                  )}

                  {/* Bottom actions for locked users */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSyncStatus}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-white/90 hover:bg-white border-2 border-slate-200 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      Đồng bộ
                    </button>
                    {onLogout && (
                      <button
                        onClick={onLogout}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50/80 hover:bg-rose-100 border border-rose-200 text-rose-500 font-black rounded-xl text-[10px] uppercase tracking-wider transition-colors shrink-0 ml-auto cursor-pointer"
                      >
                        <LogOut className="w-3 h-3" />
                        Đăng xuất
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ RIGHT: Payment details (only shows after selecting a package) ═══ */}
          <div className="md:col-span-7 p-7 md:p-10 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {!showPayment && !(isSuccess || userProfile.status === 'pending') && !isApproved ? (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center py-16 space-y-4"
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fde68a 0%, #fdba74 50%, #f9a8d4 100%)' }}>
                    <CreditCard className="w-9 h-9 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-black text-slate-500 uppercase tracking-tight">{selectedPackage ? 'Bấm "Xác nhận gói" bên trái' : 'Chọn gói cước bên trái'}</h3>
                    <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[260px] mx-auto">
                      {selectedPackage ? 'Bấm nút xác nhận gói cước để hiển thị thông tin thanh toán và mã QR.' : 'Vui lòng chọn gói cước sử dụng phù hợp rồi bấm xác nhận.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-violet-400 text-[10px] font-black uppercase tracking-widest pt-2">
                    <Sparkles className="w-3 h-3" />
                    <span>← {selectedPackage ? 'Bấm xác nhận ở cột bên trái' : 'Chọn gói ở cột bên trái'}</span>
                  </div>
                </motion.div>
              ) : showPayment && selectedPackage && !(isSuccess || userProfile.status === 'pending') && !isApproved ? (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-5"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)' }}>
                      <CreditCard className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">Bước 2</span>
                      <h3 className="text-base font-black text-slate-700 tracking-tight uppercase leading-tight">Thanh toán & Xác nhận</h3>
                    </div>
                  </div>

                  {/* Selected package badge + back button */}
                  {selectedPkg && (
                    <div className={`flex items-center justify-between bg-gradient-to-r ${selectedPkg.color} border-2 ${selectedPkg.borderColor} p-4 rounded-2xl`}>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowPayment(false)}
                          className="w-7 h-7 rounded-lg bg-white/60 hover:bg-white/90 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all cursor-pointer shrink-0"
                          title="Quay lại chọn gói"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Gói đã chọn</span>
                          <span className={`text-sm font-black ${selectedPkg.textColor} uppercase`}>{selectedPkg.label}</span>
                        </div>
                      </div>
                      <span className={`text-lg font-black ${selectedPkg.textColor}`}>{selectedPkg.price}</span>
                    </div>
                  )}

                  {/* Bank info */}
                  <div className="bg-white/90 border-2 border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin chuyển khoản</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2.5 font-bold text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wide">Ngân hàng</span>
                          <span className="text-slate-700 font-black">Timo Bank</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wide">Số tài khoản</span>
                          <span className="text-violet-500 text-sm font-black tracking-wide">0943099221</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wide">Chủ tài khoản</span>
                          <span className="text-slate-700 font-black">VO VU LINH</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wide">Nội dung CK</span>
                          <span className="bg-violet-50/80 text-violet-500 px-2 py-1 rounded-lg font-black inline-block text-[11px] uppercase tracking-tight mt-0.5 border border-violet-100/60">
                            CRM {userProfile.username}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100/60 pt-4 sm:pt-0 sm:pl-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2, duration: 0.4 }}
                          className="w-[130px] h-[130px] bg-white border border-slate-200/50 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-lg"
                          style={{ boxShadow: '0 8px 30px -5px rgba(139,92,246,0.15)' }}
                        >
                          <img 
                            src={`https://api.vietqr.io/image/timo-0943099221-tI7y82w.jpg?accountName=VO%20VU%20LINH&amount=0&addInfo=CRM%20${userProfile.username}`}
                            alt="VietQR Timo Bank 0943099221"
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                        <span className="text-[8px] font-black text-slate-400 mt-2 uppercase tracking-widest text-center">Quét mã QR thanh toán</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <form onSubmit={handleRenewRequest} className="space-y-4">

                    {error && (
                      <div className="bg-rose-50/60 border border-rose-200/60 text-rose-400 px-4 py-3 rounded-xl text-xs font-bold leading-relaxed">
                        {error}
                      </div>
                    )}

                    {userProfile.status === 'pending' && (
                      <div className="bg-amber-50/60 border border-amber-200/60 text-amber-500 px-4 py-3.5 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-2.5">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          Anh/Chị đã gửi yêu cầu gia hạn gói <strong>{packages.find(p => p.days === userProfile.requestedRenewPackage)?.label || `${userProfile.requestedRenewPackage} ngày`}</strong>. Vui lòng chuyển khoản và đợi Admin duyệt.
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting || userProfile.status === 'pending'}
                      className="w-full py-3.5 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%)', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.3)' }}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang gửi yêu cầu...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          XÁC NHẬN ĐÃ THANH TOÁN
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
