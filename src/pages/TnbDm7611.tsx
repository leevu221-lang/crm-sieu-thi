import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, BarChart3, Activity, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const Box = ({ title, icon: Icon, value, onChange, onBlur }: { title: string; icon?: React.ElementType; value: string; onChange: (v: string) => void; onBlur: () => void }) => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2">
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-indigo-600" />}
      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">{title}</h3>
    </div>
    <textarea 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-full min-h-[40px] p-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none"
      placeholder="Dán dữ liệu..."
    />
  </div>
);


const TempTable = ({ rawText }: { rawText: string }) => {
  if (!rawText.trim()) return null;
  const lines = rawText.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-lg mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-tighter">TEMP</h3>
      </div>
      <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
        <table className="min-w-full text-[11px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px]">
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-left">TỈNH</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">REALTIME</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">TARGET</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">%HT</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">XẾP HẠNG MIỀN</th>
            </tr>
          </thead>
          <tbody>
            {lines.slice(1).map((row, i) => {
              const cols = row.split(/\t|,/).map(c => c.trim());
              const isTotalRow = row.toUpperCase().includes('TỔNG');
              
              return (
                <tr 
                  key={i} 
                  className={`
                    ${isTotalRow ? "bg-amber-50 font-bold" : (i % 2 === 0 ? "bg-white" : "bg-slate-50")}
                    hover:bg-indigo-50 transition-colors
                  `}
                >
                  <td className="border border-slate-200 p-2.5 whitespace-nowrap font-bold text-slate-900">{cols[0] || ''}</td>
                  <td className="border border-slate-200 p-2.5 whitespace-nowrap text-center text-slate-600">{cols[1] || ''}</td>
                  <td className="border border-slate-200 p-2.5 whitespace-nowrap text-center text-slate-600">{cols[2] || ''}</td>
                  <td className="border border-slate-200 p-2.5 whitespace-nowrap text-center text-emerald-600 font-bold">{cols[3] || ''}</td>
                  <td className="border border-slate-200 p-2.5 whitespace-nowrap text-center text-indigo-600 font-black">{cols[4] || ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ThiDuaTable = ({ title, rawText }: { title: string; rawText: string }) => {
  if (!rawText.trim()) return null;
  const lines = rawText.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-lg mt-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
        <h3 className="font-black text-slate-800 text-sm uppercase tracking-tighter">{title}</h3>
      </div>
      <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
        <table className="min-w-full text-[11px] text-left border-collapse">
          <thead>
            {lines.length > 0 && (
              <tr className="bg-slate-800 text-white font-bold">
                {lines[0].split('\t').map((col, j) => (
                  <th key={j} className="border border-slate-700 p-2.5 whitespace-nowrap text-center">
                    {col}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {lines.slice(1).map((row, i) => {
              const cols = row.split('\t');
              const isTotalRow = row.toLowerCase().includes('tổng');
              return (
                <tr 
                  key={i} 
                  className={`
                    ${isTotalRow ? "bg-amber-50 font-bold" : (i % 2 === 0 ? "bg-white" : "bg-slate-50")}
                    hover:bg-indigo-50 transition-colors
                  `}
                >
                  {cols.map((col, j) => (
                    <td 
                      key={j} 
                      className={`
                        border border-slate-200 p-2.5 whitespace-nowrap
                        ${j === 0 ? "font-bold text-indigo-700 sticky left-0 bg-inherit shadow-[1px_0_0_0_rgba(0,0,0,0.1)]" : "text-center"}
                        ${col.includes('%') ? "text-green-600 font-medium" : ""}
                      `}
                    >
                      {col}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function TnbDm7611() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('nhap-lieu');
  const [data, setData] = useState({
    ds_boss: '',
    realtime_vung: '',
    realtime_st: '',
    luyke_vung: '',
    luyke_st: '',
    rt_ma_tran_vung: '',
    lk_ma_tran_vung: '',
    rt_ma_tran_sieu_thi: '',
    lk_ma_tran_sieu_thi: '',
    thidua_vung_st: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!userProfile?.ma_kho) {
        setLoading(false);
        return;
      }
      const { data: dbData } = await supabase
        .from('tnb_dm_7611_data')
        .select('*')
        .eq('warehouse_code', userProfile.ma_kho)
        .maybeSingle();

      if (dbData) {
        setData({
          ds_boss: dbData.ds_boss || '',
          realtime_vung: dbData.realtime_vung || '',
          realtime_st: dbData.realtime_st || '',
          luyke_vung: dbData.luyke_vung || '',
          luyke_st: dbData.luyke_st || '',
          rt_ma_tran_vung: dbData.rt_ma_tran_vung || '',
          lk_ma_tran_vung: dbData.lk_ma_tran_vung || '',
          rt_ma_tran_sieu_thi: dbData.rt_ma_tran_sieu_thi || '',
          lk_ma_tran_sieu_thi: dbData.lk_ma_tran_sieu_thi || '',
          thidua_vung_st: dbData.thidua_vung_st || ''
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [userProfile]);

  const handleSave = async (key: keyof typeof data) => {
    if (!userProfile?.ma_kho) return;

    try {
      const { error } = await supabase
        .from('tnb_dm_7611_data')
        .upsert({
          warehouse_code: userProfile.ma_kho,
          ten_sieu_thi: userProfile.ten_sieu_thi,
          [key]: data[key],
          updated_at: new Date().toISOString()
        }, { onConflict: 'warehouse_code' });

      if (error) throw error;
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
    }
  };

  const tabs = [
    { id: 'nhap-lieu', label: 'NHẬP LIỆU CHUNG', icon: Activity },
    { id: 'thidua', label: 'THI ĐUA VÙNG / SIÊU THỊ', icon: BarChart3 }
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">TNB_DM_7611</h1>
      
      {/* Tab Navigation */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === tab.id 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute w-full h-full" style={{ transform: `rotate(${i * 30}deg)` }}>
                <div className="w-1.5 h-4 bg-indigo-500 rounded-full mx-auto animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
              </div>
            ))}
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={activeTab}
            className="space-y-4"
          >
            {activeTab === 'nhap-lieu' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Box title="DS BOSS" icon={Users} value={data.ds_boss} onChange={(v) => setData({...data, ds_boss: v})} onBlur={() => handleSave('ds_boss')} />
                  <Box title="REALTIME DATA VÙNG" icon={Activity} value={data.realtime_vung} onChange={(v) => setData({...data, realtime_vung: v})} onBlur={() => handleSave('realtime_vung')} />
                  <Box title="REALTIME DATA SIÊU THỊ" icon={Activity} value={data.realtime_st} onChange={(v) => setData({...data, realtime_st: v})} onBlur={() => handleSave('realtime_st')} />
                  <Box title="LUỸ KẾ DATA VÙNG" icon={BarChart3} value={data.luyke_vung} onChange={(v) => setData({...data, luyke_vung: v})} onBlur={() => handleSave('luyke_vung')} />
                  <Box title="LUỸ KẾ DATA SIÊU THỊ" icon={BarChart3} value={data.luyke_st} onChange={(v) => setData({...data, luyke_st: v})} onBlur={() => handleSave('luyke_st')} />
                  <Box title="REALTIME MA TRẬN VÙNG" icon={Activity} value={data.rt_ma_tran_vung} onChange={(v) => setData({...data, rt_ma_tran_vung: v})} onBlur={() => handleSave('rt_ma_tran_vung')} />
                  <Box title="LUỸ KẾ MA TRẬN VÙNG" icon={BarChart3} value={data.lk_ma_tran_vung} onChange={(v) => setData({...data, lk_ma_tran_vung: v})} onBlur={() => handleSave('lk_ma_tran_vung')} />
                  <Box title="REALTIME MA TRẬN SIÊU THỊ" icon={Activity} value={data.rt_ma_tran_sieu_thi} onChange={(v) => setData({...data, rt_ma_tran_sieu_thi: v})} onBlur={() => handleSave('rt_ma_tran_sieu_thi')} />
                  <Box title="LUỸ KẾ MA TRẬN SIÊU THỊ" icon={BarChart3} value={data.lk_ma_tran_sieu_thi} onChange={(v) => setData({...data, lk_ma_tran_sieu_thi: v})} onBlur={() => handleSave('lk_ma_tran_sieu_thi')} />
                </div>
                <TempTable rawText={data.realtime_vung} />
              </>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Box 
                    title="DỮ LIỆU THI ĐUA VÙNG / SIÊU THỊ" 
                    icon={BarChart3} 
                    value={data.thidua_vung_st} 
                    onChange={(v) => setData({...data, thidua_vung_st: v})} 
                    onBlur={() => handleSave('thidua_vung_st')} 
                  />
                </div>
                <ThiDuaTable 
                  title="REALTIME THI ĐUA SIÊU THỊ" 
                  rawText={data.realtime_st} 
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
