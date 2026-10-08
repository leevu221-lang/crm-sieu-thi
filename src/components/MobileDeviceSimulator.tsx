import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  RotateCw,
  RefreshCw,
  X,
  ChevronDown,
  Check,
  Sliders
} from 'lucide-react';

export interface DevicePreset {
  id: string;
  name: string;
  category: 'ios' | 'android' | 'fold' | 'custom';
  width: number;
  height: number;
  osName: string;
  badge?: string;
  hasDynamicIsland?: boolean;
  hasPunchHole?: boolean;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone-18-pro-max',
    name: 'iPhone 18 Pro Max',
    category: 'ios',
    width: 440,
    height: 956,
    osName: 'iOS 20 Ultra',
    badge: 'Mới nhất • Màn cực đại',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-17-pro-max',
    name: 'iPhone 17 Pro Max',
    category: 'ios',
    width: 432,
    height: 936,
    osName: 'iOS 19 Max',
    badge: 'Màn hình lớn',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-17-18-pro',
    name: 'iPhone 17 / 18 Pro',
    category: 'ios',
    width: 402,
    height: 874,
    osName: 'iOS 19 / 20',
    badge: 'Chuẩn Pro mới',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 Pro Max',
    category: 'ios',
    width: 430,
    height: 932,
    osName: 'iOS 18 Max',
    badge: 'Màn hình lớn',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    category: 'ios',
    width: 393,
    height: 852,
    osName: 'iOS 18',
    badge: 'Chuẩn iOS',
    hasDynamicIsland: true
  },
  {
    id: 'iphone-15-standard',
    name: 'iPhone 15 / 14 / 13',
    category: 'ios',
    width: 390,
    height: 844,
    osName: 'iOS Standard',
    badge: 'Phổ biến',
    hasDynamicIsland: true
  },
  {
    id: 'samsung-s24',
    name: 'Samsung Galaxy S24 / S25',
    category: 'android',
    width: 412,
    height: 915,
    osName: 'Android 15 (OneUI)',
    badge: 'Chuẩn Android',
    hasPunchHole: true
  },
  {
    id: 'galaxy-z-fold-open',
    name: 'Galaxy Z Fold 7 / 8 (Mở rộng)',
    category: 'fold',
    width: 768,
    height: 960,
    osName: 'Foldable Android',
    badge: 'Màn hình gập lớn',
    hasPunchHole: true
  },
  {
    id: 'xiaomi-redmi',
    name: 'Xiaomi / OPPO / Vivo',
    category: 'android',
    width: 392,
    height: 872,
    osName: 'Android (HyperOS/ColorOS)',
    badge: 'Đa dòng máy',
    hasPunchHole: true
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE / 8',
    category: 'ios',
    width: 375,
    height: 667,
    osName: 'iOS Compact',
    badge: 'Màn hình nhỏ'
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
      return localStorage.getItem('sim_selected_device') || 'iphone-18-pro-max';
    } catch {
      return 'iphone-18-pro-max';
    }
  });
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<string>('auto');
  const [customWidth, setCustomWidth] = useState<number>(390);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const deviceMenuRef = useRef<HTMLDivElement>(null);

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

  // Close device menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deviceMenuRef.current && !deviceMenuRef.current.contains(e.target as Node)) {
        setIsDeviceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        name: 'Tùy biến chiều rộng',
        category: 'custom' as const,
        width: customWidth,
        height: 844,
        osName: 'Responsive',
        badge: 'Custom',
        hasDynamicIsland: true
      };
    }
    return DEVICE_PRESETS.find(d => d.id === selectedDeviceId) || DEVICE_PRESETS[0];
  }, [selectedDeviceId, customWidth]);

  const effectiveWidth = isLandscape ? currentDevice.height : currentDevice.width;
  const effectiveHeight = isLandscape ? currentDevice.width : currentDevice.height;

  // Công thức Auto Scale khớp chính xác 100% như trang mẫu Hình 1 (tra-cuu-loi-loc):
  // Chiều cao có sẵn = window.innerHeight - 56px (toolbar) - 44px (khoảng thở trên dưới + caption)
  // Điện thoại tận dụng tối đa không gian dọc để hiển thị to lớn bề thế.
  const autoScale = useMemo(() => {
    const availableH = Math.max(300, windowDimensions.height - 56 - 44);
    const availableW = Math.max(300, windowDimensions.width - 40);
    const chassisBorder = 22; // 11px viền kim loại mỗi bên
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
      {/* ── TOP CONTROL TOOLBAR ── */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 shadow-md relative z-50">
        {/* Left: App Title Badge + Device Selector Popover + Scale Selector */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Badge: GIẢ LẬP MOBILE */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Smartphone size={15} className="shrink-0 animate-pulse text-sky-400" />
            <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">
              Giả Lập Mobile
            </span>
          </div>

          {/* Device Selector Popover Menu (Khớp chuẩn giao diện hình người dùng cung cấp) */}
          <div ref={deviceMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-slate-100 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="font-bold max-w-[150px] sm:max-w-[190px] truncate">
                {currentDevice.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({effectiveWidth}×{effectiveHeight})
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform ${isDeviceMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu Card */}
            {isDeviceMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-[fadeIn_0.15s_ease-out]">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  CHỌN DÒNG ĐIỆN THOẠI MÔ PHỎNG
                </div>
                <div className="max-h-[420px] overflow-y-auto no-scrollbar py-1 space-y-1">
                  {DEVICE_PRESETS.map((device) => {
                    const isSelected = selectedDeviceId === device.id;
                    return (
                      <button
                        key={device.id}
                        type="button"
                        onClick={() => {
                          setSelectedDeviceId(device.id);
                          setIsDeviceMenuOpen(false);
                          try {
                            localStorage.setItem('sim_selected_device', device.id);
                          } catch {}
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-sm shrink-0">
                            {device.category === 'ios' ? '🍏' : '🤖'}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{device.name}</div>
                            <div className={`text-[10px] font-mono ${isSelected ? 'text-slate-900/80' : 'text-slate-400'}`}>
                              {device.width} × {device.height} px • {device.osName}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="shrink-0 font-black" />}
                      </button>
                    );
                  })}

                  {/* Custom Width Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeviceId('custom');
                      setIsDeviceMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      selectedDeviceId === 'custom'
                        ? 'bg-sky-500 text-slate-950 font-black shadow-md'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Sliders size={15} className="shrink-0 text-slate-400" />
                      <div>
                        <div className="font-bold">Tùy biến chiều rộng</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {customWidth}px (Thanh trượt tự do)
                        </div>
                      </div>
                    </div>
                    {selectedDeviceId === 'custom' && <Check size={14} className="shrink-0 font-black" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Slider if custom width is selected */}
          {selectedDeviceId === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
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
              className="bg-slate-800 text-slate-100 border border-slate-700 hover:border-sky-400 focus:border-sky-400 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer transition-colors"
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
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
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
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
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

      {/* ── STAGE VIEWPORT (Khớp chuẩn kích thước lớn như Hình 1) ── */}
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

        {/* DIMENSION & DEVICE INFO CAPTION */}
        <div className="mt-2.5 text-xs font-medium text-slate-400 tracking-wide text-center shrink-0">
          📱 Đang mô phỏng: <strong className="text-sky-400 font-bold">{currentDevice.name}</strong> ({effectiveWidth} × {effectiveHeight} px - {isLandscape ? 'Ngang' : 'Dọc'}) - Tỷ lệ hiển thị: <span className="font-bold text-slate-200">{Math.round(activeScale * 100)}%</span>
        </div>
      </main>
    </div>,
    document.body
  );
};

export default MobileDeviceSimulator;
