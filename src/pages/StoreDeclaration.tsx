import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Store, ArrowRight, Save, Loader2, Sparkles, LayoutGrid } from 'lucide-react';
import { isValidStoreName } from './RTST/utils';

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
          .eq('id', storeName)
          .maybeSingle();

        const payload: any = {
          id: storeName, // The Supermarket Name as the unique Document ID / Primary Key!
          warehouse_code: maKho.trim(),
          ten_sieu_thi: storeName,
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
          <div className="w-12 h-12 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
        className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl shadow-indigo-100/50 p-8 sm:p-10 border border-slate-100 relative overflow-hidden"
      >
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl -z-10 opacity-70" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-50 rounded-full blur-3xl -z-10 opacity-50" />

        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-inner">
            <Store size={26} strokeWidth={2.2} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight uppercase">
            Khai báo tên siêu thị
          </h1>
          <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-2">
            Mã kho đăng nhập: <span className="text-indigo-600 font-black">{maKho}</span>
          </p>
        </div>

        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 text-sm font-bold ${
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
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">Cơ sở chính</span>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <Store size={18} />
              </div>
              <input
                type="text"
                value={store1}
                onChange={(e) => setStore1(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm placeholder:text-slate-400/80 placeholder:font-medium placeholder:text-[11px] sm:placeholder:text-xs md:placeholder:text-sm"
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
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm placeholder:text-slate-400/80 placeholder:font-medium placeholder:text-[11px] sm:placeholder:text-xs md:placeholder:text-sm"
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
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-inner text-sm placeholder:text-slate-400/80 placeholder:font-medium placeholder:text-[11px] sm:placeholder:text-xs md:placeholder:text-sm"
                placeholder="Nhập tên siêu thị đúng cú pháp trên Bi VD : ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH"
              />
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
      </motion.div>
    </div>
  );
}
