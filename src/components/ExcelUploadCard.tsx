import React, { useState } from 'react';
import { FileUp, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ExcelUploadCardProps {
  onUpload: (file: File) => Promise<void>;
}

export default function ExcelUploadCard({ onUpload }: ExcelUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('idle');
    
    try {
      await onUpload(file);
      setStatus('success');
      setFile(null);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
          <FileSpreadsheet size={16} />
        </div>
        <h3 className="font-bold text-sm text-slate-800">Nhập dữ liệu Excel</h3>
      </div>

      <div 
        className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
          file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 hover:border-indigo-200'
        }`}
      >
        <input 
          type="file" 
          id="excel-upload" 
          className="hidden" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange}
        />
        <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center gap-2">
          <div className={`p-3 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 shadow-sm'}`}>
            <FileUp size={24} />
          </div>
          <div>
            <p className="font-bold text-xs text-slate-700">{file ? file.name : 'Chọn file Excel'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">.xlsx, .xls (Tối đa 10MB)</p>
          </div>
        </label>
      </div>

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-slate-900 text-white p-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            'BẮT ĐẦU PHÂN TÍCH'
          )}
        </button>
      )}

      {status === 'success' && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-lg flex items-center gap-2">
          <Check size={16} className="shrink-0" />
          <p className="text-xs font-medium">Tải lên thành công!</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <p className="text-xs font-medium">Lỗi xử lý file.</p>
        </div>
      )}
    </div>
  );
}
