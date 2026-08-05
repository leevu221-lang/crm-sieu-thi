import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle, FileSpreadsheet, Search, Plus, Edit2, Trash2, Check } from 'lucide-react';

export interface ExclusionRule {
  hinhThucXuat: string;
  nganhHang: string;
  nhomHang: string;
  tenSanPham: string;
  note?: string;
}

interface ConfigExclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: ExclusionRule[]) => void;
  initialRules: ExclusionRule[];
}

export const ConfigExclusionModal: React.FC<ConfigExclusionModalProps> = ({ isOpen, onClose, onSave, initialRules }) => {
  const [isEditingExcel, setIsEditingExcel] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Table view state
  const [searchName, setSearchName] = useState('');

  const [draftRules, setDraftRules] = useState<ExclusionRule[]>([]);
  const [pasteDefaultCol, setPasteDefaultCol] = useState<'hinhThucXuat' | 'nganhHang' | 'nhomHang' | 'tenSanPham'>('nhomHang');
  
  // Inline editing state
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ExclusionRule>({ hinhThucXuat: '', nganhHang: '', nhomHang: '', tenSanPham: '', note: '' });

  // Add new row state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<ExclusionRule>({ hinhThucXuat: '', nganhHang: '', nhomHang: '', tenSanPham: '', note: '' });

  useEffect(() => {
    if (isOpen) {
      const sanitized = (initialRules || []).map(r => ({
        hinhThucXuat: r.hinhThucXuat || '',
        nganhHang: r.nganhHang || '',
        nhomHang: r.nhomHang || '',
        tenSanPham: r.tenSanPham || '',
        note: r.note || ''
      }));
      setDraftRules(sanitized);
      if (!initialRules || initialRules.length === 0) {
        setIsEditingExcel(true);
      } else {
        setIsEditingExcel(false);
      }
      setError(null);
      setEditingRowIdx(null);
      setIsAddingNew(false);
    }
  }, [isOpen, initialRules]);

  const filteredData = useMemo(() => {
    return draftRules.map((rule, origIdx) => ({ rule, origIdx })).filter(d => {
      const s = searchName.toLowerCase();
      const matchSearch = 
        (d.rule.hinhThucXuat || '').toLowerCase().includes(s) ||
        (d.rule.nganhHang || '').toLowerCase().includes(s) || 
        (d.rule.nhomHang || '').toLowerCase().includes(s) || 
        (d.rule.tenSanPham || '').toLowerCase().includes(s) ||
        (d.rule.note || '').toLowerCase().includes(s);
      return matchSearch;
    });
  }, [draftRules, searchName]);

  if (!isOpen) return null;

  const handleParseExcel = () => {
    try {
      const newRules: ExclusionRule[] = [];
      const lines = text.split('\n');
      
      let idxHtx = -1;
      let idxNganh = -1;
      let idxNhom = -1;
      let idxTen = -1;
      let idxNote = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split('\t').map(c => c.trim());
        
        if (i === 0 && (line.toLowerCase().includes('hình thức') || line.toLowerCase().includes('ngành hàng') || line.toLowerCase().includes('nhóm hàng') || line.toLowerCase().includes('tên sản phẩm'))) {
          const lowerCols = cols.map(c => c.toLowerCase());
          idxHtx = lowerCols.findIndex(c => c.includes('hình thức') || c.includes('hinh thuc') || c.includes('loại ycx') || c.includes('loại yêu cầu'));
          idxNganh = lowerCols.findIndex(c => c === 'ngành hàng' || c === 'nganh hang');
          idxNhom = lowerCols.findIndex(c => c === 'nhóm hàng' || c === 'nhom hang');
          idxTen = lowerCols.findIndex(c => c.includes('tên sản phẩm') || c.includes('ten san pham') || c === 'tên hàng' || c === 'tên');
          idxNote = lowerCols.findIndex(c => c.includes('ghi chú') || c.includes('ghi chu') || c.includes('lý do') || c.includes('ly do') || c.includes('note'));
          continue;
        }

        if (idxHtx === -1 && idxNganh === -1 && idxNhom === -1 && idxTen === -1) {
          if (cols.length >= 5) {
            idxHtx = 0; idxNganh = 1; idxNhom = 2; idxTen = 3; idxNote = 4;
          } else if (cols.length === 4) {
            idxHtx = 0; idxNganh = 1; idxNhom = 2; idxTen = 3; idxNote = -1;
          } else if (cols.length === 3) {
            idxHtx = -1; idxNganh = 0; idxNhom = 1; idxTen = 2; idxNote = -1;
          } else if (cols.length === 2) {
            idxHtx = -1; idxNganh = -1; idxNhom = 0; idxTen = -1; idxNote = 1;
          } else {
            if (pasteDefaultCol === 'hinhThucXuat') {
              idxHtx = 0; idxNganh = -1; idxNhom = -1; idxTen = -1; idxNote = -1;
            } else if (pasteDefaultCol === 'nganhHang') {
              idxHtx = -1; idxNganh = 0; idxNhom = -1; idxTen = -1; idxNote = -1;
            } else if (pasteDefaultCol === 'tenSanPham') {
              idxHtx = -1; idxNganh = -1; idxNhom = -1; idxTen = 0; idxNote = -1;
            } else {
              idxHtx = -1; idxNganh = -1; idxNhom = 0; idxTen = -1; idxNote = -1;
            }
          }
        }

        const htx = idxHtx !== -1 ? cols[idxHtx] || '' : '';
        const nganh = idxNganh !== -1 ? cols[idxNganh] || '' : '';
        const nhom = idxNhom !== -1 ? cols[idxNhom] || '' : '';
        const ten = idxTen !== -1 ? cols[idxTen] || '' : '';
        const note = idxNote !== -1 ? cols[idxNote] || '' : '';

        if (htx || nganh || nhom || ten) {
          newRules.push({
            hinhThucXuat: htx.toUpperCase(),
            nganhHang: nganh.toUpperCase(),
            nhomHang: nhom.toUpperCase(),
            tenSanPham: ten.toUpperCase(),
            note: note
          });
        }
      }
      
      if (newRules.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ.');
      }

      setDraftRules(newRules);
      setIsEditingExcel(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
    }
  };

  const handleOpenEditExcel = () => {
    let tsv = 'Hình thức xuất\tNgành hàng\tNhóm hàng\tTên sản phẩm\tGhi chú / Lý do loại bỏ\n';
    if (draftRules.length > 0) {
      for (const rule of draftRules) {
        tsv += `${rule.hinhThucXuat || ''}\t${rule.nganhHang || ''}\t${rule.nhomHang || ''}\t${rule.tenSanPham || ''}\t${rule.note || ''}\n`;
      }
      setText(tsv.trim());
    } else {
      setText('');
    }
    setError(null);
    setIsEditingExcel(true);
  };
  
  const handleDeleteRow = (origIdx: number) => {
    if (window.confirm('Xoá quy tắc loại bỏ này?')) {
      setDraftRules(prev => prev.filter((_, i) => i !== origIdx));
    }
  };

  const startEditRow = (rule: ExclusionRule, origIdx: number) => {
    setEditingRowIdx(origIdx);
    setEditForm({ ...rule });
  };

  const saveEditRow = () => {
    if (!editForm.hinhThucXuat.trim() && !editForm.nganhHang.trim() && !editForm.nhomHang.trim() && !editForm.tenSanPham.trim()) {
      alert('Quy tắc phải chứa ít nhất một từ khóa ở cột Hình thức xuất, Ngành hàng, Nhóm hàng hoặc Tên sản phẩm.');
      return;
    }
    setDraftRules(prev => {
      const arr = [...prev];
      if (editingRowIdx !== null) {
        arr[editingRowIdx] = {
          hinhThucXuat: editForm.hinhThucXuat.trim().toUpperCase(),
          nganhHang: editForm.nganhHang.trim().toUpperCase(),
          nhomHang: editForm.nhomHang.trim().toUpperCase(),
          tenSanPham: editForm.tenSanPham.trim().toUpperCase(),
          note: editForm.note?.trim()
        };
      }
      return arr;
    });
    setEditingRowIdx(null);
  };

  const saveNewRow = () => {
    if (!newForm.hinhThucXuat.trim() && !newForm.nganhHang.trim() && !newForm.nhomHang.trim() && !newForm.tenSanPham.trim()) {
      alert('Quy tắc phải chứa ít nhất một từ khóa ở cột Hình thức xuất, Ngành hàng, Nhóm hàng hoặc Tên sản phẩm.');
      return;
    }
    setDraftRules(prev => [{
      hinhThucXuat: newForm.hinhThucXuat.trim().toUpperCase(),
      nganhHang: newForm.nganhHang.trim().toUpperCase(),
      nhomHang: newForm.nhomHang.trim().toUpperCase(),
      tenSanPham: newForm.tenSanPham.trim().toUpperCase(),
      note: newForm.note?.trim()
    }, ...prev]);
    setIsAddingNew(false);
    setNewForm({ hinhThucXuat: '', nganhHang: '', nhomHang: '', tenSanPham: '', note: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-slate-800">Cấu hình Danh sách Loại Bỏ (Exclusion Rules)</h2>
            <p className="text-sm text-slate-500 mt-1">
              Nhập từ khóa cần tìm và loại bỏ trong Ngành hàng, Nhóm hàng, Tên sản phẩm (Chỉ cần chứa cụm từ để khớp)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative p-5">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
              {error}
            </div>
          )}

          {isEditingExcel ? (
            <div className="flex-1 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="mb-4 text-sm text-slate-600 font-medium flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Dán nội dung từ Excel/Google Sheets vào đây. Cột hỗ trợ đối chiếu:</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Hình thức xuất</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Ngành hàng</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Nhóm hàng</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Tên sản phẩm</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Ghi chú / Lý do</span>
              </div>
              
              <div className="mb-4 flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex-wrap">
                <span className="font-bold text-slate-700">Nếu chỉ dán 1 cột dữ liệu (không có tiêu đề), mặc định dán vào cột:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-rose-600">
                  <input
                    type="radio"
                    name="pasteDefaultCol"
                    checked={pasteDefaultCol === 'nhomHang'}
                    onChange={() => setPasteDefaultCol('nhomHang')}
                    className="accent-rose-600"
                  />
                  Nhóm hàng
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-blue-600">
                  <input
                    type="radio"
                    name="pasteDefaultCol"
                    checked={pasteDefaultCol === 'nganhHang'}
                    onChange={() => setPasteDefaultCol('nganhHang')}
                    className="accent-blue-600"
                  />
                  Ngành hàng
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-emerald-600">
                  <input
                    type="radio"
                    name="pasteDefaultCol"
                    checked={pasteDefaultCol === 'tenSanPham'}
                    onChange={() => setPasteDefaultCol('tenSanPham')}
                    className="accent-emerald-600"
                  />
                  Tên sản phẩm
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-violet-600">
                  <input
                    type="radio"
                    name="pasteDefaultCol"
                    checked={pasteDefaultCol === 'hinhThucXuat'}
                    onChange={() => setPasteDefaultCol('hinhThucXuat')}
                    className="accent-violet-600"
                  />
                  Hình thức xuất
                </label>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full flex-1 border border-slate-200 rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none whitespace-pre overflow-auto"
                placeholder="Ví dụ:&#10;Hình thức xuất&#9;Ngành hàng&#9;Nhóm hàng&#9;Tên sản phẩm&#9;Ghi chú / Lý do&#10;&#9;&#9;2513 - THU HỘ PAYOO&#9;&#9;Loại bỏ thu hộ Payoo&#10;THU HỘ&#9;&#9;&#9;&#9;Loại bỏ tất cả hình thức xuất thu hộ"
              />
              <div className="mt-4 flex justify-end gap-3">
                {draftRules.length > 0 && (
                  <button
                    onClick={() => { setIsEditingExcel(false); setError(null); }}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  onClick={handleParseExcel}
                  className="px-5 py-2.5 text-sm font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Xác nhận dữ liệu
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    placeholder="Tìm theo hình thức xuất, ngành hàng, nhóm hàng, tên sản phẩm hoặc lý do..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm dòng
                  </button>
                  <button
                    onClick={handleOpenEditExcel}
                    className="px-4 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Dán lại Excel
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100/80 text-slate-600 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 w-12">STT</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Hình thức xuất (Từ khóa)</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Ngành hàng (Từ khóa)</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Nhóm hàng (Từ khóa)</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Tên sản phẩm (Từ khóa)</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200">Ghi chú / Lý do loại bỏ</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Add New Row */}
                    {isAddingNew && (
                      <tr className="bg-rose-50/20">
                        <td className="px-4 py-3 text-slate-400 text-center">*</td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" placeholder="Hình thức xuất..." value={newForm.hinhThucXuat} onChange={e => setNewForm({...newForm, hinhThucXuat: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" placeholder="Ngành hàng..." value={newForm.nganhHang} onChange={e => setNewForm({...newForm, nganhHang: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" placeholder="Nhóm hàng..." value={newForm.nhomHang} onChange={e => setNewForm({...newForm, nhomHang: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" placeholder="Tên SP..." value={newForm.tenSanPham} onChange={e => setNewForm({...newForm, tenSanPham: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="Ghi chú..." value={newForm.note} onChange={e => setNewForm({...newForm, note: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={saveNewRow} className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded" title="Lưu">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsAddingNew(false)} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded" title="Hủy">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    
                    {filteredData.length > 0 ? (
                      filteredData.map(({ rule: row, origIdx }, idx) => {
                        const isEditingThis = editingRowIdx === origIdx;
                        return (
                          <tr key={origIdx} className={isEditingThis ? "bg-rose-50/15" : "hover:bg-slate-50 transition-colors"}>
                            <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                            
                            {isEditingThis ? (
                              <>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" value={editForm.hinhThucXuat} onChange={e => setEditForm({...editForm, hinhThucXuat: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" value={editForm.nganhHang} onChange={e => setEditForm({...editForm, nganhHang: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" value={editForm.nhomHang} onChange={e => setEditForm({...editForm, nhomHang: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase" value={editForm.tenSanPham} onChange={e => setEditForm({...editForm, tenSanPham: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={saveEditRow} className="p-1.5 bg-rose-100 text-rose-600 hover:bg-rose-200 rounded" title="Lưu">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingRowIdx(null)} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded" title="Hủy">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {row.hinhThucXuat || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {row.nganhHang || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {row.nhomHang || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">
                                  {row.tenSanPham || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {row.note || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startEditRow(row, origIdx)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors" title="Sửa">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteRow(origIdx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    ) : !isAddingNew ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p>Không có dữ liệu loại bỏ nào.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium flex justify-between items-center shrink-0">
                <span>Đang hiển thị: {filteredData.length} / {draftRules.length} quy tắc loại bỏ</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 flex justify-end gap-3 bg-white rounded-b-xl shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Đóng
          </button>
          {!isEditingExcel && draftRules.length > 0 && (
            <button
              onClick={() => {
                onSave(draftRules);
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Save className="w-5 h-5" />
              LƯU LÊN HỆ THỐNG
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
