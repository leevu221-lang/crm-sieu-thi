import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  RotateCw,
  RefreshCw,
  X
} from 'lucide-react';

export interface DevicePreset {
  id: string;
  name: string;
  category: 'ios' | 'android' | 'fold' | 'custom';
  width: number;
  height: number;
  osName: string;
  hasDynamicIsland?: boolean;
  hasPunchHole?: boolean;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone-13',
    name: '🍎 iPhone 13 / 14 / 12',
    category: 'ios',
    width: 390,
    height: 844,
    osName: 'iOS Standard',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-17-18-pro-max',
    name: '🍎 iPhone 17 / 18 Pro Max',
    category: 'ios',
    width: 440,
    height: 956,
    osName: 'iOS 19 / 20',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-16-pro-max',
    name: '🍎 iPhone 16 Pro Max',
    category: 'ios',
    width: 430,
    height: 932,
    osName: 'iOS 18 Max',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-15-pro',
    name: '🍎 iPhone 15 / 16 / 14 Pro',
    category: 'ios',
    width: 393,
    height: 852,
    osName: 'iOS 18',
    hasDynamicIsland: true
  },
  {
    id: 'samsung-s24',
    name: '🤖 Samsung Galaxy S24 / S25',
    category: 'android',
    width: 412,
    height: 915,
    osName: 'Android (OneUI)',
    hasPunchHole: true
  },
  {
    id: 'galaxy-z-fold-open',
    name: '🤖 Galaxy Z Fold 7 / 8 (Mở rộng)',
    category: 'fold',
    width: 768,
    height: 960,
    osName: 'Foldable Android',
    hasPunchHole: true
  },
  {
    id: 'galaxy-z-fold-cover',
    name: '🤖 Galaxy Z Fold 7 / 8 (Màn ngoài)',
    category: 'android',
    width: 374,
    height: 912,
    osName: 'Compact Android',
    hasPunchHole: true
  },
  {
    id: 'xiaomi-redmi',
    name: '🤖 Xiaomi Redmi / Galaxy dòng A',
    category: 'android',
    width: 360,
    height: 800,
    osName: 'Android (HyperOS)',
    hasPunchHole: true
  },
  {
    id: 'iphone-se',
    name: '🍎 iPhone SE / Compact',
    category: 'ios',
    width: 375,
    height: 667,
    osName: 'iOS Compact'
  },
  {
    id: 'custom',
    name: '⚙️ Tùy biến kích thước tự do',
    category: 'custom',
    width: 390,
    height: 844,
    osName: 'Custom'
  }
];

