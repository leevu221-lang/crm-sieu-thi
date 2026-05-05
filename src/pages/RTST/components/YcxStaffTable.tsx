/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { parseYcxData } from '../utils';

interface YcxStaffTableProps {
  ycxData: string;
}

const YcxStaffTable: React.FC<YcxStaffTableProps> = ({ ycxData }) => {
  const parsedYcx = parseYcxData(ycxData);
  const allItems = parsedYcx.flatMap(staff => 
    staff.items.map(item => ({
      staffName: staff.staffName,
      ...item
    }))
  );

  return (
    <div className="mt-8 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm border-t-4 border-t-emerald-500">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] sm:text-xs font-black text-slate-400 flex items-center gap-2 uppercase tracking-widest">
          <TrendingUp size={14} className="text-emerald-500" /> HIỆU QUẢ NV (DỮ LIỆU TỪ YCX)
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="p-2">NGƯỜI TẠO</th>
              <th className="p-2 text-center">SỐ LƯỢNG</th>
              <th className="p-2">TÊN SẢN PHẨM</th>
              <th className="p-2 text-right">GIÁ BÁN 1</th>
            </tr>
          </thead>
          <tbody>
            {allItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-400 text-xs italic">
                  Chưa có dữ liệu YCX. Vui lòng tải file Excel ở tab REALTIME.
                </td>
              </tr>
            ) : (
              allItems.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="p-2 text-xs font-bold text-slate-700">{item.staffName}</td>
                  <td className="p-2 text-xs text-center font-mono">{item.quantity}</td>
                  <td className="p-2 text-xs text-slate-600">{item.productName}</td>
                  <td className="p-2 text-xs text-right font-mono font-bold text-emerald-600">
                    {(item.revenue / (item.quantity || 1)).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default YcxStaffTable;
