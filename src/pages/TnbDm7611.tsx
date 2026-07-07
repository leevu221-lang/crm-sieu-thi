import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, BarChart3, Activity, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
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
  const lines = rawText.split(/\r?\n/).filter(line => line.trim() !== '');


  // Find the "TARGET NGÀY" row — show only from that row onwards
  const targetNgayIdx = lines.findIndex(line =>
    line.toUpperCase().includes('TARGET NGÀY') ||
    line.toUpperCase().includes('TARGET NGAY')
  );
  const visibleLines = (targetNgayIdx !== -1
    ? lines.slice(targetNgayIdx)
    : lines.slice(1)
  ).filter(line => !line.toLowerCase().includes('hỗ trợ bi liên hệ user'));

  // Pre-process: assign nganhHang to each row using carry-forward logic
  // A "marker row" is one that contains "DT REALTIME" or "SL REALTIME" in any column
  const isMarkerRow = (cols: string[]) =>
    cols.some(c => c.toUpperCase().includes('DT REALTIME') || c.toUpperCase().includes('SL REALTIME'));

  let currentNganhHang = '';
  const processedRows = visibleLines.map(row => {
    const cols = row.split('\t').map(c => c.trim());
    const marker = isMarkerRow(cols);
    if (marker && cols[0]) currentNganhHang = cols[0];
    return {
      cols,
      marker,
      nganhHang: currentNganhHang,
      isTotalRow: row.toUpperCase().includes('TỔNG'),
      isTargetRow: row.toUpperCase().includes('TARGET NGÀY') || row.toUpperCase().includes('TARGET NGAY'),
    };
  });

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
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-left">NGÀNH HÀNG</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-left">TỈNH</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">REALTIME</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">TARGET</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">%HT</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center">XẾP HẠNG MIỀN</th>
            </tr>
          </thead>
          <tbody>
            {processedRows.map(({ cols, marker, nganhHang, isTotalRow, isTargetRow }, i) => {
              const rowCls = isTargetRow
                ? 'bg-indigo-900 text-white font-black'
                : marker
                  ? 'bg-slate-800 text-white font-bold'
                  : isTotalRow
                    ? 'bg-amber-50 font-bold'
                    : i % 2 === 0 ? 'bg-white' : 'bg-slate-50';

              const textCls = (isTargetRow || marker) ? 'text-white' : '';

              return (
                <tr key={i} className={`${rowCls} hover:opacity-90 transition-colors`}>
                  {/* NGÀNH HÀNG: carry-forward from marker rows, empty if not yet set */}
                  <td className={`border border-slate-200 p-2.5 whitespace-nowrap font-black text-[10px] uppercase tracking-wider ${
                    marker || isTargetRow ? 'text-white' : 'text-indigo-700 bg-indigo-50'
                  }`}>
                    {nganhHang}
                  </td>
                  {/* All original columns kept as-is: empty cell = empty display */}
                  <td className={`border border-slate-200 p-2.5 whitespace-nowrap font-bold ${isTargetRow || marker ? 'text-white' : 'text-slate-900'}`}>
                    {cols[0] || ''}
                  </td>
                  <td className={`border border-slate-200 p-2.5 whitespace-nowrap text-center ${textCls || 'text-slate-600'}`}>
                    {cols[1] || ''}
                  </td>
                  <td className={`border border-slate-200 p-2.5 whitespace-nowrap text-center ${textCls || 'text-slate-600'}`}>
                    {cols[2] || ''}
                  </td>
                  <td className={`border border-slate-200 p-2.5 whitespace-nowrap text-center ${isTargetRow || marker ? 'text-white' : 'text-emerald-600 font-bold'}`}>
                    {cols[3] || ''}
                  </td>
                  <td className={`border border-slate-200 p-2.5 whitespace-nowrap text-center ${isTargetRow || marker ? 'text-white' : 'text-indigo-600 font-black'}`}>
                    {cols[4] || ''}
                  </td>
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

// ─── Color palette for NGÀNH HÀNG column groups ───────────────────────────────
const NH_COLORS = [
  { header: 'bg-yellow-300', sub: 'bg-yellow-100', text: 'text-yellow-900' },
  { header: 'bg-blue-300',   sub: 'bg-blue-100',   text: 'text-blue-900'   },
  { header: 'bg-green-300',  sub: 'bg-green-100',  text: 'text-green-900'  },
  { header: 'bg-purple-300', sub: 'bg-purple-100', text: 'text-purple-900' },
  { header: 'bg-rose-300',   sub: 'bg-rose-100',   text: 'text-rose-900'   },
  { header: 'bg-orange-300', sub: 'bg-orange-100', text: 'text-orange-900' },
  { header: 'bg-teal-300',   sub: 'bg-teal-100',   text: 'text-teal-900'   },
  { header: 'bg-indigo-300', sub: 'bg-indigo-100', text: 'text-indigo-900' },
];

const parsePct = (v: string) => parseFloat(v.replace('%', '').replace(',', '.')) || 0;
const pctCls = (v: string) => {
  const n = parsePct(v);
  if (!v) return '';
  if (n >= 100) return 'bg-green-100 text-green-700 font-bold';
  if (n >= 80)  return 'bg-amber-100 text-amber-700 font-bold';
  return 'bg-red-100 text-red-600 font-bold';
};

const parseRawText = (rawText: string) => {
  const lines = rawText.split(/\r?\n/).filter(l => l.trim() !== '');
  const targetNgayIdx = lines.findIndex(l =>
    l.toUpperCase().includes('TARGET NGÀY') || l.toUpperCase().includes('TARGET NGAY'));
  const visible = (targetNgayIdx !== -1 ? lines.slice(targetNgayIdx) : lines.slice(1))
    .filter(l => !l.toLowerCase().includes('hỗ trợ bi liên hệ user'));

  const isMarker = (cols: string[]) =>
    cols.some(c => c.toUpperCase().includes('DT REALTIME') || c.toUpperCase().includes('SL REALTIME'));

  let nganh = '';
  return visible.map(row => {
    const cols = row.split('\t').map(c => c.trim());
    const marker = isMarker(cols);
    if (marker && cols[0]) nganh = cols[0];
    return {
      cols, marker,
      nganhHang: nganh,
      isTargetRow: row.toUpperCase().includes('TARGET NGÀY') || row.toUpperCase().includes('TARGET NGAY'),
    };
  });
};

const ThiDuaNganhHangTable = ({ rawText }: { rawText: string }) => {
  if (!rawText.trim()) return null;
  const rows = parseRawText(rawText);

  // Unique NGÀNH HÀNG in order
  const nganhHangs: string[] = [];
  rows.forEach(({ marker, cols }) => {
    if (marker && cols[0] && !nganhHangs.includes(cols[0])) nganhHangs.push(cols[0]);
  });
  if (nganhHangs.length === 0) return null;

  // Unique TỈNH rows (non-marker, non-target, has cols[0])
  const tinhs: string[] = [];
  rows.forEach(({ marker, isTargetRow, cols }) => {
    if (!marker && !isTargetRow && cols[0] && !tinhs.includes(cols[0])) tinhs.push(cols[0]);
  });

  // Build pivot: tinh → nganhHang → cell
  type Cell = { rt: string; target: string; pct: string; rank: string };
  const pivot: Record<string, Record<string, Cell>> = {};
  rows.forEach(({ cols, marker, nganhHang, isTargetRow }) => {
    if (marker || isTargetRow) return;
    const tinh = cols[0]; if (!tinh || !nganhHang) return;
    if (!pivot[tinh]) pivot[tinh] = {};
    if (!pivot[tinh][nganhHang])
      pivot[tinh][nganhHang] = { rt: cols[1] || '', target: cols[2] || '', pct: cols[3] || '', rank: cols[4] || '' };
  });

  const now = new Date().toLocaleDateString('vi-VN');
  const totalNH = nganhHangs.length;


  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-lg mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-6 bg-indigo-600 rounded-full" />
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-tighter">THI ĐUA NGÀNH HÀNG</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{now}</span>
      </div>
      <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
        <table className="min-w-full text-[10px] text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white font-bold uppercase text-[9px]">
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-left sticky left-0 bg-slate-900 z-10">TỈNH</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center bg-slate-700">ĐẠT</th>
              <th className="border border-slate-700 p-2.5 whitespace-nowrap text-center bg-slate-700">TỶ LỆ</th>
              {nganhHangs.map((nh, i) => (
                <th key={nh} className={`border border-slate-300 p-2 ${NH_COLORS[i % NH_COLORS.length].header} font-black text-center uppercase tracking-wide text-[9px] whitespace-nowrap`}>
                  {nh}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Data rows */}

            {[...tinhs].sort((a, b) => {
                const calcTyLe = (t: string) => {
                  const rd = pivot[t] || {};
                  const dc = nganhHangs.filter(nh => parsePct(rd[nh]?.pct || '') >= 100).length;
                  return totalNH > 0 ? dc / totalNH : 0;
                };
                return calcTyLe(b) - calcTyLe(a);
              }).map((tinh, i) => {

              const rowData = pivot[tinh] || {};
              const datCount = nganhHangs.filter(nh => parsePct(rowData[nh]?.pct || '') >= 100).length;
              const tyLePct = totalNH > 0 ? Math.round((datCount / totalNH) * 100) : 0;
              return (
                <tr key={tinh} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}>
                  <td className="border border-slate-200 p-2 whitespace-nowrap font-bold text-slate-900 sticky left-0 bg-inherit z-10">{tinh}</td>
                  <td className="border border-slate-200 p-2 text-center font-black text-slate-700">{datCount}/{totalNH}</td>
                  <td className={`border border-slate-200 p-2 text-center font-black ${pctCls(tyLePct + '%')}`}>{tyLePct}%</td>
                  {nganhHangs.map((nh) => {
                    const cell = rowData[nh];
                    return (
                      <td key={nh} className={`border border-slate-200 p-2 text-center ${pctCls(cell?.pct || '')}`}>{cell?.pct || ''}</td>
                    );
                  })}
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
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Always holds latest data — avoids stale closure in save handlers
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!userProfile?.ma_kho) { setLoading(false); return; }
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

  const showSaveStatus = (status: 'success' | 'error') => {
    setSaveStatus(status);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
  };

  // Single field save — uses explicit value to avoid stale closure
  const handleSave = async (key: keyof typeof data, value: string) => {
    if (!userProfile?.ma_kho) return;
    try {
      const { error } = await supabase
        .from('tnb_dm_7611_data')
        .upsert({
          warehouse_code: userProfile.ma_kho,
          ten_sieu_thi: userProfile.ten_sieu_thi,
          [key]: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'warehouse_code' });
      if (error) throw error;
      showSaveStatus('success');
    } catch (err) {
      console.error('[TnbDm7611] Lỗi khi lưu:', err);
      showSaveStatus('error');
    }
  };

  // Save ALL fields at once using dataRef (always fresh)
  const handleSaveAll = async () => {
    if (!userProfile?.ma_kho || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tnb_dm_7611_data')
        .upsert({
          warehouse_code: userProfile.ma_kho,
          ten_sieu_thi: userProfile.ten_sieu_thi,
          ...dataRef.current,
          updated_at: new Date().toISOString()
        }, { onConflict: 'warehouse_code' });
      if (error) throw error;
      showSaveStatus('success');
    } catch (err) {
      console.error('[TnbDm7611] Lỗi khi lưu tất cả:', err);
      showSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'nhap-lieu', label: 'NHẬP LIỆU CHUNG', icon: Activity },
    { id: 'thidua', label: 'THI ĐUA VÙNG / SIÊU THỊ', icon: BarChart3 }
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">TNB_DM_7611</h1>

      {/* Header row: tabs + save button + toast */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
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

        {/* Save All button + status toast */}
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saveStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${
                  saveStatus === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {saveStatus === 'success'
                  ? <><CheckCircle2 size={13} /> Đã lưu Supabase</>
                  : <><AlertCircle size={13} /> Lỗi khi lưu!</>}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={handleSaveAll}
            disabled={saving || !userProfile?.ma_kho}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            LƯU TẤT CẢ
          </button>
        </div>
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
                  <Box title="DS BOSS" icon={Users} value={data.ds_boss} onChange={(v) => setData(d => ({...d, ds_boss: v}))} onBlur={() => { handleSave('ds_boss', data.ds_boss); }} />
                  <Box title="REALTIME DATA VÙNG" icon={Activity} value={data.realtime_vung} onChange={(v) => setData(d => ({...d, realtime_vung: v}))} onBlur={() => { handleSave('realtime_vung', data.realtime_vung); }} />
                  <Box title="REALTIME DATA SIÊU THỊ" icon={Activity} value={data.realtime_st} onChange={(v) => setData(d => ({...d, realtime_st: v}))} onBlur={() => { handleSave('realtime_st', data.realtime_st); }} />
                  <Box title="LUỸ KẾ DATA VÙNG" icon={BarChart3} value={data.luyke_vung} onChange={(v) => setData(d => ({...d, luyke_vung: v}))} onBlur={() => { handleSave('luyke_vung', data.luyke_vung); }} />
                  <Box title="LUỸ KẾ DATA SIÊU THỊ" icon={BarChart3} value={data.luyke_st} onChange={(v) => setData(d => ({...d, luyke_st: v}))} onBlur={() => { handleSave('luyke_st', data.luyke_st); }} />
                  <Box title="REALTIME MA TRẬN VÙNG" icon={Activity} value={data.rt_ma_tran_vung} onChange={(v) => setData(d => ({...d, rt_ma_tran_vung: v}))} onBlur={() => { handleSave('rt_ma_tran_vung', data.rt_ma_tran_vung); }} />
                  <Box title="LUỸ KẾ MA TRẬN VÙNG" icon={BarChart3} value={data.lk_ma_tran_vung} onChange={(v) => setData(d => ({...d, lk_ma_tran_vung: v}))} onBlur={() => { handleSave('lk_ma_tran_vung', data.lk_ma_tran_vung); }} />
                  <Box title="REALTIME MA TRẬN SIÊU THỊ" icon={Activity} value={data.rt_ma_tran_sieu_thi} onChange={(v) => setData(d => ({...d, rt_ma_tran_sieu_thi: v}))} onBlur={() => { handleSave('rt_ma_tran_sieu_thi', data.rt_ma_tran_sieu_thi); }} />
                  <Box title="LUỸ KẾ MA TRẬN SIÊU THỊ" icon={BarChart3} value={data.lk_ma_tran_sieu_thi} onChange={(v) => setData(d => ({...d, lk_ma_tran_sieu_thi: v}))} onBlur={() => { handleSave('lk_ma_tran_sieu_thi', data.lk_ma_tran_sieu_thi); }} />
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
                    onChange={(v) => setData(d => ({...d, thidua_vung_st: v}))}
                    onBlur={() => { handleSave('thidua_vung_st', data.thidua_vung_st); }}
                  />
                </div>
                <ThiDuaNganhHangTable rawText={data.realtime_vung} />
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
