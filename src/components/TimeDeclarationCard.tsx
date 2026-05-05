import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TimeDeclarationCardProps {
  warehouseCode: string;
}

export default function TimeDeclarationCard({ warehouseCode }: TimeDeclarationCardProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [daysPassed, setDaysPassed] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Tính toán số ngày khi tháng/năm thay đổi
  useEffect(() => {
    calculateDays(month, year);
  }, [month, year]);

  // Load dữ liệu từ database khi component mount
  useEffect(() => {
    fetchWarehouseTime();
  }, [warehouseCode]);

  const fetchWarehouseTime = async () => {
    const { data, error } = await supabase
      .from('warehouse_time')
      .select('month, year, days_passed, total_days')
      .eq('warehouse_code', warehouseCode)
      .single();

    if (data) {
      setMonth(data.month);
      setYear(data.year);
      setDaysPassed(data.days_passed);
      setTotalDays(data.total_days);
    }
  };

  const calculateDays = (selectedMonth: number, selectedYear: number) => {
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Tính tổng số ngày trong tháng
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    setTotalDays(daysInMonth);

    // Logic tính số ngày đã qua
    if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
      setDaysPassed(daysInMonth);
    } else if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth)) {
      // Nếu chọn tháng tương lai, reset về tháng hiện tại
      setMonth(currentMonth);
      setYear(currentYear);
    } else {
      // Tháng hiện tại
      setDaysPassed(currentDay - 1);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    setSaveStatus('idle');

    // Lấy tất cả bản ghi cho mã kho này
    const { data: existingRecords } = await supabase
      .from('warehouse_time')
      .select('id')
      .eq('warehouse_code', warehouseCode)
      .order('updated_at', { ascending: false });

    const existingData = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

    // Xoá các bản ghi cũ bị trùng lặp (nếu có)
    if (existingRecords && existingRecords.length > 1) {
      const idsToDelete = existingRecords.slice(1).map(record => record.id);
      await supabase
        .from('warehouse_time')
        .delete()
        .in('id', idsToDelete);
    }

    let error;
    if (existingData) {
      // Update
      const { error: updateError } = await supabase
        .from('warehouse_time')
        .update({
          month,
          year,
          days_passed: daysPassed,
          total_days: totalDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingData.id);
      error = updateError;
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('warehouse_time')
        .insert({
          warehouse_code: warehouseCode,
          month,
          year,
          days_passed: daysPassed,
          total_days: totalDays,
          updated_at: new Date().toISOString()
        });
      error = insertError;
    }

    if (error) {
      console.error('Error saving time:', error.message, error.details, error.hint);
      setSaveStatus('error');
    } else {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Calendar size={20} />
        </div>
        <h3 className="font-bold text-slate-800">Cập nhật thời gian</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tháng</label>
          <select 
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Năm</label>
          <select 
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Số ngày đã qua</p>
          <p className="text-xl font-black text-indigo-600">{daysPassed} <span className="text-sm font-normal text-slate-400">ngày</span></p>
        </div>
        <div className="h-8 w-px bg-slate-200" />
        <div className="space-y-1 text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng ngày</p>
          <p className="text-xl font-black text-slate-700">{totalDays} <span className="text-sm font-normal text-slate-400">ngày</span></p>
        </div>
      </div>

      <button
        onClick={handleApply}
        disabled={loading}
        className={`w-full p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          saveStatus === 'success' 
            ? 'bg-emerald-500 text-white' 
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : saveStatus === 'success' ? (
          <><CheckCircle2 size={20} /> ĐÃ ÁP DỤNG</>
        ) : saveStatus === 'error' ? (
          <><AlertCircle size={20} /> LỖI LƯU TRỮ</>
        ) : (
          'ÁP DỤNG'
        )}
      </button>

      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium justify-center">
        <Clock size={12} />
        <span>Dữ liệu áp dụng chung cho mã kho: <span className="font-bold text-slate-600">{warehouseCode}</span></span>
      </div>
    </div>
  );
}
