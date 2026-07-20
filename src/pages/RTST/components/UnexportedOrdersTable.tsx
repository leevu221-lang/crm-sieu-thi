import React, { useMemo, useState, useEffect } from 'react';
import { Camera, Filter } from 'lucide-react';

interface UnexportedOrdersTableProps {
  rawYcxRows: string[][];
  marketFilter: string;
  onCapture?: () => void;
}

export const UnexportedOrdersTable: React.FC<UnexportedOrdersTableProps> = ({ rawYcxRows, marketFilter, onCapture }) => {
  const [paymentFilter, setPaymentFilter] = useState<string>('');
  const [exportFilter, setExportFilter] = useState<string>('');
  const [cancelFilter, setCancelFilter] = useState<string>('');
  const [hasSetDefaults, setHasSetDefaults] = useState(false);

  const unexportedOrders = useMemo(() => {
    if (!rawYcxRows || rawYcxRows.length <= 1) return [];
    
    const headers = rawYcxRows[0].map(h => String(h || '').trim());
    const headersLower = headers.map(h => h.toLowerCase());
    
    // Find column indices
    const getIdx = (keywords: string[]) => {
      // 1. Exact match
      for (const kw of keywords) {
        const exactIdx = headersLower.findIndex(h => h === kw);
        if (exactIdx !== -1) return exactIdx;
      }
      // 2. Partial match
      for (const kw of keywords) {
        const partialIdx = headersLower.findIndex(h => h.includes(kw));
        if (partialIdx !== -1) return partialIdx;
      }
      return -1;
    };
    
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
    
    const idxPaymentStatus = getIdx(['trạng thái thu tiền', 'tt thu tiền']);
    const idxStaffName = getIdx(['người tạo', 'nhân viên', 'tên nhân viên', 'người bán', 'tên nv', 'người thực hiện', 'user tạo']);
    const idxCancelStatus = getIdx(['trạng thái hủy', 'trạng thái huỷ', 'huỷ', 'hủy']);

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
          staffName: idxStaffName !== -1 ? String(row[idxStaffName] || '').trim() : '',
          paymentStatus: idxPaymentStatus !== -1 ? String(row[idxPaymentStatus] || '').trim() : 'Đã thu',
          exportStatus: idxStatus !== -1 ? String(row[idxStatus] || '').trim() : 'Chưa xuất',
          cancelStatus: idxCancelStatus !== -1 ? String(row[idxCancelStatus] || '').trim() : '-'
        });
      }
    }
    
    return orders.sort((a, b) => b.revenue - a.revenue);
  }, [rawYcxRows]);

  const filteredOrders = useMemo(() => {
    const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return unexportedOrders.filter(order => {
      const matchPayment = paymentFilter ? normalize(order.paymentStatus).includes(normalize(paymentFilter)) : true;
      const matchExport = exportFilter ? normalize(order.exportStatus).includes(normalize(exportFilter)) : true;
      const matchCancel = cancelFilter ? normalize(order.cancelStatus).includes(normalize(cancelFilter)) : true;
      return matchPayment && matchExport && matchCancel;
    });
  }, [unexportedOrders, paymentFilter, exportFilter, cancelFilter]);

  const uniquePaymentStatuses = useMemo(() => {
    return Array.from(new Set(unexportedOrders.map(o => o.paymentStatus))).filter(Boolean).sort();
  }, [unexportedOrders]);

  const uniqueExportStatuses = useMemo(() => {
    return Array.from(new Set(unexportedOrders.map(o => o.exportStatus))).filter(Boolean).sort();
  }, [unexportedOrders]);

  const uniqueCancelStatuses = useMemo(() => {
    return Array.from(new Set(unexportedOrders.map(o => o.cancelStatus))).filter(Boolean).sort();
  }, [unexportedOrders]);

  useEffect(() => {
    if (uniquePaymentStatuses.length > 0 && !hasSetDefaults) {
      const pMatch = uniquePaymentStatuses.find(s => s.toLowerCase().includes('chưa thu'));
      const eMatch = uniqueExportStatuses.find(s => s.toLowerCase().includes('chưa xuất'));
      const cMatch = uniqueCancelStatuses.find(s => {
        const norm = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return norm.includes('chua huy');
      });
      
      if (pMatch) setPaymentFilter(pMatch);
      if (eMatch) setExportFilter(eMatch);
      if (cMatch) setCancelFilter(cMatch);
      
      setHasSetDefaults(true);
    }
  }, [uniquePaymentStatuses, uniqueExportStatuses, uniqueCancelStatuses, hasSetDefaults]);

  if (unexportedOrders.length === 0) {
    return null; // Don't show the table if there are no unexported orders
  }

  const formatMoney = (val: number) => {
    return val.toLocaleString('vi-VN');
  };

  const dynamicTitle = useMemo(() => {
    const parts = [];
    if (paymentFilter) parts.push(paymentFilter.toUpperCase());
    if (exportFilter) parts.push(exportFilter.toUpperCase());
    if (cancelFilter) parts.push(cancelFilter.toUpperCase());
    
    if (parts.length === 0) return 'TẤT CẢ ĐƠN HÀNG';
    return `ĐƠN HÀNG ${parts.join(' - ')}`;
  }, [paymentFilter, exportFilter, cancelFilter]);

  return (
    <div id="unexported-orders-table-container" className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm mt-6 mb-12 relative bg-white">
      <div className="bg-rose-100 px-6 py-4 flex items-center justify-between border-b border-rose-200 relative">
        <div className="flex items-center gap-3 mx-auto">
          <h3 className="text-2xl font-black text-rose-700 uppercase tracking-widest text-center" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.5)' }}>
            {dynamicTitle}
          </h3>
        </div>
        {onCapture && (
          <button
            onClick={onCapture}
            className="px-3 py-1.5 rounded-lg border border-rose-400 text-[10px] font-bold text-rose-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors flex items-center gap-1.5 absolute right-6 bg-white no-capture shadow-sm"
          >
            <Camera size={14} />
            <span>Chụp ảnh</span>
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto p-6 bg-white">
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
              <th className="py-2.5 px-2 text-center border-r border-b border-slate-300 min-w-[140px]">
                <div className="flex flex-col gap-1 items-center justify-center">
                  <span>Trạng thái thu tiền</span>
                  <div className="relative w-full max-w-[120px] no-capture">
                    <select
                      className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-1 pl-2 pr-6 rounded text-[10px] focus:outline-none focus:border-rose-300 font-medium cursor-pointer"
                      value={paymentFilter}
                      onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {uniquePaymentStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Filter size={10} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </th>
              <th className="py-2.5 px-2 text-center border-r border-b border-slate-300 min-w-[140px]">
                <div className="flex flex-col gap-1 items-center justify-center">
                  <span>Trạng thái xuất</span>
                  <div className="relative w-full max-w-[120px] no-capture">
                    <select
                      className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-1 pl-2 pr-6 rounded text-[10px] focus:outline-none focus:border-rose-300 font-medium cursor-pointer"
                      value={exportFilter}
                      onChange={(e) => setExportFilter(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {uniqueExportStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Filter size={10} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </th>
              <th className="py-2.5 px-2 text-center border-r border-b border-slate-300 min-w-[140px]">
                <div className="flex flex-col gap-1 items-center justify-center">
                  <span>Trạng thái huỷ</span>
                  <div className="relative w-full max-w-[120px] no-capture">
                    <select
                      className="w-full appearance-none bg-white border border-slate-200 text-slate-700 py-1 pl-2 pr-6 rounded text-[10px] focus:outline-none focus:border-rose-300 font-medium cursor-pointer"
                      value={cancelFilter}
                      onChange={(e) => setCancelFilter(e.target.value)}
                    >
                      <option value="">Tất cả</option>
                      {uniqueCancelStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <Filter size={10} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </th>
              <th className="py-2.5 px-4 text-left border-r border-b border-slate-300 w-48">Nhân viên</th>
            </tr>
          </thead>
          <tbody className="text-[13px] font-medium text-slate-700">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order, index) => (
                <tr key={index} className="hover:bg-rose-50/50 transition-colors">
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold">{index + 1}</td>
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold text-indigo-600">{order.orderId || '-'}</td>
                  <td className="py-2.5 px-4 text-left border-r border-b border-slate-200">{order.customerName || '-'}</td>
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200">{order.customerPhone || '-'}</td>
                  <td className="py-2.5 px-4 text-left border-r border-b border-slate-200 text-slate-900">{order.productName}</td>
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold">{order.quantity}</td>
                  <td className="py-2.5 px-4 text-right border-r border-b border-slate-200 font-black text-rose-600">{formatMoney(order.revenue)}</td>
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold text-emerald-600">{order.paymentStatus}</td>
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold text-amber-600">{order.exportStatus}</td>
                  <td className="py-2.5 px-4 text-center border-r border-b border-slate-200 font-bold text-red-600">{order.cancelStatus}</td>
                  <td className="py-2.5 px-4 text-left border-r border-b border-slate-200">{order.staffName || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 border-b border-slate-200">
                  Không có đơn hàng nào khớp với bộ lọc.
                </td>
              </tr>
            )}
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
              <td className="py-3 px-4 text-left border-r border-b border-slate-300"></td>
              <td className="py-3 px-4 text-left border-r border-b border-slate-300"></td>
              <td className="py-3 px-4 text-left border-r border-b border-slate-300"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
