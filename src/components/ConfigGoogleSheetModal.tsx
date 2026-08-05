import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, FileSpreadsheet, Download, Upload, Copy, Check, RefreshCw } from 'lucide-react';
import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { BaoHiemRule } from './ConfigBaoHiemModal';
import { ExclusionRule } from './ConfigExclusionModal';

interface ConfigGoogleSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAllData: () => void; // Callback to notify parent to reload configurations
  currentNhomHangMap: Record<string, { nganhHang?: string, large: string, small: string }>;
  currentBaoHiemRules: BaoHiemRule[];
  currentExclusionRules: ExclusionRule[];
}

export const ConfigGoogleSheetModal: React.FC<ConfigGoogleSheetModalProps> = ({
  isOpen,
  onClose,
  onRefreshAllData,
  currentNhomHangMap,
  currentBaoHiemRules,
  currentExclusionRules
}) => {
  const [webAppUrl, setWebAppUrl] = useState('');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Load saved Web App URL from Firestore
  useEffect(() => {
    if (isOpen) {
      const loadConfig = async () => {
        try {
          const docRef = doc(db, 'system_configs', 'google_sheets_config');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setWebAppUrl(docSnap.data().webAppUrl || '');
          }
        } catch (e) {
          console.error("Lỗi khi tải URL Google Sheets:", e);
        }
      };
      loadConfig();
      setSyncStatus('idle');
      setSyncMessage('');
    }
  }, [isOpen]);

  const validateUrl = (url: string): boolean => {
    const cleanUrl = String(url || '').trim();
    if (!cleanUrl) {
      alert("Vui lòng nhập URL Web App Google Apps Script trước!");
      return false;
    }
    if (cleanUrl.includes('docs.google.com/spreadsheets')) {
      alert("⚠️ Phát hiện sai URL: Bạn đang nhập liên kết của Google Sheets (docs.google.com/spreadsheets).\n\nBạn phải nhập URL Web App được tạo sau khi Triển khai mã Apps Script thành công (có dạng bắt đầu bằng https://script.google.com/macros/s/...). Hãy xem kỹ hướng dẫn thiết lập phía trên nhé!");
      return false;
    }
    if (!cleanUrl.includes('script.google.com/macros/s/')) {
      alert("⚠️ URL không hợp lệ! URL Web App của Google Apps Script phải bắt đầu bằng:\nhttps://script.google.com/macros/s/...\n\nVui lòng làm theo hướng dẫn thiết lập để lấy đúng liên kết Web App.");
      return false;
    }
    return true;
  };

  const saveUrlToFirestore = async (url: string) => {
    if (!validateUrl(url)) return;
    
    setIsSavingUrl(true);
    try {
      await setDoc(doc(db, 'system_configs', 'google_sheets_config'), {
        webAppUrl: url.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert("Đã lưu URL kết nối Google Sheets thành công!");
    } catch (e) {
      console.error("Lỗi khi lưu URL vào Firestore:", e);
      alert("Không thể lưu URL lên hệ thống");
    } finally {
      setIsSavingUrl(false);
    }
  };

  const copyAppsScriptCode = () => {
    const code = `// MÃ NGUỒN GOOGLE APPS SCRIPT ĐỒNG BỘ 2 CHIỀU HỆ THỐNG
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Đọc Cấu hình Nhóm hàng
    const nhomHangSheet = ss.getSheetByName("Cấu hình Nhóm hàng") || ss.getSheetByName("nhom_hang_map");
    const nhomHangData = [];
    if (nhomHangSheet) {
      const rows = nhomHangSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) {
          nhomHangData.push({
            nhomHang: String(row[0]).trim(),
            nganhHang: String(row[1] || '').trim(),
            large: String(row[2] || '').trim(),
            small: String(row[3] || '').trim()
          });
        }
      }
    }
    
    // 2. Đọc Cấu hình BH & VAS
    const baoHiemSheet = ss.getSheetByName("Cấu hình BH & VAS") || ss.getSheetByName("bao_hiem_map");
    const baoHiemData = [];
    if (baoHiemSheet) {
      const rows = baoHiemSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] || row[1]) {
          baoHiemData.push({
            maSanPham: String(row[0] || '').trim(),
            tenSanPham: String(row[1] || '').trim(),
            phanLoai: String(row[2] || '').trim(),
            nganhHangLon: String(row[3] || '').trim(),
            nhomHangNho: String(row[4] || '').trim()
          });
        }
      }
    }
    
    // 3. Đọc Cấu hình Loại bỏ
    const loaiBoSheet = ss.getSheetByName("Cấu hình Loại bỏ") || ss.getSheetByName("loai_bo_map");
    const loaiBoData = [];
    if (loaiBoSheet) {
      const rows = loaiBoSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] || row[1] || row[2] || row[3]) {
          loaiBoData.push({
            hinhThucXuat: String(row[0] || '').trim(),
            nganhHang: String(row[1] || '').trim(),
            nhomHang: String(row[2] || '').trim(),
            tenSanPham: String(row[3] || '').trim(),
            note: String(row[4] || '').trim()
          });
        }
      }
    }

    // 4. Đọc Danh sách Người dùng (Quản lý Người dùng)
    const userSheet = ss.getSheetByName("Quản lý Người dùng");
    const usersData = [];
    if (userSheet) {
      const rows = userSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) {
          usersData.push({
            username: String(row[0]).trim(),
            isOnline: String(row[1] || '').trim(),
            lastActive: String(row[2] || '').trim(),
            currentPage: String(row[3] || '').trim(),
            storeCode: String(row[4] || '').trim(),
            password: String(row[5] || '').trim(),
            cuocPhi: String(row[6] || '').trim(),
            allowedPages: String(row[7] || '').trim()
          });
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: {
        nhom_hang_map: nhomHangData,
        bao_hiem_map: baoHiemData,
        loai_bo_map: loaiBoData,
        users_list: usersData
      }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Ghi Cấu hình Nhóm hàng
    if (postData.nhom_hang_map) {
      let sheet = ss.getSheetByName("Cấu hình Nhóm hàng");
      if (!sheet) {
        sheet = ss.insertSheet("Cấu hình Nhóm hàng");
      }
      sheet.clearContents();
      sheet.clearFormats();
      
      const headers = ["Nhóm Hàng", "Ngành Hàng", "Ngành Hàng Lớn", "Nhóm Hàng Nhỏ"];
      const rows = [headers];
      
      postData.nhom_hang_map.forEach(item => {
        rows.push([
          item.nhomHang || '',
          item.nganhHang || '',
          item.large || '',
          item.small || ''
        ]);
      });
      
      sheet.getRange(1, 1, rows.length, 4).setValues(rows);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f3f4f6");
    }
    
    // 2. Ghi Cấu hình BH & VAS
    if (postData.bao_hiem_map) {
      let sheet = ss.getSheetByName("Cấu hình BH & VAS");
      if (!sheet) {
        sheet = ss.insertSheet("Cấu hình BH & VAS");
      }
      sheet.clearContents();
      sheet.clearFormats();
      
      const headers = ["Mã Sản Phẩm", "Tên Sản Phẩm", "Phân Loại", "Ngành Hàng Lớn", "Nhóm Hàng Nhỏ"];
      const rows = [headers];
      
      postData.bao_hiem_map.forEach(item => {
        rows.push([
          item.maSanPham || '',
          item.tenSanPham || '',
          item.phanLoai || '',
          item.nganhHangLon || '',
          item.nhomHangNho || ''
        ]);
      });
      
      sheet.getRange(1, 1, rows.length, 5).setValues(rows);
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f4f6");
    }
    
    // 3. Ghi Cấu hình Loại bỏ
    if (postData.loai_bo_map) {
      let sheet = ss.getSheetByName("Cấu hình Loại bỏ");
      if (!sheet) {
        sheet = ss.insertSheet("Cấu hình Loại bỏ");
      }
      sheet.clearContents();
      sheet.clearFormats();
      
      const headers = ["Hình Thức Xuất", "Ngành Hàng", "Nhóm Hàng", "Tên Sản Phẩm", "Ghi Chú"];
      const rows = [headers];
      
      postData.loai_bo_map.forEach(item => {
        rows.push([
          item.hinhThucXuat || '',
          item.nganhHang || '',
          item.nhomHang || '',
          item.tenSanPham || '',
          item.note || ''
        ]);
      });
      
      sheet.getRange(1, 1, rows.length, 5).setValues(rows);
      sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f4f6");
    }

    // 4. Ghi Danh sách Người dùng (Đúng tên chức năng: Quản lý Người dùng)
    if (postData.users_list) {
      let sheet = ss.getSheetByName("Quản lý Người dùng");
      if (!sheet) {
        sheet = ss.insertSheet("Quản lý Người dùng");
      }
      sheet.clearContents();
      sheet.clearFormats();
      
      const headers = ["Mã NV", "Trạng thái Online", "Lần truy cập cuối", "Trang đang xem", "Mã Kho", "Mật khẩu", "Cước phí", "Quyền truy cập"];
      const rows = [headers];
      
      postData.users_list.forEach(item => {
        rows.push([
          item.username || '',
          item.isOnline || '',
          item.lastActive || '',
          item.currentPage || '',
          item.storeCode || '',
          item.password || '',
          item.cuocPhi || '',
          item.allowedPages || ''
        ]);
      });
      
      sheet.getRange(1, 1, rows.length, 8).setValues(rows);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#f3f4f6");
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    if (!validateUrl(webAppUrl)) return;

    setSyncStatus('loading');
    setSyncMessage('Đang chuẩn bị dữ liệu xuất...');

    try {
      // Convert nhomHangMap from object to array
      const nhomHangList = Object.entries(currentNhomHangMap).map(([key, val]) => ({
        nhomHang: key,
        nganhHang: val.nganhHang || '',
        large: val.large,
        small: val.small
      }));

      const payload = {
        nhom_hang_map: nhomHangList,
        bao_hiem_map: currentBaoHiemRules,
        loai_bo_map: currentExclusionRules
      };

      setSyncMessage('Đang gửi và ghi dữ liệu lên Google Sheets...');
      
      // Use text/plain to avoid CORS OPTIONS preflight blocking
      const response = await fetch(webAppUrl, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        setSyncStatus('success');
        setSyncMessage('Đã xuất cấu hình thành công lên Google Sheets!');
      } else {
        throw new Error(result.error || 'Lỗi không xác định từ Apps Script');
      }
    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncMessage(`Lỗi xuất dữ liệu: ${e.message || 'Kiểm tra lại URL Web App và quyền chia sẻ sheet'}`);
    }
  };

  const handleImport = async () => {
    if (!validateUrl(webAppUrl)) return;

    if (!window.confirm("BẠN CÓ CHẮC CHẮN? Thao tác này sẽ GHI ĐÈ toàn bộ cấu hình hiện tại của hệ thống bằng dữ liệu từ Google Sheets!")) {
      return;
    }

    setSyncStatus('loading');
    setSyncMessage('Đang kết nối tới Google Sheets...');

    try {
      const response = await fetch(webAppUrl);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Lỗi không xác định từ Apps Script');
      }

      const { nhom_hang_map, bao_hiem_map, loai_bo_map } = result.data;
      
      setSyncMessage('Đang đồng bộ và cập nhật hệ thống...');

      // 1. Save Category Map
      if (nhom_hang_map && Array.isArray(nhom_hang_map)) {
        const newMap: Record<string, { nganhHang?: string, large: string, small: string }> = {};
        nhom_hang_map.forEach((item: any) => {
          if (item.nhomHang) {
            newMap[item.nhomHang] = {
              nganhHang: item.nganhHang || '',
              large: item.large || '',
              small: item.small || ''
            };
          }
        });
        await setDoc(doc(db, 'system_configs', 'nhom_hang_map'), { map: newMap });
      }

      // 2. Save Insurance Map
      if (bao_hiem_map && Array.isArray(bao_hiem_map)) {
        await setDoc(doc(db, 'system_configs', 'bao_hiem_map'), { rules: bao_hiem_map });
      }

      // 3. Save Exclusion Map
      if (loai_bo_map && Array.isArray(loai_bo_map)) {
        await setDoc(doc(db, 'system_configs', 'loai_bo_map'), { rules: loai_bo_map });
      }

      setSyncStatus('success');
      setSyncMessage('Đã đồng bộ thành công dữ liệu từ Google Sheets về hệ thống!');
      onRefreshAllData();
    } catch (e: any) {
      console.error(e);
      setSyncStatus('error');
      setSyncMessage(`Lỗi nhập dữ liệu: ${e.message || 'Kiểm tra lại URL Web App và nội dung trang tính'}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#f8fafc] border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="text-md font-black text-slate-800 uppercase tracking-tight">Đồng bộ Google Sheets</h3>
              <p className="text-[11px] text-slate-400 font-medium">Xuất nhập cấu hình hai chiều với trang tính cá nhân</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Instructions Box */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-[11px] text-slate-600 space-y-2">
            <p className="font-black text-slate-700 flex items-center gap-1.5">
              <RefreshCw size={14} className="text-slate-500 animate-spin-slow" /> HƯỚNG DẪN THIẾT LẬP BẢNG TÍNH GOOGLE SHEETS:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>Mở tệp Google Sheets của bạn.</li>
              <li>Trên thanh trình đơn, chọn <strong>Tiện ích mở rộng (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
              <li>Xóa mọi mã cũ trong trình biên tập, nhấn nút bên dưới để sao chép mã nguồn đồng bộ và dán vào.</li>
              <li>Nhấp vào nút <strong>Triển khai (Deploy)</strong> ở góc trên bên phải &gt; chọn <strong>Triển khai mới (New deployment)</strong>.</li>
              <li>Chọn loại cấu hình là <strong>Ứng dụng web (Web app)</strong>.</li>
              <li>Đặt mục <i>Người thực hiện (Execute as)</i> là <strong>Tôi (Me)</strong> và <i>Ai có quyền truy cập (Who has access)</i> là <strong>Mọi người (Anyone)</strong>.</li>
              <li>Nhấn <strong>Triển khai (Deploy)</strong>, cấp quyền truy cập nếu được yêu cầu và <strong>sao chép URL ứng dụng Web</strong> dán vào ô bên dưới.</li>
            </ol>
            <button
              onClick={copyAppsScriptCode}
              className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg transition-colors font-bold flex items-center justify-center gap-2 border border-slate-200/50"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              {copied ? 'Đã sao chép mã!' : 'Sao chép mã Google Apps Script'}
            </button>
          </div>

          {/* Web App URL Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
              URL Web App của Google Apps Script
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webAppUrl}
                onChange={(e) => setWebAppUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-[12px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-green-500/30 focus:border-green-500/70"
              />
              <button
                onClick={() => saveUrlToFirestore(webAppUrl)}
                disabled={isSavingUrl}
                className="px-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white text-[12px] font-black rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Save size={14} />
                {isSavingUrl ? 'Đang lưu...' : 'Lưu URL'}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              * URL này sẽ được lưu chung cho toàn hệ thống siêu thị để mọi người dùng đều có thể đồng bộ.
            </p>
          </div>

          {/* Sync operations */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleExport}
              disabled={syncStatus === 'loading'}
              className="p-4 bg-green-50 hover:bg-green-100 border border-green-200/60 rounded-xl text-green-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer font-bold text-center"
            >
              <Upload size={24} className="group-hover:scale-110 transition-transform" />
              <span className="text-[13px] font-black uppercase">Xuất lên Google Sheets</span>
              <span className="text-[10px] text-green-600/70 text-center font-normal">
                Đẩy 3 cấu hình hiện tại của hệ thống lên trang tính
              </span>
            </button>

            <button
              onClick={handleImport}
              disabled={syncStatus === 'loading'}
              className="p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl text-blue-700 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer font-bold text-center"
            >
              <Download size={24} className="group-hover:scale-110 transition-transform" />
              <span className="text-[13px] font-black uppercase">Đồng bộ từ Google Sheet về</span>
              <span className="text-[10px] text-blue-600/70 text-center font-normal">
                Ghi đè cấu hình hệ thống bằng dữ liệu từ trang tính
              </span>
            </button>
          </div>

          {/* Status Message */}
          {syncStatus !== 'idle' && (
            <div className={`p-4 rounded-xl text-[11px] font-semibold flex items-center gap-2.5 ${
              syncStatus === 'loading' ? 'bg-slate-50 border border-slate-200 text-slate-600' :
              syncStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-700' :
              'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {syncStatus === 'loading' && <RefreshCw size={14} className="animate-spin" />}
              {syncStatus === 'success' && <Check size={14} />}
              {syncStatus === 'error' && <AlertTriangle size={14} />}
              <span>{syncMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-[#f8fafc] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[12px] font-black rounded-xl transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
