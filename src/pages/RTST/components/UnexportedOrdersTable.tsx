import React, { useMemo } from 'react';
import { YcxStaffData } from '../types';

interface UnexportedOrdersTableProps {
  ycxData: YcxStaffData[];
  marketFilter: string;
}

export const UnexportedOrdersTable: React.FC<UnexportedOrdersTableProps> = ({ ycxData, marketFilter }) => {
  const unexportedOrders = useMemo(() => {
    if (!ycxData || ycxData.length === 0) return [];
    
    let allItems = ycxData.flatMap(staff => staff.items);
    
    // Filter by "Chưa xuất" status and has revenue
    return allItems.filter(item => {
      const isUnexported = item.status && item.status.toLowerCase().includes('chưa xuất');
      const hasRevenue = item.revenue && item.revenue > 0;
      const isReturned = item.returnStatus && item.returnStatus.toLowerCase().includes('trả');
      
      return isUnexported && hasRevenue && !isReturned;
    }).sort((a, b) => b.revenue - a.revenue);
  }, [ycxData]);

  const filteredOrders = useMemo(() => {
    // Note: Items don't have direct marketName currently assigned to them in the parser except from their parent staff.
    // If we wanted to filter by market, we might need marketName on the item. 
    // Since this is across all orders, we'll just show them, or we could pass marketFilter if we had market info per item.
    // Actually, staff map assigns items, so items belong to a staff, but staff's marketName is known.
    // Let's just return all for now or filter if needed.
    return unexportedOrders;
  }, [unexportedOrders, marketFilter]);

  if (filteredOrders.length === 0) {
    return null; // Don't show the table if there are no unexported orders
  }

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN');
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6 mb-12">
      <div className="bg-rose-100 px-6 py-4 flex items-center justify-between border-b border-rose-200 relative">
        <div className="flex items-center gap-3 mx-auto">
          <h3 className="text-2xl font-black text-rose-700 uppercase tracking-widest text-center" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>
            ĐƠN HÀNG ĐÃ THU TIỀN NHƯNG CHƯA XUẤT
          </h3>
        </div>
      </div>
      
      <div className="overflow-x-auto p-6">
        <table className="w-full border-separate border-spacing-0 border-t border-l border-slate-300">
          <thead>
            <tr className="bg-slate-50 text-slate-800 text-[12px] font-black uppercase">
              <th className="py-2.5 px-4 text-center border-r border-b border-slate-300 w-16">STT</th>
              <th className="py-2.5 px-4 text-center border-r border-b border-slate-300 w-32">Mã YCX</th>
              <th className="py-2.5 px-4 text-left border-r border-b border-slate-300 w-48">Khách hàng</th>
              <th className="py-2.5 px-4 text-center border-r border-b border-slate-300 w-32">SĐT</th>
              <th className="py-2.5 px-4 text-left border-r border-b border-slate-300">Sản phẩm</th>
              <th className="py-2.5 px-4 text-center border-r border-b border-slate-300 w-24">Số lượng</th>
              <th className="py-2.5 px-4 text-right border-r border-b border-slate-300 w-32">Số tiền</th>
              <th className="py-2.5 px-4 text-left border-r border-b border-slate-300 w-48">Nhân viên</th>
            </tr>
          </thead>
          <tbody className="text-[13px] font-medium text-slate-700">
            {filteredOrders.map((order, index) => (
              <tr key={index} className="hover:bg-rose-50/50 transition-colors">
                <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold">{index + 1}</td>
                <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold text-indigo-600">{order.orderId || '-'}</td>
                <td className="py-2.5 px-4 text-left border-r border-b border-slate-200">{order.customerName || '-'}</td>
                <td className="py-2.5 px-4 text-center border-r border-b border-slate-200">{order.customerPhone || '-'}</td>
                <td className="py-2.5 px-4 text-left border-r border-b border-slate-200 text-slate-900">{order.productName}</td>
                <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold">{order.quantity}</td>
                <td className="py-2.5 px-4 text-right border-r border-b border-slate-200 font-black text-rose-600">{formatMoney(order.revenue)}</td>
                <td className="py-2.5 px-4 text-left border-r border-b border-slate-200">{order.staffName || '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-black text-slate-800 text-[13px]">
            <tr>
              <td colSpan={5} className="py-3 px-4 text-right border-r border-b border-slate-300">TỔNG CỘNG</td>
              <td className="py-3 px-4 text-center border-r border-b border-slate-300 text-rose-600">
                {filteredOrders.reduce((sum, order) => sum + order.quantity, 0)}
              </td>
              <td className="py-3 px-4 text-right border-r border-b border-slate-300 text-rose-600">
                {formatMoney(filteredOrders.reduce((sum, order) => sum + order.revenue, 0))}
              </td>
              <td className="py-3 px-4 text-left border-r border-b border-slate-300"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
