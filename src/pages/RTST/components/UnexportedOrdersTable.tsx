import React, { useMemo } from 'react';

interface UnexportedOrdersTableProps {
  rawYcxRows: string[][];
  marketFilter: string;
}

export const UnexportedOrdersTable: React.FC<UnexportedOrdersTableProps> = ({ rawYcxRows, marketFilter }) => {
  const unexportedOrders = useMemo(() => {
    if (!rawYcxRows || rawYcxRows.length <= 1) return [];
    
    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const headersLower = headers.map(h => h.toLowerCase());
    
    // Find column indices
    const getIdx = (keywords: string[]) => headersLower.findIndex(h => keywords.some(k => h.includes(k)));
    
    let idxStatus = headersLower.findIndex(h => h === 'trạng thái xuất');
    if (idxStatus === -1) idxStatus = 13;
    
    let idxTra = headersLower.findIndex(h => 
      h === 'tình trạng nhập trả của sản phẩm đổi với sản phẩm chính' ||
      h === 'tình trạng nhập trả' || h === 'trạng thái trả' || h === 'trả hàng' || h.includes('nhập trả')
    );
    if (idxTra === -1) idxTra = 44;
    
    const idxOrder = getIdx(['số ycx', 'số phiếu', 'mã ycx', 'mã đơn', 'mã phiếu', 'số']);
    const idxCustomerName = getIdx(['tên khách hàng', 'khách hàng']);
    const idxCustomerPhone = getIdx(['điện thoại', 'sđt', 'phone']);
    const idxProduct = getIdx(['tên sản phẩm', 'tên hàng']);
    const idxQty = getIdx(['số lượng']);
    
    const idxRevenue = (() => {
      const priorityTerms = ['doanh thu', 'thành tiền', 'giá bán_1', 'giá bán', 'phải thu'];
      for (const term of priorityTerms) {
        const idx = headersLower.findIndex(h => h.includes(term));
        if (idx !== -1) return idx;
      }
      return -1;
    })();
    
    const idxStaffName = getIdx(['tên nhân viên', 'nhân viên', 'người tạo']);

    const orders = [];
    
    for (let i = 1; i < rawYcxRows.length; i++) {
      const row = rawYcxRows[i];
      if (!row || row.length < 3) continue;
      
      const statusValue = String(row[idxStatus] || '').trim().toLowerCase();
      const returnStatus = String(row[idxTra] || '').trim().toLowerCase();
      
      // Check Unexported and Not Returned
      if (!statusValue.includes('chưa xuất')) continue;
      if (returnStatus.includes('trả') && !returnStatus.includes('chưa trả')) continue;
      
      const revenueStr = String(row[idxRevenue] || '0').replace(/,/g, '');
      const revenue = Math.round(parseFloat(revenueStr) || 0);
      
      if (revenue > 0) {
        const quantityStr = String(row[idxQty] || '0').replace(/,/g, '');
        const quantity = Math.round(parseFloat(quantityStr) || 0);
        
        orders.push({
          orderId: idxOrder !== -1 ? String(row[idxOrder] || '').trim() : '',
          customerName: idxCustomerName !== -1 ? String(row[idxCustomerName] || '').trim() : '',
          customerPhone: idxCustomerPhone !== -1 ? String(row[idxCustomerPhone] || '').trim() : '',
          productName: idxProduct !== -1 ? String(row[idxProduct] || '').trim() : '',
          quantity: quantity,
          revenue: revenue,
          staffName: idxStaffName !== -1 ? String(row[idxStaffName] || '').trim() : ''
        });
      }
    }
    
    return orders.sort((a, b) => b.revenue - a.revenue);
  }, [rawYcxRows]);

  if (unexportedOrders.length === 0) {
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
            {unexportedOrders.map((order, index) => (
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
                {unexportedOrders.reduce((sum, order) => sum + order.quantity, 0)}
              </td>
              <td className="py-3 px-4 text-right border-r border-b border-slate-300 text-rose-600">
                {formatMoney(unexportedOrders.reduce((sum, order) => sum + order.revenue, 0))}
              </td>
              <td className="py-3 px-4 text-left border-r border-b border-slate-300"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
