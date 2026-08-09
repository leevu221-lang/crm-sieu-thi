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
  const [selectedPackage, setSelectedPackage] = useState<number>(30);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-50/50 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-50/50 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-8 text-center relative z-10"
        >
          {isRejected ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto mb-6 shadow-sm animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          <span className={`text-[10px] font-black uppercase tracking-widest block mb-2 ${isRejected ? 'text-rose-600' : 'text-amber-600'}`}>
            {isRejected ? 'Đăng ký bị từ chối' : 'Đăng ký tài khoản mới'}
          </span>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase mb-4">
            {isRejected ? 'Từ chối duyệt tài khoản' : 'Chờ phê duyệt tài khoản'}
          </h2>

          <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl text-left space-y-3 mb-6 text-slate-700 font-medium text-xs leading-relaxed">
            <div className="flex justify-between border-b border-slate-200/50 pb-2">
              <span className="text-slate-400 font-bold">Tài khoản (Username):</span>
              <span className="font-extrabold text-slate-800">{userProfile.username}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/50 pb-2">
              <span className="text-slate-400 font-bold">Mã kho (Store Code):</span>
              <span className="font-extrabold text-slate-800">{userProfile.ma_kho}</span>
            </div>
            <div className="flex flex-col gap-1 pb-1">
              <span className="text-slate-400 font-bold">Siêu thị khai báo:</span>
              <span className={`font-extrabold bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/50 text-[13px] text-center ${isRejected ? 'text-rose-600 border-rose-100 bg-rose-50/30' : 'text-indigo-600'}`}>{userProfile.ten_sieu_thi || `Siêu thị ${userProfile.ma_kho}`}</span>
            </div>
          </div>

          <p className="text-slate-500 font-medium text-xs leading-relaxed mb-8 max-w-sm mx-auto">
            {isRejected ? (
              <>
                Tài khoản của anh/chị đã bị Admin <strong className="text-rose-600">43751</strong> từ chối phê duyệt kích hoạt. Vui lòng liên hệ trực tiếp Admin để giải quyết.
              </>
            ) : (
              <>
                Thông tin đăng ký đã được lưu trên hệ thống. Vui lòng liên hệ Admin <strong className="text-indigo-600">43751</strong> duyệt kích hoạt tài khoản dùng thử 7 ngày để truy cập vào ứng dụng.
              </>
            )}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              ĐỒNG BỘ TRẠNG THÁI
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl text-xs uppercase tracking-widest transition-colors shrink-0 cursor-pointer"
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
    { days: 7, label: 'Dùng thử 7 ngày (áp dụng tài khoản mới)', price: '0đ' },
    { days: 30, label: '30 ngày', price: '49.000đ' },
    { days: 60, label: '60 ngày', price: '98.000đ' },
    { days: 90, label: '90 ngày', price: '147.000đ' },
    { days: 180, label: '6 tháng', price: '294.000đ' },
    { days: 270, label: '9 tháng', price: '441.000đ' },
    { days: 360, label: '12 tháng', price: '588.000đ' },
  ];

  const handleRenewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim() === '') {
      setError('Vui lòng cung cấp số điện thoại liên lạc của anh/chị.');
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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: "'UTM Avo', 'Inter', sans-serif" }}>
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-50/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-50/50 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[950px] bg-white rounded-[32px] border border-slate-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10"
      >
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors z-20 cursor-pointer border border-slate-200/50 shadow-sm"
            title="Đóng"
          >
            <X size={18} />
          </button>
        )}

        {/* Left column: Lock message and QR */}
        <div className="md:col-span-7 p-8 md:p-12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/30">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm animate-pulse ${onClose ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-rose-50 border-rose-100 text-rose-500'}`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest block ${onClose ? 'text-indigo-500' : 'text-rose-500'}`}>
                  {onClose ? 'GIA HẠN CƯỚC DỊCH VỤ' : 'TRUY CẬP BỊ GIỚI HẠN'}
                </span>
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
                  {onClose ? 'Đăng ký gói cước' : getStatusText()}
                </h2>
              </div>
            </div>

            {onClose ? (
              <div className="bg-indigo-50/60 border border-indigo-100 p-5 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  Đăng ký tích lũy ngày sử dụng
                </p>
                <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                  Tài khoản của anh/chị đang hoạt động bình thường. Anh/chị có thể lựa chọn đăng ký gia hạn sớm các gói cước để tích lũy cộng dồn ngày sử dụng.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50/60 border border-amber-100 p-5 rounded-2xl space-y-2">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  Tài khoản chưa được kích hoạt cước
                </p>
                <p className="text-xs text-amber-700 font-bold leading-relaxed">
                  Tài khoản mã nhân viên <span className="text-rose-600 font-black">{userProfile.username}</span> của siêu thị <span className="text-slate-800 font-black">{userProfile.ma_kho}</span> cần được gia hạn cước phí sử dụng để tiếp tục truy cập vào ứng dụng.
                </p>
                {userProfile.expiredAt && (
                  <p className="text-xs text-rose-600 font-black pt-1">
                    * Hạn dùng cũ đã kết thúc vào ngày: {new Date(userProfile.expiredAt).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>
            )}

            {/* Bank details */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Thông tin chuyển khoản gia hạn</h3>
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 font-bold text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wide">Ngân hàng</span>
                    <span className="text-slate-800 font-black">Timo Bank (Ngân hàng số Timo)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wide">Số tài khoản</span>
                    <span className="text-indigo-600 text-sm font-black tracking-wide">0943099221</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wide">Chủ tài khoản</span>
                    <span className="text-slate-800 font-black">VO VU LINH</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-black tracking-wide">Nội dung chuyển khoản</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-black inline-block text-[11px] uppercase tracking-tight mt-1 border border-indigo-100">
                      CRM {userProfile.username}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-4">
                  <div className="w-[120px] h-[120px] bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-center relative overflow-hidden shadow-inner">
                    <img 
                      src={`https://api.vietqr.io/image/timo-0943099221-tI7y82w.jpg?accountName=VO%20VU%20LINH&amount=0&addInfo=CRM%20${userProfile.username}`}
                      alt="VietQR Timo Bank 0943099221"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest text-center">Quét mã QR thanh toán nhanh</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={handleSyncStatus}
              disabled={isSyncing}
              className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              ĐỒNG BỘ TRẠNG THÁI
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl text-xs uppercase tracking-wider transition-colors shadow-sm shrink-0 ml-auto"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            )}
          </div>
        </div>

        {/* Right column: Package Select & Renew Form */}
        <div className="md:col-span-5 p-8 md:p-12 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {isApproved ? (
              <motion.div
                key="approved"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-250 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-emerald-600 uppercase tracking-tight">THANH TOÁN THÀNH CÔNG!</h3>
                <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-xs mx-auto">
                  Cước dịch vụ của bạn đã được kích hoạt thành công. Website đang tự động mở khóa truy cập...
                </p>
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest pt-4 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang chuyển hướng...
                </div>
              </motion.div>
            ) : (isSuccess || userProfile.status === 'pending') ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gửi yêu cầu thành công</h3>
                <p className="text-slate-500 font-bold text-xs leading-relaxed max-w-xs mx-auto">
                  Yêu cầu gia hạn của bạn đang được chuyển đến Admin duyệt. Hệ thống sẽ tự động đăng nhập khi cước được kích hoạt.
                </p>
                
                <button
                  type="button"
                  onClick={handleSyncStatus}
                  disabled={isSyncing}
                  className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'ĐANG TẢI LẠI...' : 'TẢI LẠI / KIỂM TRA DUYỆT'}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-spin-slow" /> GIA HẠN CƯỚC SỬ DỤNG
                  </span>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Chọn gói sử dụng</h3>
                </div>

                <form onSubmit={handleRenewRequest} className="space-y-5">
                  <div className="grid grid-cols-2 gap-2.5">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackage === pkg.days;
                      return (
                        <button
                          key={pkg.days}
                          type="button"
                          onClick={() => setSelectedPackage(pkg.days)}
                          className={`p-3.5 rounded-2xl border text-left font-bold transition-all relative overflow-hidden group flex flex-col justify-center gap-1 h-[82px] ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                              : 'bg-white hover:bg-slate-50 border-slate-200/70 text-slate-700'
                          }`}
                        >
                          <span className={`text-[13px] font-black uppercase ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {pkg.label}
                          </span>
                          {pkg.price && (
                            <span className={`text-[10px] block font-black uppercase tracking-wider ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {pkg.price}
                            </span>
                          )}
                          {isSelected && (
                            <div className="absolute right-2 bottom-2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Số điện thoại Zalo của anh/chị
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Nhập số điện thoại liên hệ"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800 placeholder-slate-400 transition-shadow outline-none shadow-sm"
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold leading-relaxed">
                      {error}
                    </div>
                  )}

                  {userProfile.status === 'pending' && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-700 px-4 py-3.5 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        Anh/Chị đã gửi yêu cầu gia hạn gói <strong>{packages.find(p => p.days === userProfile.requestedRenewPackage)?.label || `${userProfile.requestedRenewPackage} ngày`}</strong>. Vui lòng chuyển khoản thanh toán và đợi Admin kiểm tra duyệt.
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting || userProfile.status === 'pending'}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