interface MobileDeviceSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDeviceSimulator: React.FC<MobileDeviceSimulatorProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    try {
      return localStorage.getItem('sim_selected_device') || 'iphone-13';
    } catch {
      return 'iphone-13';
    }
  });
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<string>('auto');
  const [customWidth, setCustomWidth] = useState<number>(390);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);

  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Escape key to close simulator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentDevice = useMemo(() => {
    if (selectedDeviceId === 'custom') {
      return {
        id: 'custom',
        name: '⚙️ Tùy biến kích thước',
        category: 'custom' as const,
        width: customWidth,
        height: 844,
        osName: 'Custom',
        hasDynamicIsland: true
      };
    }
    return DEVICE_PRESETS.find(d => d.id === selectedDeviceId) || DEVICE_PRESETS[0];
  }, [selectedDeviceId, customWidth]);

  const effectiveWidth = isLandscape ? currentDevice.height : currentDevice.width;
  const effectiveHeight = isLandscape ? currentDevice.width : currentDevice.height;

  // Công thức Auto Scale khớp chính xác 100% như trang mẫu Hình 1 (tra-cuu-loi-loc):
  // 56px toolbar + 44px không gian trên dưới = 100px.
  // Điện thoại tận dụng tối đa chiều cao hiển thị giúp kích thước to lớn, rõ nét.
  const autoScale = useMemo(() => {
    const availableH = Math.max(300, windowDimensions.height - 56 - 44);
    const availableW = Math.max(300, windowDimensions.width - 40);
    const chassisBorder = 22; // 11px viền mỗi bên
    const targetH = effectiveHeight + chassisBorder;
    const targetW = effectiveWidth + chassisBorder;
    const scaleH = availableH / targetH;
    const scaleW = availableW / targetW;
    const scale = Math.min(1, Math.min(scaleH, scaleW));
    return Math.max(0.35, Math.min(1, scale));
  }, [effectiveHeight, effectiveWidth, windowDimensions.height, windowDimensions.width]);

  const activeScale = scaleMode === 'auto' ? autoScale : parseFloat(scaleMode) || 1;

  // Generate target URL for iframe: same origin + same path + same query + is_mobile_sim=1
  const iframeUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const url = new URL(window.location.href);
    url.searchParams.set('is_mobile_sim', '1');
    return url.toString();
  }, [iframeKey]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-[#0f172a] flex flex-col overflow-hidden text-white font-sans select-none animate-[fadeIn_0.15s_ease-out]">
      {/* ── TOP CONTROL TOOLBAR (Khớp chuẩn Hình 1) ── */}
      <header className="h-14 bg-slate-800/95 border-b border-slate-700/80 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-md relative z-20">
        {/* Left: Badge + Device Select + Scale Select */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Title Badge */}
          <div className="flex items-center gap-1.5 text-sky-400 text-xs font-extrabold uppercase tracking-wide pr-3 border-r border-slate-700">
            <Smartphone size={16} className="shrink-0" />
            <span>Mô Phỏng Mobile</span>
          </div>

          {/* Device Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="sim-device-select" className="text-xs font-semibold text-slate-400 hidden sm:inline">
              Thiết bị:
            </label>
            <select
              id="sim-device-select"
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                try {
                  localStorage.setItem('sim_selected_device', e.target.value);
                } catch {}
              }}
              className="bg-slate-900 text-slate-100 border border-slate-700 hover:border-sky-400 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer max-w-[200px] sm:max-w-none transition-colors"
            >
              {DEVICE_PRESETS.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-100">
                  {d.name} ({d.width} × {d.height} px)
                </option>
              ))}
            </select>
          </div>

          {/* Custom Width Slider (nếu chọn tùy biến) */}
          {selectedDeviceId === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Rộng:</span>
              <input
                type="range"
                min="320"
                max="500"
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-20 accent-sky-400 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-sky-400">{customWidth}px</span>
            </div>
          )}

          {/* Scale Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="sim-scale-select" className="text-xs font-semibold text-slate-400 hidden sm:inline">
              Tỷ lệ:
            </label>
            <select
              id="sim-scale-select"
              value={scaleMode}
              onChange={(e) => setScaleMode(e.target.value)}
              className="bg-slate-900 text-slate-100 border border-slate-700 hover:border-sky-400 focus:border-sky-400 rounded-lg px-2 py-1.5 text-xs font-bold outline-none cursor-pointer transition-colors"
            >
              <option value="auto">Vừa màn hình (Auto)</option>
              <option value="1">100%</option>
              <option value="0.9">90%</option>
              <option value="0.85">85%</option>
              <option value="0.75">75%</option>
            </select>
          </div>
        </div>

        {/* Right: Rotate + Reload + Return to Desktop */}
        <div className="flex items-center gap-2">
          {/* Rotate Portrait / Landscape */}
          <button
            type="button"
            onClick={() => setIsLandscape(!isLandscape)}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title="Xoay dọc / ngang màn hình"
          >
            <RotateCw size={13} className={isLandscape ? 'rotate-90 transition-transform' : ''} />
            <span>{isLandscape ? 'Ngang' : 'Dọc'}</span>
          </button>

          {/* Reload Frame */}
          <button
            type="button"
            onClick={() => {
              setIsIframeLoading(true);
              setIframeKey((k) => k + 1);
            }}
            className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            title="Tải lại khung hình mobile"
          >
            <RefreshCw size={13} className={isIframeLoading ? 'animate-spin text-sky-400' : ''} />
            <span className="hidden sm:inline">Tải lại</span>
          </button>

          {/* RETURN TO DESKTOP BUTTON (Nút Đỏ Khớp Chuẩn Hình 1) */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 bg-[#ef4444] hover:bg-[#dc2626] active:scale-95 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-red-500/30 cursor-pointer transition-all border border-red-400/40"
            title="Quay lại giao diện Desktop (Phím tắt: ESC)"
          >
            <X size={15} />
            <span>Trở về Desktop</span>
          </button>
        </div>
      </header>

      {/* ── STAGE VIEWPORT (Khớp chuẩn tỉ lệ và kích thước Hình 1) ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 overflow-hidden relative bg-[#0f172a]">
        {/* REALISTIC PHONE CHASSIS */}
        <div
          className="relative bg-[#09090b] transition-transform duration-150 ease-out origin-center shrink-0 flex items-center justify-center"
          style={{
            border: '11px solid #27272a',
            borderRadius: '50px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 2px #52525b, inset 0 0 0 2px #09090b',
            transform: activeScale === 1 ? 'none' : `scale(${activeScale}) translateZ(0)`,
            transformOrigin: 'center center',
            willChange: activeScale === 1 ? 'auto' : 'transform',
            contain: 'layout'
          }}
        >
          {/* Physical Hardware Buttons (Volume & Power) */}
          {!isLandscape && (
            <>
              {/* Volume Up */}
              <div
                className="absolute -left-[15px] top-[110px] w-[4px] h-[48px] bg-[#3f3f46] rounded-l-[3px] pointer-events-none"
                title="Volume Up"
              />
              {/* Volume Down */}
              <div
                className="absolute -left-[15px] top-[170px] w-[4px] h-[48px] bg-[#3f3f46] rounded-l-[3px] pointer-events-none"
                title="Volume Down"
              />
              {/* Power Button */}
              <div
                className="absolute -right-[15px] top-[130px] w-[4px] h-[64px] bg-[#3f3f46] rounded-r-[3px] pointer-events-none"
                title="Power"
              />
            </>
          )}

          {/* PHONE SCREEN WRAPPER */}
          <div
            className="relative bg-white overflow-hidden flex flex-col"
            style={{
              width: `${effectiveWidth}px`,
              height: `${effectiveHeight}px`,
              borderRadius: '38px',
              contain: 'strict'
            }}
          >
            {/* Dynamic Island Notch (iOS) */}
            {!isLandscape && currentDevice.hasDynamicIsland && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 h-[24px] w-[105px] bg-black rounded-full flex items-center justify-center pointer-events-none shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#18181b] border border-slate-800" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#09090b]" />
                </div>
              </div>
            )}

            {/* Punch Hole Camera (Android) */}
            {!isLandscape && currentDevice.hasPunchHole && (
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 w-3.5 h-3.5 bg-black rounded-full border border-slate-800 pointer-events-none" />
            )}

            {/* iOS Home Indicator Bar */}
            {!isLandscape && currentDevice.category === 'ios' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 w-32 h-1 bg-black/50 rounded-full pointer-events-none" />
            )}

            {/* Loading Overlay */}
            {isIframeLoading && (
              <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center z-20 text-white pointer-events-none">
                <div className="w-8 h-8 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs font-bold tracking-wider uppercase text-sky-200">
                  Đang nạp giao diện...
                </span>
              </div>
            )}

            {/* LIVE WEB APPLICATION IFRAME */}
            <iframe
              key={iframeKey}
              src={iframeUrl}
              width={effectiveWidth}
              height={effectiveHeight}
              loading="eager"
              onLoad={() => setIsIframeLoading(false)}
              className="w-full h-full border-0 bg-white"
              style={{
                width: `${effectiveWidth}px`,
                height: `${effectiveHeight}px`,
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}
              title={`Mô phỏng ${currentDevice.name}`}
            />
          </div>
        </div>

        {/* DIMENSION & DEVICE INFO CAPTION (Khớp chuẩn Hình 1) */}
        <div className="mt-2.5 text-xs font-medium text-slate-400 tracking-wide text-center shrink-0">
          📱 Đang mô phỏng: <strong className="text-sky-400 font-bold">{currentDevice.name}</strong> ({effectiveWidth} × {effectiveHeight} px - {isLandscape ? 'Ngang' : 'Dọc'}) - Tỷ lệ hiển thị: <span className="font-bold text-slate-200">{Math.round(activeScale * 100)}%</span>
        </div>
      </main>
    </div>,
    document.body
  );
};

export default MobileDeviceSimulator;
