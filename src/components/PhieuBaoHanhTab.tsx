import React from 'react';
import { Printer } from 'lucide-react';

export default function PhieuBaoHanhTab() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-phieu-bh, .print-phieu-bh * {
            visibility: visible;
          }
          .print-phieu-bh {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 148mm;
            margin: 0;
            padding: 0;
            background: white;
          }
          @page {
            size: A5 landscape;
            margin: 0;
          }
        }
      `}</style>
      
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 shrink-0">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase">IN PHIẾU BẢO HÀNH</h2>
          <p className="text-sm text-slate-500">Mẫu in khổ A5 ngang, nội dung nằm nửa bên phải.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#00965e] hover:bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
        >
          <Printer size={18} /> IN PHIẾU NÀY
        </button>
      </div>

      <div className="flex-1 overflow-auto flex justify-center bg-slate-50 p-8 rounded-2xl border border-slate-200">
        {/* Bản xem trước A5 */}
        <div className="print-phieu-bh bg-white shadow-xl flex" style={{ width: '210mm', height: '148mm' }}>
          {/* Nửa bên trái trống */}
          <div className="w-1/2 h-full"></div>
          
          {/* Nửa bên phải chứa nội dung */}
          <div className="w-1/2 h-full p-4 flex flex-col justify-center">
            <table className="w-full border-collapse border border-black text-[14px] font-serif" style={{ height: '100%' }}>
              <colgroup>
                <col style={{ width: '35px' }} />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <td className="border border-black bg-black text-white text-center font-bold">1</td>
                  <td className="border border-black p-2">
                    <div className="flex">
                      <span>Sản phẩm bảo hành:</span>
                      <span className="flex-1 border-b border-dotted border-black mx-1 mb-[3px]"></span>
                      <span>tháng/năm</span>
                    </div>
                    <div className="flex mt-1">
                      <span className="min-w-[150px] text-right">BH Phụ kiện (nếu có):</span>
                      <span className="w-[80px] border-b border-dotted border-black mx-1 mb-[3px]"></span>
                      <span>tháng</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-center align-top pt-2">2</td>
                  <td className="border border-black p-2">
                    <div>- Trong 30 ngày đầu hư gì đổi nấy cùng model, cùng kiểu dáng, màu sắc (<span className="font-bold uppercase">HÃNG SẼ THẨM ĐỊNH VÀ ĐỔI MỚI SAU KHI CÓ BIÊN BẢN XÁC NHẬN LỖI</span>)</div>
                    <div className="mt-1">- Qua 30 ngày nếu lỗi bảo hành theo chính sách hãng hoặc đổi mới chịu phí</div>
                    <div className="mt-1">- sản phẩm : <span className="font-bold">Không lỗi</span> hoặc có <span className="font-bold">Lỗi</span> nếu đổi sang mẫu khác:</div>
                    <div className="ml-3 mt-1">+ THÁNG ĐẦU: <span className="font-bold">TRỪ 20%</span> .</div>
                    <div className="ml-3">+ MỖI THÁNG TIẾP THEO THÊM <span className="font-bold">10%</span></div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-center">3</td>
                  <td className="border border-black p-2">
                    <div className="flex">
                      <span>Giao trước</span>
                      <span className="w-[80px] border-b border-dotted border-black mx-1 mb-[3px]"></span>
                      <span>ngày</span>
                      <span className="flex-1 border-b border-dotted border-black mx-1 mb-[3px]"></span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-center">4</td>
                  <td className="border border-black p-2">
                    Chưa bao gồm phí vật tư phát sinh (nếu có)
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-center">5</td>
                  <td className="border border-black p-2">
                    Đã tư vấn đúng model, nhu cầu KH, đầy đủ tính năng sản phẩm, thiết kế, khuyến mãi
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-center align-top pt-2">6</td>
                  <td className="border border-black p-2">
                    <div>- <span className="font-bold">Tổng đài bảo hành: 1900.23.24.65</span></div>
                    <div className="mt-1">- Hỗ trợ và mua hàng:</div>
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-center h-10">7</td>
                  <td className="border border-black p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
