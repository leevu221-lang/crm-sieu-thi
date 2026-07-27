import React, { useMemo, useState, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Search,
  Filter,
  FileSpreadsheet,
  BarChart3,
  Camera
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { domToPng } from 'modern-screenshot';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TableData {
  stt: number;
  name: string;
  target: number;
  realtime: number;
  percentHT: number;
  remaining: number;
}

interface Props {
  data: TableData[];
  title?: string;
}

const ProfessionalDashboardTable: React.FC<Props> = ({ data, title = "DASHBOARD CHI TIẾT" }) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  const columnHelper = createColumnHelper<TableData>();

  const columns = useMemo(() => [
    columnHelper.accessor('stt', {
      header: 'STT',
      cell: info => <span className="text-slate-400 font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('name', {
      header: 'NGÀNH HÀNG THI ĐUA',
      cell: info => <span className="font-bold text-slate-800">{info.getValue()}</span>,
    }),
    columnHelper.accessor('target', {
      header: 'TARGET',
      cell: info => <span className="font-semibold">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('realtime', {
      header: 'REALTIME',
      cell: info => <span className="font-bold text-indigo-600">{info.getValue().toLocaleString()}</span>,
    }),
    columnHelper.accessor('percentHT', {
      header: '%HT',
      cell: info => {
        const val = info.getValue();
        let color = 'text-red-600 bg-red-50';
        if (val >= 100) color = 'text-emerald-600 bg-emerald-50';
        else if (val >= 80) color = 'text-amber-600 bg-amber-50';
        return (
          <div className={cn("px-2 py-1 rounded-lg inline-block font-black text-xs", color)}>
            {val.toFixed(1)}%
          </div>
        );
      },
    }),
    columnHelper.accessor('remaining', {
      header: 'CÒN LẠI',
      cell: info => {
        const val = info.getValue();
        return (
          <span className={cn(
            "text-xs font-medium",
            val > 0 ? 'text-slate-500' : 'text-emerald-600 font-bold'
          )}>
            {val > 0 ? val.toLocaleString() : '✓ HOÀN THÀNH'}
          </span>
        );
      },
    }),
  ], [columnHelper]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const exportToExcel = () => {
    const exportData = data.map(item => ({
      'STT': item.stt,
      'Ngành Hàng': item.name,
      'Target': item.target,
      'Realtime': item.realtime,
      '% Hoàn Thành': item.percentHT.toFixed(2) + '%',
      'Còn Lại': item.remaining
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dashboard");
    XLSX.writeFile(workbook, "Dashboard_Realtime_NganhHang.xlsx");
  };

  const captureTable = async () => {
    if (tableRef.current) {
      try {
        document.body.classList.add('capturing-screenshot');
        await new Promise(resolve => setTimeout(resolve, 100));

        const dataUrl = await domToPng(tableRef.current, {
          backgroundColor: '#ffffff',
          scale: 2,
        });
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'Dashboard_NganhHang.png';
        link.click();
      } catch (error) {
        console.error('Lỗi khi chụp ảnh:', error);
      } finally {
        document.body.classList.remove('capturing-screenshot');
      }
    }
  };

  return (
    <div ref={tableRef} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8 mb-12">
      {/* Header Section */}
      <div className="p-5 border-b border-slate-100 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Hệ thống quản trị ERP Realtime</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={e => setGlobalFilter(e.target.value)}
              placeholder="Tìm kiếm ngành hàng..."
              className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all w-full md:w-72 font-medium"
            />
          </div>
          
          <button
            onClick={captureTable}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-emerald-200 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            CHỤP ẢNH
          </button>

          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-slate-200 active:scale-95"
          >
            <Download className="w-4 h-4" />
            XUẤT EXCEL
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-slate-50/50">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <div className="flex flex-col">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-600" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  "group transition-all duration-200 hover:bg-indigo-50/40",
                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                )}
              >
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className="px-6 py-4 text-sm text-slate-600 border-b border-slate-50"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Empty State */}
      {table.getRowModel().rows.length === 0 && (
        <div className="py-20 text-center bg-white">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-slate-50 mb-6">
            <Search className="w-10 h-10 text-slate-200" />
          </div>
          <h4 className="text-slate-800 font-black text-lg">Không tìm thấy kết quả</h4>
          <p className="text-slate-400 text-sm mt-1">Vui lòng thử lại với từ khóa khác</p>
        </div>
      )}

      {/* Footer Section */}
      <div className="px-6 py-4 bg-white border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            Dữ liệu cập nhật Realtime • {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-slate-500 font-medium">
            Tổng cộng: <span className="text-slate-900 font-black">{table.getRowModel().rows.length}</span> ngành hàng
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboardTable;
