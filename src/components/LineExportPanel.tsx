import React, { useState, useEffect } from 'react';
import { Send, Settings, CheckCircle2, AlertCircle, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';

interface LineExportPanelProps {
  tableRefs: {
    tableRef: React.RefObject<HTMLDivElement>;
    rtTableRef: React.RefObject<HTMLDivElement>;
    chiTietTableRef: React.RefObject<HTMLDivElement>;
    xepHangTableRef: React.RefObject<HTMLDivElement>;
    khoTableRef: React.RefObject<HTMLDivElement>;
    tgdTableRef: React.RefObject<HTMLDivElement>;
    dmxTableRef: React.RefObject<HTMLDivElement>;
    vungScorecardRef: React.RefObject<HTMLDivElement>;
  };
  activeTab: 'VUNG' | 'SIEU_THI' | 'RT_SIEU_THI' | 'LK_SIEU_THI' | 'CAU_HINH';
  setActiveTab: (tab: 'VUNG' | 'SIEU_THI' | 'RT_SIEU_THI' | 'LK_SIEU_THI' | 'CAU_HINH') => void;
  isUser43751: boolean;
}

export const LineExportPanel: React.FC<LineExportPanelProps> = ({ tableRefs, activeTab, setActiveTab, isUser43751 }) => {
  if (!isUser43751) return null;

  const [selectedTable, setSelectedTable] = useState<string>('rtTableRef_short');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [token, setToken] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Load config from localStorage
  useEffect(() => {
    const cachedToken = localStorage.getItem('crm_line_token_43751') || '';
    const cachedGroupId = localStorage.getItem('crm_line_group_43751') || '';
    setToken(cachedToken);
    setGroupId(cachedGroupId);
  }, []);

  const handleSaveConfig = () => {
    localStorage.setItem('crm_line_token_43751', token.trim());
    localStorage.setItem('crm_line_group_43751', groupId.trim());
    setStatus({ type: 'success', text: 'Đã lưu cấu hình LINE thành công!' });
    setTimeout(() => setStatus(null), 3000);
    setShowConfig(false);
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const handleSendToLine = async () => {
    if (!token.trim() || !groupId.trim()) {
      setStatus({ type: 'error', text: 'Vui lòng điền đầy đủ cấu hình Token & Group ID trước!' });
      setShowConfig(true);
      return;
    }

    setIsSending(true);
    setStatus({ type: 'info', text: 'Đang chuẩn bị...' });

    const originalTab = activeTab;
    let requiredTab: 'VUNG' | 'SIEU_THI' | 'RT_SIEU_THI' | 'LK_SIEU_THI' | 'CAU_HINH' = activeTab;

    // Determine target ref, configuration mode (short vs full) and required tab
    let targetRef: React.RefObject<HTMLDivElement> | null = null;
    let isShort = false;

    switch (selectedTable) {
      case 'rtTableRef_short':
        targetRef = tableRefs.rtTableRef;
        isShort = true;
        requiredTab = 'VUNG';
        break;
      case 'rtTableRef_full':
        targetRef = tableRefs.rtTableRef;
        isShort = false;
        requiredTab = 'VUNG';
        break;
      case 'tableRef_short':
        targetRef = tableRefs.tableRef;
        isShort = true;
        requiredTab = 'SIEU_THI';
        break;
      case 'tableRef_full':
        targetRef = tableRefs.tableRef;
        isShort = false;
        requiredTab = 'SIEU_THI';
        break;
      case 'chiTietTableRef':
        targetRef = tableRefs.chiTietTableRef;
        requiredTab = 'SIEU_THI';
        break;
      case 'xepHangTableRef':
        targetRef = tableRefs.xepHangTableRef;
        requiredTab = 'SIEU_THI';
        break;
      case 'khoTableRef':
        targetRef = tableRefs.khoTableRef;
        requiredTab = 'SIEU_THI';
        break;
      case 'tgdTableRef':
        targetRef = tableRefs.tgdTableRef;
        requiredTab = 'VUNG';
        break;
      case 'dmxTableRef':
        targetRef = tableRefs.dmxTableRef;
        requiredTab = 'VUNG';
        break;
      case 'vungScorecardRef':
        targetRef = tableRefs.vungScorecardRef;
        requiredTab = 'VUNG';
        break;
    }

    try {
      // 1. Programmatically switch tab if needed to mount the DOM reference
      if (activeTab !== requiredTab) {
        setStatus({ type: 'info', text: 'Đang chuyển đổi tab để tải bảng báo cáo...' });
        setActiveTab(requiredTab);
        // Wait 800ms to allow React to mount the component and render the tab contents
        await new Promise(r => setTimeout(r, 800));
      }

      if (!targetRef || !targetRef.current) {
        throw new Error('Không tìm thấy bảng báo cáo đã chọn trên giao diện!');
      }

      setStatus({ type: 'info', text: 'Đang chụp ảnh bảng biểu...' });

      // 2. Temporarily style the target element for clean capture (without scrollbars)
      const styleEl = document.createElement('style');
      styleEl.id = 'hide-scrollbar-line-temp';
      styleEl.innerHTML = `
        *::-webkit-scrollbar { display: none !important; }
        * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        .export-btn { display: none !important; }
      `;
      document.head.appendChild(styleEl);

      if (isShort) {
        targetRef.current.classList.add('export-short-mode');
      }

      const originalWidth = targetRef.current.style.width;
      const originalHeight = targetRef.current.style.height;
      const originalMaxHeight = targetRef.current.style.maxHeight;
      const originalOverflow = targetRef.current.style.overflow;
      const originalPosition = targetRef.current.style.position;
      const originalPadding = targetRef.current.style.padding;
      const originalBg = targetRef.current.style.backgroundColor;
      const originalDisplay = targetRef.current.style.display;

      targetRef.current.style.width = 'max-content';
      targetRef.current.style.height = 'max-content';
      targetRef.current.style.maxHeight = 'none';
      targetRef.current.style.overflow = 'hidden';
      targetRef.current.style.position = 'relative';
      targetRef.current.style.padding = '32px'; 
      targetRef.current.style.backgroundColor = '#ffffff';
      targetRef.current.style.display = 'inline-block';

      // ★ Ensure UTM Avo font is fully loaded before export
      await ensureFontsReady();
      // Give DOM time to update/render styles
      await new Promise(r => setTimeout(r, 400));

      // 3. Capture PNG
      const imgData = await htmlToImage.toPng(targetRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: false,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          overflow: 'hidden',
          ...EXPORT_FONT_STYLE,
        }
      });

      // 4. Restore original element styling
      if (isShort) {
        targetRef.current.classList.remove('export-short-mode');
      }
      targetRef.current.style.width = originalWidth;
      targetRef.current.style.height = originalHeight;
      targetRef.current.style.maxHeight = originalMaxHeight;
      targetRef.current.style.overflow = originalOverflow;
      targetRef.current.style.position = originalPosition;
      targetRef.current.style.padding = originalPadding;
      targetRef.current.style.backgroundColor = originalBg;
      targetRef.current.style.display = originalDisplay;
      document.getElementById('hide-scrollbar-line-temp')?.remove();

      // 5. Upload Captured PNG to tmpfiles.org temporary CDN
      setStatus({ type: 'info', text: 'Đang tải ảnh lên máy chủ trung gian...' });
      const formData = new FormData();
      const blob = base64ToBlob(imgData, 'image/png');
      formData.append('file', blob, `tnb_leader_${Date.now()}.png`);

      const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadRes.ok) {
        throw new Error(`Cổng tải ảnh báo lỗi HTTP: ${uploadRes.status}`);
      }

      const uploadData = await uploadRes.json();
      if (uploadData.status !== 'success' || !uploadData.data?.url) {
        throw new Error('Không lấy được đường dẫn ảnh tạm thời');
      }

      // Convert direct url format to raw download url
      const directUrl = uploadData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');

      // 6. Trigger Proxy Netlify Function to bypass CORS and send directly to LINE group chat
      setStatus({ type: 'info', text: 'Đang chuyển tiếp ảnh trực tiếp đến Nhóm LINE...' });
      const response = await fetch('/.netlify/functions/send-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: directUrl,
          channelAccessToken: token.trim(),
          groupId: groupId.trim()
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Lỗi từ LINE API: ${response.status}`);
      }

      setStatus({ type: 'success', text: '🚀 Đã gửi ảnh báo cáo trực tiếp đến Nhóm LINE thành công!' });
      setTimeout(() => setStatus(null), 5000);
    } catch (err: any) {
      console.error('[LineExportPanel] Error sending to LINE:', err);
      setStatus({ type: 'error', text: `Gửi thất bại: ${err.message || 'Lỗi không xác định'}` });
    } finally {
      // 7. Switch back to the original tab
      if (originalTab !== requiredTab) {
        setActiveTab(originalTab);
      }
      setIsSending(false);
    }
  };

  return (
    <div className="bg-[#06C755]/10 border border-[#06C755]/30 rounded-3xl p-4 shadow-sm w-full xl:w-[320px] space-y-3 font-sans relative">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-[#06C755] uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="animate-spin-slow" />
          LINE Export Centre
        </h3>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
            showConfig 
              ? 'bg-slate-200 text-slate-700 border-slate-300' 
              : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
          }`}
          title="Cấu hình tài khoản LINE Bot"
        >
          <Settings size={14} />
        </button>
      </div>

      {showConfig ? (
        <div className="bg-white border border-[#06C755]/20 rounded-2xl p-3 space-y-2.5 shadow-inner">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
            <HelpCircle size={10} /> CẤU HÌNH KẾT NỐI LINE
          </div>
          <div className="space-y-2">
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Channel Access Token</label>
              <input
                type="password"
                placeholder="Nhập token LINE bot..."
                value={token}
                onChange={e => setToken(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 outline-none focus:bg-white focus:border-[#06C755] transition-all"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">LINE Group ID</label>
              <input
                type="text"
                placeholder="Ví dụ: C349dff..."
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 outline-none focus:bg-white focus:border-[#06C755] transition-all"
              />
            </div>
          </div>
          <div className="flex gap-1.5 pt-1">
            <button
              onClick={handleSaveConfig}
              className="flex-1 py-1.5 bg-[#06C755] hover:bg-[#05b04b] text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Lưu cấu hình
            </button>
            <button
              onClick={() => setShowConfig(false)}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Huỷ
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-[9.5px] font-black text-slate-700 uppercase tracking-wider mb-1.5">
              Chọn bảng báo cáo để gửi:
            </label>
            <select
              value={selectedTable}
              onChange={e => setSelectedTable(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-[#06C755] transition-all shadow-sm"
            >
              <option value="rtTableRef_short">1. Bảng Vùng (Rút gọn)</option>
              <option value="rtTableRef_full">2. Bảng Vùng (Đầy đủ)</option>
              <option value="tableRef_short">3. Bảng Siêu thị (Rút gọn)</option>
              <option value="tableRef_full">4. Bảng Siêu thị (Đầy đủ)</option>
              <option value="chiTietTableRef">5. Bảng Chi tiết Nhóm</option>
              <option value="xepHangTableRef">6. Bảng Xếp hạng</option>
              <option value="khoTableRef">7. Bảng Kho</option>
              <option value="tgdTableRef">8. Bảng Thế Giới Di Động</option>
              <option value="dmxTableRef">9. Bảng Điện Máy Xanh</option>
              <option value="vungScorecardRef">10. Bảng Vùng Scorecard</option>
            </select>
          </div>

          <button
            onClick={handleSendToLine}
            disabled={isSending}
            className="w-full py-2.5 bg-[#06C755] hover:bg-[#05b04b] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#06C755]/10 active:scale-[0.98] cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {isSending ? 'Đang gửi...' : 'Gửi trực tiếp lên LINE'}
          </button>
        </div>
      )}

      {status && (
        <div className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] font-bold ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          status.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
          'bg-blue-50 text-blue-800 border-blue-200 animate-pulse'
        }`}>
          {status.type === 'success' ? (
            <CheckCircle2 size={14} className="shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle size={14} className={`shrink-0 mt-0.5 ${status.type === 'error' ? 'text-rose-600' : 'text-blue-600'}`} />
          )}
          <span>{status.text}</span>
        </div>
      )}
    </div>
  );
};
