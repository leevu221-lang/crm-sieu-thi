import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Store, ArrowRight, Save, Loader2, Sparkles, LayoutGrid, Info, CheckCircle2, Copy, Check } from 'lucide-react';
import { isValidStoreName, normalizeStoreId } from './RTST/utils';

interface StoreDeclarationProps {
  onComplete: () => void;
}

export default function StoreDeclaration({ onComplete }: StoreDeclarationProps) {
  const { userProfile, updateStoreName } = useAuth();
  const maKho = userProfile?.ma_kho || '';
  
  const [store1, setStore1] = useState('');
  const [store2, setStore2] = useState('');
  const [store3, setStore3] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyExample = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load existing declared stores on mount
  useEffect(() => {
    async function loadDeclaredStores() {
      if (!maKho) {
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('[StoreDeclaration] Loading existing stores for maKho:', maKho);
        const maKhoNum = parseInt(maKho, 10);
        let query = supabase
          .from('store')
          .select('id, declared_stores');

        if (!isNaN(maKhoNum)) {
          query = query.or(`warehouse_code.eq.${maKho.trim()},warehouse_code.eq.${maKhoNum}`);
        } else {
          query = query.eq('warehouse_code', maKho.trim());
        }

        const { data, error } = await query;

        if (error) {
          console.error('[StoreDeclaration] Fetch error:', error);
        } else if (data && data.length > 0) {
          const found = data.find((d: any) => d.declared_stores && Array.isArray(d.declared_stores) && d.declared_stores.length > 0);
          if (found) {
            const stores = (found as any).declared_stores;
            setStore1(stores[0] || '');
            setStore2(stores[1] || '');
            setStore3(stores[2] || '');
          } else {
            const ids = data.map((d: any) => d.id).filter(Boolean);
            setStore1(ids[0] || '');
            setStore2(ids[1] || '');
            setStore3(ids[2] || '');
          }
        }
      } catch (err) {
        console.error('[StoreDeclaration] Failed to load stores:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDeclaredStores();
  }, [maKho]);

  const handleSave = async (shouldProceed = true) => {
    if (!maKho) return;
    
    setIsSaving(true);
    setStatusMessage(null);
    
    const declaredStores = [
      store1.trim(),
      store2.trim(),
      store3.trim()
    ].filter(Boolean); // keep only non-empty ones, but if they want to clear they can
    
    if (declaredStores.length === 0) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập ít nhất một tên siêu thị!' });
      setIsSaving(false);
      return;
    }

    // Validate each non-empty store name using the strict BI format validator
    for (let i = 0; i < declaredStores.length; i++) {
      const storeName = declaredStores[i];
      if (!isValidStoreName(storeName)) {
        setStatusMessage({ 
          type: 'error', 
          text: `Tên siêu thị "${storeName}" không hợp lệ! Vui lòng nhập đúng cú pháp trên BI (Ví dụ: ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH)` 
        });
        setIsSaving(false);
        return;
      }
    }

    // Fill up to 3 items
    const storesArray = [
      store1.trim(),
      store2.trim(),
      store3.trim()
    ];
    
    try {
      console.log('[StoreDeclaration] Saving declared stores as unique document IDs:', declaredStores);
      
      // Fetch old maKho document (e.g. 10528) to migrate data if declaring for the first time
      const { data: oldMaKhoData } = await supabase
        .from('store')
        .select('*')
        .eq('id', maKho.trim())
        .maybeSingle();

      for (const storeName of declaredStores) {
        // Fetch existing document of the store Name to merge cleanly and preserve other fields
        const { data: existingData } = await supabase
          .from('store')
          .select('*')
          .eq('id', normalizeStoreId(storeName))
          .maybeSingle();

        const normalizedId = normalizeStoreId(storeName);

        const payload: any = {
          id: normalizedId, // Normalized UPPERCASE ID to prevent duplicates
          warehouse_code: maKho.trim(),
          ten_sieu_thi: storeName, // Keep original casing for display
          declared_stores: storesArray,
          updated_at: new Date().toISOString(),
        };

        // Dynamically merge non-null/non-undefined properties from existingData or oldMaKhoData
        const mergeField = (key: string) => {
          const val = existingData?.[key] ?? oldMaKhoData?.[key];
          if (val !== undefined && val !== null) {
            payload[key] = val;
          }
        };

        const fieldsToMigrate = [
          'lk_bi_tong_quan', 'lk_nh_sieu_thi', 'taget_doanh_thu', 'category_targets',
          'lk_dt_nv', 'lk_td_nv', 'ds_nhan_vien', 'dt_gio_cong', 'data_phan_ca',
          'tragop_matran', 'tragop_nv', 'phuc_vu', 'ban_kem_nv'
        ];

        fieldsToMigrate.forEach(mergeField);

        const { error } = await supabase
          .from('store')
          .upsert(payload, { onConflict: 'id' });

        if (error) throw error;
      }

      // Delete the old raw maKho document (e.g. 10528) to clean up the DB
      await supabase
        .from('store')
        .delete()
        .eq('id', maKho.trim());

      // 3. Update/upsert the warehouses table to save this supermarket name permanently in the User Management database (ten_kho column)
      const { error: warehouseError } = await supabase
        .from('warehouses')
        .upsert({
          ma_kho: maKho.trim(),
          ten_kho: store1.trim()
        }, { onConflict: 'ma_kho' });

      if (warehouseError) {
        console.error('[StoreDeclaration] Error updating warehouses:', warehouseError);
      }

      // Update the client state userProfile context immediately so the UI updates instantly
      if (updateStoreName) {
        updateStoreName(store1.trim());
      }
      
      setStatusMessage({ type: 'success', text: 'Cập nhật cấu hình siêu thị thành công!' });
      
      if (shouldProceed) {
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    } catch (err: any) {
      console.error('[StoreDeclaration] Error saving:', err);
      setStatusMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu cấu hình: ' + (err.message || '') });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans font-black">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 font-sans font-black selection:bg-indigo-100 selection:text-indigo-900">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="w-full max-w-4xl bg-white rounded-[32px] shadow-2xl shadow-indigo-100/50 p-6 sm:p-8 md:p-10 border border-slate-100 relative overflow-hidden"
      >
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50/70 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-emerald-50/50 rounded-full blur-3xl -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Guidance (5 cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-2xl p-6 border border-slate-200/60 flex flex-col justify-between relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600" />
            
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100/60 text-indigo-600 rounded-xl">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Hướng dẫn khai báo
                </h2>
              </div>

              <div className="space-y-5">
                <div className="p-5 bg-red-50/40 rounded-2xl border border-red-200/80 shadow-sm relative group hover:border-red-300 transition-colors duration-300">
                  <div className="absolute -top-3 left-4 bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                    <Info size={12} className="shrink-0" />
                    <span>Lưu ý quan trọng</span>
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-black text-red-700 leading-relaxed mt-1">
                    Anh / chị vui lòng nhập đúng tên siêu thị trên BI hoặc mở BC Tổng Hợp copy tên siêu thị dán vào ạ.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Cú pháp chuẩn trên BI
                  </h3>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] sm:text-xs relative group overflow-hidden border border-slate-800">
                    <div className="flex justify-between items-center mb-2 text-[10px] text-slate-500 font-sans font-black uppercase tracking-wider">
                      <span>Ví dụ mẫu</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        Hợp lệ
                      </span>
                    </div>
                    <code className="block text-indigo-300 font-sans font-black select-all whitespace-pre-wrap break-all leading-relaxed">
                      ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH
                    </code>
                    
                    <button
                      onClick={() => handleCopyExample('ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH')}
                      className="absolute right-3 top-3 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors border border-slate-700/60"
                      title="Sao chép tên ví dụ"
                    >
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    
                    {copied && (
                      <span className="absolute right-12 top-4 text-[9px] font-black text-emerald-400 bg-slate-800 px-2 py-0.5 rounded shadow border border-slate-700/40">
                        Đã sao chép!
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider pl-1">
                    Các lưu ý cần biết
                  </h3>
                  <ul className="space-y-3 text-xs font-black text-slate-500 leading-normal">
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>Không tự ý viết tắt tên tỉnh thành hoặc bỏ bớt địa chỉ.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>Mở BC Tổng Hợp để copy chính xác từng khoảng trắng và ký tự đặc biệt.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                      <span>Có thể nhập từ 1 đến tối đa 3 siêu thị thuộc quyền quản lý của anh/chị.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Hệ thống hỗ trợ đồng bộ 24/7</span>
            </div>
          </div>

          {/* Right Column: Form (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div>
              <div className="text-center lg:text-left mb-6">
                <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-inner">
                  <Store size={24} strokeWidth={2.2} />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
                  Khai báo tên siêu thị
                </h1>
                <p className="text-xs text-slate-400 font-black tracking-wider uppercase mt-1.5">
                  Mã kho đăng nhập: <span className="text-indigo-600 font-black">{maKho}</span>
                </p>
              </div>

              {statusMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 text-sm font-black ${
                    statusMessage.type === 'success' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                      : 'bg-red-50 border-red-100 text-red-600'
                  }`}
                >
                  {statusMessage.type === 'success' ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 animate-bounce">
                      <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-black">!</span>
                    </div>
                  )}
                  <p>{statusMessage.text}</p>
                </motion.div>
              )}

              <div className="space-y-5">
                {/* Siêu thị 1 */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Siêu thị 1 <span className="text-indigo-500 font-black">*</span>
                    </label>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">Cơ sở chính</span>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store1}
                      onChange={(e) => setStore1(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-normal text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm placeholder:text-slate-400/80 placeholder:font-normal placeholder:text-[11px] sm:placeholder:text-xs md:placeholder:text-sm"
                      placeholder="Nhập tên siêu thị đúng cú pháp trên Bi VD : ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH"
                    />
                  </div>
                </div>

                {/* Siêu thị 2 */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Siêu thị 2
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store2}
                      onChange={(e) => setStore2(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-normal text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm placeholder:text-slate-400/80 placeholder:font-normal placeholder:text-[11px] sm:placeholder:text-xs md:placeholder:text-sm"
                      placeholder="Nhập tên siêu thị đúng cú pháp trên Bi VD : ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH"
                    />
                  </div>
                </div>

                {/* Siêu thị 3 */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
                    Siêu thị 3
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Store size={18} />
                    </div>
                    <input
                      type="text"
                      value={store3}
                      onChange={(e) => setStore3(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-normal text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm placeholder:text-slate-400/80 placeholder:font-normal placeholder:text-[11px] sm:placeholder:text-xs md:placeholder:text-sm"
                      placeholder="Nhập tên siêu thị đúng cú pháp trên Bi VD : ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-75 tracking-wider uppercase text-xs"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Save size={16} />
                    <span>Cập nhật & Tiếp tục</span>
                  </>
                )}
              </button>

              <button
                onClick={onComplete}
                disabled={isSaving}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] tracking-wider uppercase text-xs border border-slate-200"
              >
                <span>Tiếp tục vào App</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
