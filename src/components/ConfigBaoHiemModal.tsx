import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle, FileSpreadsheet, Search, Filter, Edit2, Trash2, Check, Plus } from 'lucide-react';

export interface BaoHiemRule {
  maSanPham: string;
  tenSanPham: string;
  phanLoai: string;
  nganhHangLon?: string;
  nhomHangNho?: string;
}

interface ConfigBaoHiemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rules: BaoHiemRule[]) => void;
  initialRules: BaoHiemRule[];
}

export const ConfigBaoHiemModal: React.FC<ConfigBaoHiemModalProps> = ({ isOpen, onClose, onSave, initialRules }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Table view state
  const [searchName, setSearchName] = useState('');
  const [filterPhanLoai, setFilterPhanLoai] = useState<string>('ALL');

  const [draftRules, setDraftRules] = useState<BaoHiemRule[]>([]);

  const [editingRowIdx, setEditingRowIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<BaoHiemRule>({ maSanPham: '', tenSanPham: '', phanLoai: '', nganhHangLon: '', nhomHangNho: '' });
  
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<BaoHiemRule>({ maSanPham: '', tenSanPham: '', phanLoai: '', nganhHangLon: '', nhomHangNho: '' });

  useEffect(() => {
    if (isOpen) {
      setDraftRules(initialRules || []);
      if (!initialRules || initialRules.length === 0) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
      setError(null);
    }
  }, [isOpen, initialRules]);

  const uniquePhanLoai = useMemo(() => {
    const set = new Set(draftRules.map(d => d.phanLoai));
    return Array.from(set).filter(Boolean).sort();
  }, [draftRules]);

  const filteredData = useMemo(() => {
    return draftRules.map((rule, origIdx) => ({ rule, origIdx })).filter(d => {
      const matchSearch = d.rule.tenSanPham.toLowerCase().includes(searchName.toLowerCase()) || d.rule.maSanPham.toLowerCase().includes(searchName.toLowerCase());
      const matchPhanLoai = filterPhanLoai === 'ALL' || d.rule.phanLoai === filterPhanLoai;
      return matchSearch && matchPhanLoai;
    });
  }, [draftRules, searchName, filterPhanLoai]);

  const handleDeleteRow = (origIdx: number) => {
    if (window.confirm('Xoá quy tắc này?')) {
      setDraftRules(prev => prev.filter((_, i) => i !== origIdx));
    }
  };

  const startEditRow = (rule: BaoHiemRule, origIdx: number) => {
    setEditingRowIdx(origIdx);
    setEditForm({ ...rule });
  };

  const saveEditRow = () => {
    if (!editForm.tenSanPham.trim() && !editForm.maSanPham.trim()) {
      alert('Phải có ít nhất Mã sản phẩm hoặc Tên sản phẩm.');
      return;
    }
    setDraftRules(prev => {
      const arr = [...prev];
      if (editingRowIdx !== null) {
        arr[editingRowIdx] = {
          maSanPham: editForm.maSanPham.trim(),
          tenSanPham: editForm.tenSanPham.trim().toUpperCase(),
          phanLoai: editForm.phanLoai.trim().toUpperCase(),
          nganhHangLon: editForm.nganhHangLon?.trim().toUpperCase(),
          nhomHangNho: editForm.nhomHangNho?.trim().toUpperCase(),
        };
      }
      return arr;
    });
    setEditingRowIdx(null);
  };

  const saveNewRow = () => {
    if (!newForm.tenSanPham.trim() && !newForm.maSanPham.trim()) {
      alert('Phải có ít nhất Mã sản phẩm hoặc Tên sản phẩm.');
      return;
    }
    setDraftRules(prev => [{
      maSanPham: newForm.maSanPham.trim(),
      tenSanPham: newForm.tenSanPham.trim().toUpperCase(),
      phanLoai: newForm.phanLoai.trim().toUpperCase(),
      nganhHangLon: newForm.nganhHangLon?.trim().toUpperCase(),
      nhomHangNho: newForm.nhomHangNho?.trim().toUpperCase(),
    }, ...prev]);
    setIsAddingNew(false);
    setNewForm({ maSanPham: '', tenSanPham: '', phanLoai: '', nganhHangLon: '', nhomHangNho: '' });
  };

  if (!isOpen) return null;

  const handleParseExcel = () => {
    try {
      const newRules: BaoHiemRule[] = [];
      const lines = text.split('\n');
      
      let idxMa = -1;
      let idxTen = -1;
      let idxLoai = -1;
      let idxNganh = -1;
      let idxNhom = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split('\t').map(c => c.trim());
        
        if (i === 0 && (line.toLowerCase().includes('mã sản phẩm') || line.toLowerCase().includes('tên sản phẩm'))) {
          const lowerCols = cols.map(c => c.toLowerCase());
          idxMa = lowerCols.findIndex(c => c === 'mã sản phẩm' || c === 'ma san pham' || c === 'mã');
          idxTen = lowerCols.findIndex(c => c.includes('tên sản phẩm') || c.includes('ten san pham') || c === 'tên hàng' || c === 'tên');
          idxLoai = lowerCols.findIndex(c => c.includes('phân loại') || c.includes('nhóm hàng') || c.includes('ngành hàng') || c === 'loại');
          idxNganh = lowerCols.findIndex(c => c.includes('ngành hàng lớn') || c.includes('nganh hang lon'));
          idxNhom = lowerCols.findIndex(c => c.includes('nhóm hàng nhỏ') || c.includes('nhom hang nho'));
          continue;
        }

        if (idxTen === -1 && idxLoai === -1) {
          if (cols.length >= 5) {
            idxMa = 0; idxTen = 1; idxLoai = 2; idxNganh = 3; idxNhom = 4;
          } else if (cols.length >= 3) {
            idxMa = 0; idxTen = 1; idxLoai = 2;
          } else if (cols.length === 2) {
            // Assume Tên sản phẩm and Phân loại
            idxMa = -1; idxTen = 0; idxLoai = 1;
          } else {
            throw new Error(`Dòng ${i + 1} không đủ số lượng cột.`);
          }
        }

        const ma = idxMa !== -1 ? cols[idxMa] || '' : '';
        const ten = idxTen !== -1 ? cols[idxTen] || '' : '';
        const loai = idxLoai !== -1 ? cols[idxLoai] || '' : '';
        const nganh = idxNganh !== -1 ? cols[idxNganh] || '' : '';
        const nhom = idxNhom !== -1 ? cols[idxNhom] || '' : '';

        if (ma || ten) {
          newRules.push({
            maSanPham: ma,
            tenSanPham: ten.toUpperCase(),
            phanLoai: loai.toUpperCase(),
            nganhHangLon: nganh.toUpperCase(),
            nhomHangNho: nhom.toUpperCase()
          });
        }
      }
      
      if (newRules.length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ.');
      }

      setDraftRules(newRules);
      setIsEditing(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
    }
  };

  const handleOpenEdit = () => {
    let tsv = 'Mã sản phẩm\tTên sản phẩm\tPhân loại\tNgành hàng LỚN\tNhóm hàng NHỎ\n';
    if (draftRules.length > 0) {
      for (const rule of draftRules) {
        tsv += `${rule.maSanPham}\t${rule.tenSanPham}\t${rule.phanLoai}\t${rule.nganhHangLon || ''}\t${rule.nhomHangNho || ''}\n`;
      }
      setText(tsv.trim());
    } else {
      setText('');
    }
    setError(null);
    setIsEditing(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-slate-800">Cấu hình phân loại Bảo Hiểm & VAS</h2>
            <p className="text-sm text-slate-500 mt-1">
              Quy định từ khóa Tên sản phẩm hoặc Mã sản phẩm để nhận diện các gói Bảo hiểm, VAS (1 ĐỔI 1, BHMR, BHRV...)
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

          {isEditing ? (
            <div className="flex-1 flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="mb-4 text-sm text-slate-600 font-medium flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <span>Dán nội dung từ Excel/Google Sheets vào đây. Cấu trúc các cột BẮT BUỘC:</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Mã sản phẩm</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Tên sản phẩm</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Phân loại</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Ngành hàng LỚN</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Nhóm hàng NHỎ</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full flex-1 border border-slate-200 rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none whitespace-pre overflow-auto"
                placeholder="Ví dụ:&#10;Mã sản phẩm&#9;Tên sản phẩm&#9;Phân loại&#9;Ngành hàng LỚN&#9;Nhóm hàng NHỎ&#10;&#9;BẢO VỆ MÀN HÌNH&#9;BVMH&#9;BẢO HIỂM&#9;BVMH"
              />
              <div className="mt-4 flex justify-end gap-3">
                {draftRules.length > 0 && (
                  <button
                    onClick={() => { setIsEditing(false); setError(null); }}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  onClick={handleParseExcel}
                  className="px-5 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
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
                <div className="flex-1 min-w-[300px] relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={e => setSearchName(e.target.value)}
                    placeholder="Tìm tên hoặc mã sản phẩm..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filterPhanLoai}
                    onChange={e => setFilterPhanLoai(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700 max-w-[200px] truncate"
                  >
                    <option value="ALL">Tất cả Phân loại</option>
                    {uniquePhanLoai.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm dòng
                  </button>
                  <button
                    onClick={handleOpenEdit}
                    className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-2"
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
                      <th className="px-6 py-3 font-bold border-b border-slate-200">STT</th>
                      <th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Mã sản phẩm</th>
                      <th className="px-6 py-3 font-bold border-b border-slate-200">Tên sản phẩm (Từ khóa)</th>
                      <th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Phân loại</th>
                      <th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Ngành hàng LỚN</th>
                      <th className="px-6 py-3 font-bold border-b border-slate-200 text-center">Nhóm hàng NHỎ</th>
                      <th className="px-6 py-3 font-bold border-b border-slate-200 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Add New Row */}
                    {isAddingNew && (
                      <tr className="bg-blue-50/50">
                        <td className="px-4 py-3 text-slate-400 text-center">*</td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center font-mono text-sm" placeholder="Mã..." value={newForm.maSanPham} onChange={e => setNewForm({...newForm, maSanPham: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase text-sm" placeholder="Tên sản phẩm..." value={newForm.tenSanPham} onChange={e => setNewForm({...newForm, tenSanPham: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase text-sm" placeholder="Phân loại..." value={newForm.phanLoai} onChange={e => setNewForm({...newForm, phanLoai: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase text-sm" placeholder="LỚN..." value={newForm.nganhHangLon || ''} onChange={e => setNewForm({...newForm, nganhHangLon: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase text-sm" placeholder="NHỎ..." value={newForm.nhomHangNho || ''} onChange={e => setNewForm({...newForm, nhomHangNho: e.target.value})} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={saveNewRow} className="p-1.5 bg-blue-100 text-blue-600 hover:bg-blue-200 rounded" title="Lưu">
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
                          <tr key={origIdx} className={isEditingThis ? "bg-indigo-50/30" : "hover:bg-slate-50 transition-colors"}>
                            <td className="px-6 py-3 text-slate-400 font-medium">{idx + 1}</td>
                            
                            {isEditingThis ? (
                              <>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center font-mono text-sm" value={editForm.maSanPham} onChange={e => setEditForm({...editForm, maSanPham: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded uppercase text-sm" value={editForm.tenSanPham} onChange={e => setEditForm({...editForm, tenSanPham: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase text-sm" value={editForm.phanLoai} onChange={e => setEditForm({...editForm, phanLoai: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase text-sm" value={editForm.nganhHangLon || ''} onChange={e => setEditForm({...editForm, nganhHangLon: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase text-sm" value={editForm.nhomHangNho || ''} onChange={e => setEditForm({...editForm, nhomHangNho: e.target.value})} />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={saveEditRow} className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded" title="Lưu">
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
                                <td className="px-6 py-3 text-center">
                                  {row.maSanPham ? (
                                    <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 font-bold">{row.maSanPham}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-700">
                                  {row.tenSanPham || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-700 text-center">
                                  {row.phanLoai ? (
                                    <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 font-black rounded-md text-xs border border-amber-200">
                                      {row.phanLoai}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-700 text-center">
                                  {row.nganhHangLon ? (
                                    <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs">{row.nganhHangLon}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-700 text-center">
                                  {row.nhomHangNho ? (
                                    <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-md text-xs">{row.nhomHangNho}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                                    <button onClick={() => startEditRow(row, origIdx)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Sửa">
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
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <p>Không có dữ liệu phù hợp với bộ lọc.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium flex justify-between items-center shrink-0">
                <span>Đang hiển thị: {filteredData.length} / {draftRules.length} quy tắc</span>
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
          {!isEditing && draftRules.length > 0 && (
            <button
              onClick={() => {
                onSave(draftRules);
                onClose();
              }}
              className="px-6 py-2.5 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
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
