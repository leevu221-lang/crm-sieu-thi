import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle, FileSpreadsheet, Search, Plus, Edit2, Trash2, Check } from 'lucide-react';

export interface QuyDoiRule {
  nganhHang: string;
  nhomHang: string;
  heSo: number;
  note?: string;
}

interface ConfigQuyDoiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: QuyDoiRule[]) => void;
  initialRules: QuyDoiRule[];
}

export const ConfigQuyDoiModal: React.FC<ConfigQuyDoiModalProps> = ({ isOpen, onClose, onSave, initialRules }) => {
  const [isEditingExcel, setIsEditingExcel] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Table view state
  const [searchName, setSearchName] = useState('');

  const [draftRules, setDraftRules] = useState<QuyDoiRule[]>([]);
  const [pasteDefaultCol, setPasteDefaultCol] = useState<'nganhHang' | 'nhomHang' | 'heSo'>('nhomHang');
  
  // Inline editing state
  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<QuyDoiRule>({ nganhHang: '', nhomHang: '', heSo: 1.0, note: '' });

  // Add new row state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<QuyDoiRule>({ nganhHang: '', nhomHang: '', heSo: 1.0, note: '' });

  useEffect(() => {
    if (isOpen) {
      const sanitized = (initialRules || []).map(r => ({
        nganhHang: r.nganhHang || '',
        nhomHang: r.nhomHang || '',
        heSo: typeof r.heSo === 'number' ? r.heSo : Number(r.heSo) || 1.0,
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
        (d.rule.nganhHang || '').toLowerCase().includes(s) || 
        (d.rule.nhomHang || '').toLowerCase().includes(s) || 
        String(d.rule.heSo).toLowerCase().includes(s) ||
        (d.rule.note || '').toLowerCase().includes(s);
      return matchSearch;
    });
  }, [draftRules, searchName]);

  if (!isOpen) return null;

  const handleParseExcel = () => {
    try {
      const newRules: QuyDoiRule[] = [];
      const lines = text.split('\n');
      
      let idxNganh = -1;
      let idxNhom = -1;
      let idxHeSo = -1;
      let idxNote = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split('\t').map(c => c.trim());
        
        if (i === 0 && (line.toLowerCase().includes('ngành hàng') || line.toLowerCase().includes('nhóm hàng') || line.toLowerCase().includes('hệ số') || line.toLowerCase().includes('he so'))) {
          const lowerCols = cols.map(c => c.toLowerCase());
          idxNganh = lowerCols.findIndex(c => c.includes('ngành hàng') || c.includes('nganh hang'));
          idxNhom = lowerCols.findIndex(c => c.includes('nhóm hàng') || c.includes('nhom hang'));
          idxHeSo = lowerCols.findIndex(c => c.includes('hệ số') || c.includes('he so') || c.includes('tỷ lệ') || c.includes('ty le') || c.includes('multiplier') || c.includes('factor'));
          idxNote = lowerCols.findIndex(c => c.includes('ghi chú') || c.includes('ghi chu') || c.includes('note'));
          continue;
        }

        if (idxNganh === -1 && idxNhom === -1 && idxHeSo === -1) {
          if (cols.length >= 4) {
            idxNganh = 0; idxNhom = 1; idxHeSo = 2; idxNote = 3;
          } else if (cols.length === 3) {
            idxNganh = 0; idxNhom = 1; idxHeSo = 2; idxNote = -1;
          } else if (cols.length === 2) {
            idxNganh = -1; idxNhom = 0; idxHeSo = 1; idxNote = -1;
          } else {
            if (pasteDefaultCol === 'nganhHang') {
              idxNganh = 0; idxNhom = -1; idxHeSo = -1; idxNote = -1;
            } else if (pasteDefaultCol === 'heSo') {
              idxNganh = -1; idxNhom = -1; idxHeSo = 0; idxNote = -1;
            } else {
              idxNganh = -1; idxNhom = 0; idxHeSo = -1; idxNote = -1;
            }
          }
        }

        const nganh = idxNganh !== -1 ? cols[idxNganh] || '' : '';
        const nhom = idxNhom !== -1 ? cols[idxNhom] || '' : '';
        const heSoRaw = idxHeSo !== -1 ? cols[idxHeSo] || '' : '';
        const note = idxNote !== -1 ? cols[idxNote] || '' : '';

        // Clean and parse coefficient
        let heSo = 1.0;
        if (heSoRaw) {
          const cleanVal = heSoRaw.replace(/[^0-9.,]/g, '').replace(',', '.');
          const parsed = parseFloat(cleanVal);
          if (!isNaN(parsed)) heSo = parsed;
        }

        if (nganh || nhom) {
          newRules.push({
            nganhHang: nganh.toUpperCase(),
            nhomHang: nhom.toUpperCase(),
            heSo: heSo,
            note: note
          });
        }
      }
      
      if (newRules.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra lại định dạng tab (Excel).');
      }

      setDraftRules(newRules);
      setIsEditingExcel(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
    }
  };

  const handleOpenEditExcel = () => {
    let tsv = 'Ngành hàng\tNhóm hàng\tHệ số\tGhi chú\n';
    if (draftRules.length > 0) {
      for (const rule of draftRules) {
        tsv += `${rule.nganhHang || ''}\t${rule.nhomHang || ''}\t${rule.heSo}\t${rule.note || ''}\n`;
      }
      setText(tsv.trim());
    } else {
      setText('');
    }
    setError(null);
    setIsEditingExcel(true);
  };
  
  const handleDeleteRow = (origIdx: number) => {
    if (window.confirm('Xoá quy tắc quy đổi này?')) {
      setDraftRules(prev => prev.filter((_, i) => i !== origIdx));
    }
  };

  const startEditRow = (rule: QuyDoiRule, origIdx: number) => {
    setEditingRowIdx(origIdx);
    setEditForm({ ...rule });
  };

  const saveEditRow = () => {
    if (!editForm.nganhHang.trim() && !editForm.nhomHang.trim()) {
      alert('Quy tắc phải chứa ít nhất Ngành hàng hoặc Nhóm hàng.');
      return;
    }
    const parsedHeSo = Number(editForm.heSo);
    if (isNaN(parsedHeSo)) {
      alert('Hệ số phải là một số hợp lệ.');
      return;
    }

    setDraftRules(prev => {
      const arr = [...prev];
      if (editingRowIdx !== null) {
        arr[editingRowIdx] = {
          nganhHang: editForm.nganhHang.trim().toUpperCase(),
          nhomHang: editForm.nhomHang.trim().toUpperCase(),
          heSo: parsedHeSo,
          note: editForm.note?.trim()
        };
      }
      return arr;
    });
    setEditingRowIdx(null);
  };

  const saveNewRow = () => {
    if (!newForm.nganhHang.trim() && !newForm.nhomHang.trim()) {
      alert('Quy tắc phải chứa ít nhất Ngành hàng hoặc Nhóm hàng.');
      return;
    }
    const parsedHeSo = Number(newForm.heSo);
    if (isNaN(parsedHeSo)) {
      alert('Hệ số phải là một số hợp lệ.');
      return;
    }

    setDraftRules(prev => [{
      nganhHang: newForm.nganhHang.trim().toUpperCase(),
      nhomHang: newForm.nhomHang.trim().toUpperCase(),
      heSo: parsedHeSo,
      note: newForm.note?.trim()
    }, ...prev]);
    setIsAddingNew(false);
    setNewForm({ nganhHang: '', nhomHang: '', heSo: 1.0, note: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-slate-800">Cấu hình Quy Đổi Hệ Số (Coefficients Map)</h2>
            <p className="text-xs text-slate-400 font-medium">Quy đổi doanh thu và định lượng theo từng Ngành Hàng & Nhóm Hàng</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {isEditingExcel ? (
            // Excel Paste Mode
            <div className="p-6 flex flex-col flex-1 min-h-0 space-y-4">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-semibold text-slate-600">Dán bảng tính Excel vào ô dưới đây (Ngành hàng [Tab] Nhóm hàng [Tab] Hệ số [Tab] Ghi chú)</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Nếu dòng dán chỉ có 1 cột, mặc định là:</span>
                  <select
                    value={pasteDefaultCol}
                    onChange={(e) => setPasteDefaultCol(e.target.value as any)}
                    className="p-1 border border-slate-200 rounded text-slate-700 bg-white"
                  >
                    <option value="nhomHang">Nhóm Hàng</option>
                    <option value="nganhHang">Ngành Hàng</option>
                    <option value="heSo">Hệ Số</option>
                  </select>
                </div>
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Dán dữ liệu từ Excel tại đây..."
                className="flex-1 w-full p-4 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none min-h-0"
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-between shrink-0">
                <button
                  onClick={() => setIsEditingExcel(false)}
                  className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Quay lại danh sách
                </button>
                <button
                  onClick={handleParseExcel}
                  className="px-6 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  PHÂN TÍCH VÀ CẬP NHẬT
                </button>
              </div>
            </div>
          ) : (
            // Table view mode
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between shrink-0 bg-slate-50/50">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Tìm kiếm quy tắc quy đổi..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm Dòng
                  </button>
                  <button
                    onClick={handleOpenEditExcel}
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Nhập/Xuất Excel
                  </button>
                </div>
              </div>

              {/* Table wrapper */}
              <div className="flex-1 overflow-auto min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/70 sticky top-0 text-[11px] font-black text-slate-500 uppercase tracking-wider z-10">
                      <th className="px-4 py-3 w-16 text-center">STT</th>
                      <th className="px-4 py-3">Ngành Hàng</th>
                      <th className="px-4 py-3">Nhóm Hàng</th>
                      <th className="px-4 py-3 w-28 text-center">Hệ Số</th>
                      <th className="px-4 py-3">Ghi Chú</th>
                      <th className="px-4 py-3 w-28 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {/* Add new row inline */}
                    {isAddingNew && (
                      <tr className="bg-emerald-50/50">
                        <td className="px-4 py-3 text-center text-emerald-600 font-bold">New</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={newForm.nganhHang}
                            onChange={(e) => setNewForm(prev => ({ ...prev, nganhHang: e.target.value }))}
                            placeholder="Ngành hàng..."
                            className="w-full p-1.5 border border-slate-200 rounded bg-white font-bold text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={newForm.nhomHang}
                            onChange={(e) => setNewForm(prev => ({ ...prev, nhomHang: e.target.value }))}
                            placeholder="Nhóm hàng..."
                            className="w-full p-1.5 border border-slate-200 rounded bg-white font-bold text-slate-800"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="number"
                              step="0.01"
                              value={newForm.heSo}
                              onChange={(e) => setNewForm(prev => ({ ...prev, heSo: parseFloat(e.target.value) || 0 }))}
                              placeholder="Hệ số..."
                              className="w-full p-1.5 pr-6 border border-slate-200 rounded bg-white font-bold text-center text-slate-800"
                            />
                            <span className="absolute right-2 text-slate-400 font-bold select-none">%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={newForm.note}
                            onChange={(e) => setNewForm(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Ghi chú..."
                            className="w-full p-1.5 border border-slate-200 rounded bg-white text-slate-700"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={saveNewRow} className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded" title="Lưu">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setIsAddingNew(false)} className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded" title="Hủy">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Rules list */}
                    {filteredData.length > 0 ? (
                      filteredData.map(({ rule, origIdx }, index) => {
                        const isEditing = editingRowIdx === origIdx;
                        return (
                          <tr key={origIdx} className={`${isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'} transition-colors`}>
                            <td className="px-4 py-3 text-center text-slate-400 font-medium">{index + 1}</td>
                            {isEditing ? (
                              <>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={editForm.nganhHang}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, nganhHang: e.target.value }))}
                                    className="w-full p-1.5 border border-slate-300 rounded bg-white font-bold text-slate-800"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={editForm.nhomHang}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, nhomHang: e.target.value }))}
                                    className="w-full p-1.5 border border-slate-300 rounded bg-white font-bold text-slate-800"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="relative flex items-center justify-center">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editForm.heSo}
                                      onChange={(e) => setEditForm(prev => ({ ...prev, heSo: parseFloat(e.target.value) || 0 }))}
                                      className="w-full p-1.5 pr-6 border border-slate-300 rounded bg-white font-bold text-center text-slate-800"
                                    />
                                    <span className="absolute right-2 text-slate-400 font-bold select-none">%</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={editForm.note}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                                    className="w-full p-1.5 border border-slate-300 rounded bg-white text-slate-700"
                                  />
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button onClick={saveEditRow} className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded" title="Lưu">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setEditingRowIdx(null)} className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded" title="Hủy">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-slate-800 font-bold">
                                  {rule.nganhHang || <span className="text-slate-300 font-normal">TẤT CẢ NGÀNH HÀNG</span>}
                                </td>
                                <td className="px-4 py-3 text-slate-800 font-bold">
                                  {rule.nhomHang || <span className="text-slate-300 font-normal">TẤT CẢ NHÓM HÀNG</span>}
                                </td>
                                <td className="px-4 py-3 text-center text-indigo-600 font-extrabold text-[13px] bg-slate-50/20">
                                  {rule.heSo}%
                                </td>
                                <td className="px-4 py-3 text-slate-500">
                                  {rule.note || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => startEditRow(rule, origIdx)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Sửa">
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
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p>Không có dữ liệu quy đổi nào.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium flex justify-between items-center shrink-0">
                <span>Đang hiển thị: {filteredData.length} / {draftRules.length} quy tắc quy đổi</span>
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
              className="px-6 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
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
