import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, AlertTriangle, FileSpreadsheet, Search, Filter, Plus, Edit2, Trash2, Check } from 'lucide-react';

interface ConfigNhomHangModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (map: Record<string, { nganhHang?: string, large: string, small: string }>) => void;
  initialMap: Record<string, { nganhHang?: string, large: string, small: string }>;
}

export const ConfigNhomHangModal: React.FC<ConfigNhomHangModalProps> = ({ isOpen, onClose, onSave, initialMap }) => {
  const [isEditingExcel, setIsEditingExcel] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Table view state
  const [searchNhom, setSearchNhom] = useState('');
  const [filterLarge, setFilterLarge] = useState<string>('ALL');
  const [filterSmall, setFilterSmall] = useState<string>('ALL');

  const [draftMap, setDraftMap] = useState<Record<string, { nganhHang?: string, large: string, small: string }>>({});
  
  // Inline editing state
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nhomHang: '', nganhHang: '', large: '', small: '' });

  // Add new row state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ nhomHang: '', nganhHang: '', large: '', small: '' });

  useEffect(() => {
    if (isOpen) {
      setDraftMap(initialMap || {});
      if (Object.keys(initialMap || {}).length === 0) {
        setIsEditingExcel(true);
      } else {
        setIsEditingExcel(false);
      }
      setError(null);
      setEditingRowKey(null);
      setIsAddingNew(false);
    }
  }, [isOpen, initialMap]);

  // Derived data for table
  const tableData = useMemo(() => {
    return Object.entries(draftMap).map(([nhomHang, data]) => ({
      nhomHang,
      ...data
    }));
  }, [draftMap]);

  const uniqueLarge = useMemo(() => {
    const set = new Set(tableData.map(d => d.large));
    return Array.from(set).sort();
  }, [tableData]);

  const uniqueSmall = useMemo(() => {
    const set = new Set(tableData.map(d => d.small));
    return Array.from(set).sort();
  }, [tableData]);

  const filteredData = useMemo(() => {
    return tableData.filter(d => {
      const matchSearch = d.nhomHang.toLowerCase().includes(searchNhom.toLowerCase());
      const matchLarge = filterLarge === 'ALL' || d.large === filterLarge;
      const matchSmall = filterSmall === 'ALL' || d.small === filterSmall;
      return matchSearch && matchLarge && matchSmall;
    });
  }, [tableData, searchNhom, filterLarge, filterSmall]);

  if (!isOpen) return null;

  const handleParseExcel = () => {
    try {
      const newMap: Record<string, { nganhHang?: string, large: string, small: string }> = {};
      const lines = text.split('\n');
      let hasData = false;

      let idxNganh = -1;
      let idxNhom = -1;
      let idxLarge = -1;
      let idxSmall = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = line.split('\t').map(c => c.trim());
        
        if (i === 0 && (line.toLowerCase().includes('nhóm hàng') || line.toLowerCase().includes('ngành hàng'))) {
          const lowerCols = cols.map(c => c.toLowerCase());
          idxNganh = lowerCols.findIndex(c => c === 'ngành hàng' || c === 'nganh hang');
          idxNhom = lowerCols.findIndex(c => c === 'nhóm hàng' || c === 'nhom hang');
          idxLarge = lowerCols.findIndex(c => c.includes('ngành hàng lớn') || c.includes('nganh hang lon') || c.includes('ngành hàng lón'));
          idxSmall = lowerCols.findIndex(c => c.includes('nhóm hàng nhỏ') || c.includes('nhom hang nho'));
          continue;
        }

        if (idxNhom === -1) {
          if (cols.length >= 4) {
            idxNganh = 0; idxNhom = 1; idxLarge = 2; idxSmall = 3;
          } else if (cols.length === 3) {
            idxNganh = -1; idxNhom = 0; idxLarge = 1; idxSmall = 2;
          } else {
            throw new Error(`Dòng ${i + 1} không đủ số lượng cột.`);
          }
        }

        const nganhHang = idxNganh !== -1 ? cols[idxNganh] || '' : '';
        const nhomHang = cols[idxNhom] || '';
        const nhomLarge = cols[idxLarge] || '';
        const nhomSmall = cols[idxSmall] || '';

        if (nhomHang) {
          newMap[nhomHang.toUpperCase()] = {
            nganhHang: nganhHang,
            large: nhomLarge.toUpperCase(),
            small: nhomSmall.toUpperCase()
          };
          hasData = true;
        }
      }
      
      if (!hasData && Object.keys(newMap).length === 0) {
        throw new Error('Không tìm thấy dữ liệu hợp lệ.');
      }

      setDraftMap(newMap);
      setIsEditingExcel(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý dữ liệu.');
    }
  };

  const handleOpenEditExcel = () => {
    let tsv = 'Ngành hàng\tNhóm hàng\tNgành hàng LỚN\tNhóm hàng NHỎ\n';
    const keys = Object.keys(draftMap);
    if (keys.length > 0) {
      for (const key of keys) {
        const val = draftMap[key];
        tsv += `${val.nganhHang || ''}\t${key}\t${val.large}\t${val.small}\n`;
      }
      setText(tsv.trim());
    } else {
      setText('');
    }
    setError(null);
    setIsEditingExcel(true);
  };
  
  const handleDeleteRow = (key: string) => {
    if (window.confirm(`Xoá quy tắc của Nhóm hàng "${key}"?`)) {
      setDraftMap(prev => {
        const newMap = { ...prev };
        delete newMap[key];
        return newMap;
      });
    }
  };

  const startEditRow = (row: any) => {
    setEditingRowKey(row.nhomHang);
    setEditForm({
      nhomHang: row.nhomHang,
      nganhHang: row.nganhHang || '',
      large: row.large,
      small: row.small || ''
    });
  };

  const saveEditRow = () => {
    if (!editForm.nhomHang.trim()) {
      alert('Tên Nhóm hàng không được để trống.');
      return;
    }
    const newKey = editForm.nhomHang.trim().toUpperCase();
    
    setDraftMap(prev => {
      const newMap = { ...prev };
      if (editingRowKey && editingRowKey !== newKey) {
        delete newMap[editingRowKey];
      }
      newMap[newKey] = {
        nganhHang: editForm.nganhHang,
        large: editForm.large.toUpperCase(),
        small: editForm.small.toUpperCase()
      };
      return newMap;
    });
    setEditingRowKey(null);
  };

  const saveNewRow = () => {
    if (!newForm.nhomHang.trim()) {
      alert('Tên Nhóm hàng không được để trống.');
      return;
    }
    const newKey = newForm.nhomHang.trim().toUpperCase();
    
    if (draftMap[newKey]) {
      alert('Nhóm hàng này đã tồn tại!');
      return;
    }

    setDraftMap(prev => ({
      ...prev,
      [newKey]: {
        nganhHang: newForm.nganhHang,
        large: newForm.large.toUpperCase(),
        small: newForm.small.toUpperCase()
      }
    }));
    setIsAddingNew(false);
    setNewForm({ nhomHang: '', nganhHang: '', large: '', small: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] min-h-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-black text-slate-800">Cấu hình phân loại Nhóm Hàng (DATA YCX)</h2>
            <p className="text-sm text-slate-500 mt-1">
              Quản lý danh sách quy đổi Nhóm hàng sang Ngành hàng LỚN và Nhóm hàng NHỎ
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
              <div className="mb-4 text-sm text-slate-600 font-medium flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Dán nội dung từ Excel/Google Sheets vào đây. Cấu trúc các cột BẮT BUỘC:</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Ngành hàng</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Nhóm hàng</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Ngành hàng LỚN</span>
                <span className="bg-slate-100 px-2 py-1 rounded-md font-mono text-xs border border-slate-200">Nhóm hàng NHỎ</span>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full flex-1 border border-slate-200 rounded-xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none whitespace-pre overflow-auto"
                placeholder="Ví dụ:&#10;Ngành hàng&#9;Nhóm hàng&#9;Ngành hàng LỚN&#9;Nhóm hàng NHỎ&#10;1754 - Máy lạnh&#9;1098 - Máy lạnh (IMEI)&#9;CE&#9;ML"
              />
              <div className="mt-4 flex justify-end gap-3">
                {Object.keys(draftMap).length > 0 && (
                  <button
                    onClick={() => { setIsEditingExcel(false); setError(null); }}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  onClick={handleParseExcel}
                  className="px-5 py-2.5 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
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
                    value={searchNhom}
                    onChange={e => setSearchNhom(e.target.value)}
                    placeholder="Tìm tên Nhóm hàng..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filterLarge}
                    onChange={e => setFilterLarge(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 max-w-[200px] truncate"
                  >
                    <option value="ALL">Tất cả Ngành hàng LỚN</option>
                    {uniqueLarge.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={filterSmall}
                    onChange={e => setFilterSmall(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 max-w-[200px] truncate"
                  >
                    <option value="ALL">Tất cả Nhóm hàng NHỎ</option>
                    {uniqueSmall.map(s => (
                      <option key={s} value={s}>{s || '(Trống)'}</option>
                    ))}
                  </select>
                </div>
                
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm dòng
                  </button>
                  <button
                    onClick={handleOpenEditExcel}
                    className="px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-2"
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
                      <th className="px-4 py-3 font-bold border-b border-slate-200 w-16">STT</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 w-1/4">Ngành hàng</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 w-1/3">Nhóm hàng</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 text-center w-1/5">Ngành hàng LỚN</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 text-center w-1/5">Nhóm hàng NHỎ</th>
                      <th className="px-4 py-3 font-bold border-b border-slate-200 text-center w-24">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Add New Row */}
                    {isAddingNew && (
                      <tr className="bg-blue-50/50">
                        <td className="px-4 py-3 text-slate-400 text-center">*</td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="Ngành hàng..." value={newForm.nganhHang} onChange={e => setNewForm({...newForm, nganhHang: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded" placeholder="Nhóm hàng..." value={newForm.nhomHang} onChange={e => setNewForm({...newForm, nhomHang: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase" placeholder="LỚN..." value={newForm.large} onChange={e => setNewForm({...newForm, large: e.target.value})} />
                        </td>
                        <td className="px-4 py-2">
                          <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase" placeholder="NHỎ..." value={newForm.small} onChange={e => setNewForm({...newForm, small: e.target.value})} />
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
                      filteredData.map((row, idx) => {
                        const isEditingThis = editingRowKey === row.nhomHang;
                        return (
                          <tr key={row.nhomHang} className={isEditingThis ? "bg-indigo-50/30" : "hover:bg-slate-50 transition-colors"}>
                            <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                            
                            {isEditingThis ? (
                              <>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded" value={editForm.nganhHang} onChange={e => setEditForm({...editForm, nganhHang: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded" value={editForm.nhomHang} onChange={e => setEditForm({...editForm, nhomHang: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase" value={editForm.large} onChange={e => setEditForm({...editForm, large: e.target.value})} />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="text" className="w-full px-2 py-1 border border-slate-200 rounded text-center uppercase" value={editForm.small} onChange={e => setEditForm({...editForm, small: e.target.value})} />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={saveEditRow} className="p-1.5 bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded" title="Lưu">
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setEditingRowKey(null)} className="p-1.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded" title="Hủy">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-4 py-3 text-slate-600">
                                  {row.nganhHang || <span className="text-slate-300">-</span>}
                                </td>
                                <td className="px-4 py-3 font-bold text-slate-700">{row.nhomHang}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-md text-xs">
                                    {row.large}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {row.small ? (
                                    <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 font-bold rounded-md text-xs">
                                      {row.small}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2 opacity-0 hover:opacity-100 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                                    <button onClick={() => startEditRow(row)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Sửa">
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteRow(row.nhomHang)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Xóa">
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
                            <p>Không có dữ liệu phù hợp với bộ lọc.</p>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 font-medium flex justify-between items-center shrink-0">
                <span>Đang hiển thị: {filteredData.length} / {tableData.length} nhóm hàng</span>
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
          {!isEditingExcel && Object.keys(draftMap).length > 0 && (
            <button
              onClick={() => {
                onSave(draftMap);
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
