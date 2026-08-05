import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, X, Search, Filter, CheckSquare, Square } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as htmlToImage from 'html-to-image';
import { useNotification } from '../contexts/NotificationContext';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

// Helper component for column filter dropdown
const ColumnFilter = ({ 
  colIdx, 
  data, 
  activeFilters, 
  onFilterChange 
}: { 
  colIdx: number, 
  data: any[][], 
  activeFilters: Set<string>, 
  onFilterChange: (colIdx: number, selected: Set<string>) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get unique values for this column
  const uniqueValues = useMemo(() => {
    const vals = new Set<string>();
    data.forEach(row => {
      const val = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : '';
      if (val.trim()) vals.add(val.trim());
    });
    return Array.from(vals).sort();
  }, [data, colIdx]);

  const filteredValues = useMemo(() => {
    return uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()));
  }, [uniqueValues, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = (val: string) => {
    const newSelected = new Set(activeFilters);
    if (newSelected.has(val)) {
      newSelected.delete(val);
    } else {
      newSelected.add(val);
    }
    onFilterChange(colIdx, newSelected);
  };

  const selectAll = () => {
    const newSelected = new Set(activeFilters);
    filteredValues.forEach(v => newSelected.add(v));
    onFilterChange(colIdx, newSelected);
  };

  const clearAll = () => {
    const newSelected = new Set(activeFilters);
    filteredValues.forEach(v => newSelected.delete(v));
    onFilterChange(colIdx, newSelected);
  };

  const isActive = activeFilters.size > 0;

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md border text-xs font-bold transition-colors ${
          isActive 
            ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
            : 'bg-white border-emerald-100 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
        }`}
      >
        <span className="truncate max-w-[80px]">
          {isActive ? `${activeFilters.size} đã chọn` : 'Lọc...'}
        </span>
        <Filter size={12} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-left left-0">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm giá trị..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={selectAll} className="flex-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 py-1 rounded-md hover:bg-emerald-200">
                CHỌN TẤT CẢ
              </button>
              <button onClick={clearAll} className="flex-1 text-[10px] font-bold bg-rose-100 text-rose-700 py-1 rounded-md hover:bg-rose-200">
                BỎ CHỌN
              </button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredValues.length > 0 ? (
              filteredValues.map(val => (
                <div 
                  key={val} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(val);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer select-none"
                >
                  {activeFilters.has(val) ? (
                    <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Square size={16} className="text-slate-300 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-700 truncate">{val}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 italic">
                Không tìm thấy giá trị
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ExcelViewer = () => {
  const [data, setData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  
  // filters map column index to a Set of selected string values
  const [filters, setFilters] = useState<Record<number, Set<string>>>({});
  
  const [isExporting, setIsExporting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        
        if (jsonData.length > 0) {
          // Find first non-empty row to use as headers
          let headerRowIdx = 0;
          for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')) {
              headerRowIdx = i;
              break;
            }
          }
          
          const rawHeaders = jsonData[headerRowIdx] || [];
          const rawData = jsonData.slice(headerRowIdx + 1);
          
          // 1. Filter out completely empty rows
          const nonEmptyRows = rawData.filter(row => row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));

          // 2. Filter out completely empty columns (columns with no data in any row)
          const colCount = Math.max(rawHeaders.length, ...nonEmptyRows.map(r => r.length));
          const colIndicesToKeep = Array.from({ length: colCount }, (_, i) => i).filter(colIdx => {
             return nonEmptyRows.some(row => row[colIdx] !== undefined && row[colIdx] !== null && String(row[colIdx]).trim() !== '');
          });

          // 3. Rebuild headers and data with only kept columns
          const finalHeaders = colIndicesToKeep.map(idx => rawHeaders[idx] ? String(rawHeaders[idx]).trim() : `CỘT ${idx + 1}`);
          const finalData = nonEmptyRows.map(row => colIndicesToKeep.map(idx => row[idx]));
          
          setHeaders(finalHeaders);
          setData(finalData);
          setFilters({});
          showNotification('Đọc file thành công!', 'success');
        } else {
          showNotification('File Excel trống', 'error');
        }
      } catch (err) {
        console.error(err);
        showNotification('Có lỗi khi đọc file Excel', 'error');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilterChange = (colIdx: number, selected: Set<string>) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (selected.size === 0) {
        delete newFilters[colIdx];
      } else {
        newFilters[colIdx] = selected;
      }
      return newFilters;
    });
  };

  const deleteColumn = (colIdxToRemove: number) => {
    setHeaders(prev => prev.filter((_, idx) => idx !== colIdxToRemove));
    setData(prev => prev.map(row => row.filter((_, idx) => idx !== colIdxToRemove)));
    setFilters(prev => {
      const newFilters: Record<number, Set<string>> = {};
      Object.keys(prev).forEach(key => {
        const idx = Number(key);
        if (idx < colIdxToRemove) {
          newFilters[idx] = prev[idx];
        } else if (idx > colIdxToRemove) {
          newFilters[idx - 1] = prev[idx];
        }
      });
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({});
  };

  const filteredData = useMemo(() => {
    const activeFilterCols = Object.keys(filters).map(Number);
    if (activeFilterCols.length === 0) return data;
    
    return data.filter(row => {
      return activeFilterCols.every(colIdx => {
        const selectedVals = filters[colIdx];
        if (!selectedVals || selectedVals.size === 0) return true;
        
        const cellValue = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : '';
        return selectedVals.has(cellValue);
      });
    });
  }, [data, filters]);

  const exportImage = async () => {
    if (tableRef.current) {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        showNotification('Đang tạo ảnh, vui lòng đợi...', 'info');
        
        tableRef.current.classList.add('export-short-mode');
        const originalWidth = tableRef.current.style.width;
        tableRef.current.style.width = 'max-content';
        
        // Give DOM time to update
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const imgData = await htmlToImage.toPng(tableRef.current, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          style: {
            transform: 'scale(1)',
            transformOrigin: 'top left'
          }
        });
        
        tableRef.current.style.width = originalWidth;
        tableRef.current.classList.remove('export-short-mode');
        
        // Show in popup instead of downloading
        setPreviewImage(imgData);
        
      } catch (err) {
        console.error('Failed to export image', err);
        showNotification('Lỗi khi xuất ảnh', 'error');
      } finally {
        if (tableRef.current) {
          tableRef.current.classList.remove('export-short-mode');
        }
        setIsExporting(false);
      }
    }
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="min-h-[100dvh] w-full bg-slate-50 relative">
      <ImagePreviewModal previewImage={previewImage} setPreviewImage={setPreviewImage} />
      
      <div className="w-full flex flex-col p-4 pb-32">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">XEM FILE EXCEL</h1>
              <p className="text-slate-500 text-sm font-medium">Đọc và lọc dữ liệu từ file Excel trực tiếp trên trình duyệt</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md shadow-slate-200 whitespace-nowrap"
            >
              <Upload size={18} />
              CHỌN FILE
            </button>
            {data.length > 0 && (
              <button
                onClick={exportImage}
                disabled={isExporting}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md whitespace-nowrap ${isExporting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white`}
              >
                <Download size={18} />
                {isExporting ? 'ĐANG TẠO...' : 'XUẤT ẢNH'}
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        {data.length > 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {/* Header info */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700 truncate max-w-[200px] sm:max-w-md">{fileName}</span>
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold">
                  {filteredData.length} dòng
                </span>
              </div>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="text-xs font-bold text-rose-600 bg-rose-100 px-3 py-1.5 rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-1"
                >
                  <X size={14} /> <span className="hidden sm:inline">XÓA BỘ LỌC</span>
                </button>
              )}
            </div>

            {/* Table Area */}
            <div className="w-full overflow-x-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div ref={tableRef} className="bg-white p-8 w-full inline-block min-w-full">
                <table className="w-full border-collapse font-sans text-[14px]">
                  <thead>
                    {/* Main Header Row */}
                    <tr>
                      {headers.map((header, idx) => (
                        <th 
                          key={`header-${idx}`} 
                          style={{ backgroundColor: '#10b981', fontFamily: "'Inter', sans-serif", fontWeight: 900 }} 
                          className="px-3 py-3 text-center text-slate-900 border-r border-b border-white uppercase whitespace-nowrap group relative"
                        >
                          <div className="flex items-center justify-between gap-2 min-w-[60px]">
                            <span className="flex-1">{header}</span>
                            {!isExporting && (
                              <button 
                                onClick={() => deleteColumn(idx)}
                                className="text-emerald-800 hover:text-white hover:bg-rose-500 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="Xóa cột này"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                    {/* Filter Row */}
                    {!isExporting && (
                      <tr>
                        {headers.map((_, idx) => (
                          <th key={`filter-${idx}`} className="p-2 border-r border-b border-white bg-[#10b981]">
                            <ColumnFilter 
                              colIdx={idx} 
                              data={data} 
                              activeFilters={filters[idx] || new Set()} 
                              onFilterChange={handleFilterChange} 
                            />
                          </th>
                        ))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {filteredData.map((row, rowIdx) => (
                      <tr key={rowIdx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                        {headers.map((_, colIdx) => (
                          <td 
                            key={`cell-${rowIdx}-${colIdx}`} 
                            className="px-3 py-2 text-slate-800 border-r border-slate-200 font-medium whitespace-nowrap text-center"
                          >
                            {row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]) : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {filteredData.length === 0 && (
                      <tr>
                        <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-500 font-medium border-b border-slate-200">
                          Không tìm thấy dữ liệu phù hợp với bộ lọc
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-300 mb-6 shadow-inner">
              <FileSpreadsheet size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-700 mb-2">Chưa có dữ liệu</h3>
            <p className="text-slate-500 font-medium mb-6 max-w-md">
              Bấm nút <span className="font-bold text-slate-700">CHỌN FILE</span> ở trên để tải file Excel lên và xem nội dung. Dữ liệu chỉ xử lý tạm thời trên trình duyệt của bạn.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-emerald-200"
            >
              <Upload size={18} />
              TẢI FILE LÊN NGAY
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelViewer;
