import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  Monitor,
  RotateCw,
  RefreshCw,
  X,
  ExternalLink,
  ChevronDown,
  Sliders,
  Check,
  Sparkles,
  Maximize2
} from 'lucide-react';

export interface DevicePreset {
  id: string;
  name: string;
  category: 'ios' | 'android' | 'custom';
  width: number;
  height: number;
  osName: string;
  badge: string;
  frameRadius: number;
  screenRadius: number;
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
    frameRadius: 58,
    screenRadius: 48,
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
    frameRadius: 56,
    screenRadius: 46,
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
    frameRadius: 54,
    screenRadius: 44,
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
    frameRadius: 56,
    screenRadius: 46,
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
    frameRadius: 54,
    screenRadius: 44,
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
    frameRadius: 50,
    screenRadius: 42,
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
    frameRadius: 46,
    screenRadius: 36,
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
    frameRadius: 46,
    screenRadius: 36,
    hasPunchHole: true
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE / 8',
    category: 'ios',
    width: 375,
    height: 667,
    osName: 'iOS Compact',
    badge: 'Màn hình nhỏ',
    frameRadius: 40,
    screenRadius: 20
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
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('iphone-18-pro-max');
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [showChassis, setShowChassis] = useState<boolean>(true);
  const [scaleMode, setScaleMode] = useState<'fit' | '100' | '90' | '80' | '75'>('fit');
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

  // Close device menu on outside click
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
        name: 'Tùy Chỉnh Kích Thước',
        category: 'custom' as const,
        width: customWidth,
        height: 844,
        osName: 'Responsive',
        badge: 'Custom',
        frameRadius: 40,
        screenRadius: 30
      };
    }
    return DEVICE_PRESETS.find(d => d.id === selectedDeviceId) || DEVICE_PRESETS[0];
  }, [selectedDeviceId, customWidth]);

  const effectiveWidth = isLandscape ? currentDevice.height : currentDevice.width;
  const effectiveHeight = isLandscape ? currentDevice.width : currentDevice.height;

  // Compute auto-fit scale
  const availableH = Math.max(300, windowDimensions.height - 110);
  const availableW = Math.max(300, windowDimensions.width - 48);

  const fitScale = useMemo(() => {
    const targetH = effectiveHeight + (showChassis ? 28 : 0);
    const targetW = effectiveWidth + (showChassis ? 28 : 0);
    const scaleH = availableH / targetH;
    const scaleW = availableW / targetW;
    return Math.min(1, Math.min(scaleH, scaleW) * 0.98);
  }, [effectiveHeight, effectiveWidth, availableH, availableW, showChassis]);

  const activeScale = scaleMode === 'fit' ? fitScale : parseFloat(scaleMode) / 100;

  // Generate target URL for iframe: same origin + same path + same query + is_mobile_sim=1
  const iframeUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const url = new URL(window.location.href);
    url.searchParams.set('is_mobile_sim', '1');
    return url.toString();
  }, [iframeKey]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex flex-col overflow-hidden text-white font-sans select-none animate-[fadeIn_0.2s_ease-out]">
      {/* ── TOP CONTROL TOOLBAR ── */}
      <header className="h-14 sm:h-16 border-b border-slate-800 bg-slate-900/90 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-lg relative z-20">
        {/* Left cluster: App title & Device Preset Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400">
            <Smartphone size={16} className="text-sky-400 animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-wider whitespace-nowrap">
              Giả Lập Mobile
            </span>
          </div>

          {/* Device Preset Selector */}
          <div ref={deviceMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsDeviceMenuOpen(!isDeviceMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-slate-100 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="max-w-[120px] sm:max-w-[170px] truncate">{currentDevice.name}</span>
              <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono">
                ({effectiveWidth}×{effectiveHeight})
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${isDeviceMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDeviceMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-[fadeIn_0.15s_ease-out]">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  Chọn dòng điện thoại mô phỏng
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
                      <Sliders size={15} className="shrink-0" />
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

          {/* Slider if custom width */}
          {selectedDeviceId === 'custom' && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Rộng:</span>
              <input
                type="range"
                min="320"
                max="480"
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value))}
                className="w-24 accent-sky-400 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-sky-400">{customWidth}px</span>
            </div>
          )}
        </div>

        {/* Center cluster: Orientation, Chassis & Zoom controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Rotate Portrait / Landscape */}
          <button
            type="button"
            onClick={() => setIsLandscape(!isLandscape)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isLandscape
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-700'
            }`}
            title={isLandscape ? 'Chuyển sang màn hình Dọc' : 'Chuyển sang màn hình Ngang'}
          >
            <RotateCw size={14} className={isLandscape ? 'rotate-90 transition-transform' : ''} />
            <span className="hidden md:inline">{isLandscape ? 'Màn Ngang' : 'Màn Dọc'}</span>
          </button>

          {/* Toggle Chassis */}
          <button
            type="button"
            onClick={() => setShowChassis(!showChassis)}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              showChassis
                ? 'bg-slate-800 text-sky-400 border-sky-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Bật/Tắt khung viền điện thoại"
          >
            <Maximize2 size={14} />
            <span className="hidden md:inline">{showChassis ? 'Có Khung Máy' : 'Tràn Viền'}</span>
          </button>

          {/* Scale Presets */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
            {(['fit', '100', '80'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScaleMode(mode)}
                className={`px-2 py-1 rounded-lg text-[10.5px] font-bold uppercase transition-all cursor-pointer ${
                  scaleMode === mode
                    ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === 'fit' ? 'Vừa Màn' : `${mode}%`}
              </button>
            ))}
          </div>

          {/* Reload Frame */}
          <button
            type="button"
            onClick={() => {
              setIsIframeLoading(true);
              setIframeKey((k) => k + 1);
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Tải lại khung hình mobile"
          >
            <RefreshCw size={14} className={isIframeLoading ? 'animate-spin text-sky-400' : ''} />
          </button>
        </div>

        {/* Right cluster: Exit / Back to Desktop button */}
        <div className="flex items-center gap-2">
          {/* Popout New Window */}
          <button
            type="button"
            onClick={() => {
              const w = effectiveWidth;
              const h = effectiveHeight;
              window.open(iframeUrl, '_blank', `width=${w},height=${h},menubar=no,status=no,toolbar=no`);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            title="Mở cửa sổ popup riêng biệt"
          >
            <ExternalLink size={13} />
            <span className="hidden xl:inline">Cửa Sổ Riêng</span>
          </button>

          {/* BACK TO DESKTOP BUTTON */}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-sky-500/25 cursor-pointer border border-sky-400/30"
            title="Thoát chế độ mô phỏng, quay lại toàn màn hình Desktop (Phím tắt: Esc)"
          >
            <Monitor size={15} className="shrink-0" />
            <span>Quay Lại Desktop</span>
          </button>

          {/* Close X */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Đóng (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── STUDIO CANVAS VIEWPORT ── */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-4 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-[#030712]">
        {/* Subtle grid pattern for authentic studio workspace feel */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #38bdf8 1px, transparent 1px),
              linear-gradient(to bottom, #38bdf8 1px, transparent 1px)
            `,
            backgroundSize: '36px 36px'
          }}
        />

        {/* Scaled Device Wrapper */}
        <div
          className="relative transition-transform duration-200 ease-out origin-center shrink-0 flex items-center justify-center"
          style={{
            transform: `scale(${activeScale})`,
            width: `${effectiveWidth + (showChassis ? 24 : 0)}px`,
            height: `${effectiveHeight + (showChassis ? 24 : 0)}px`
          }}
        >
          {/* PHONE CHASSIS CONTAINER */}
          <div
            className={`relative w-full h-full flex flex-col overflow-hidden transition-all duration-300 ${
              showChassis
                ? 'bg-slate-900 border-[10px] sm:border-[12px] border-[#1e2433] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(56,189,248,0.15)] ring-1 ring-white/10'
                : 'rounded-2xl border-2 border-slate-700 shadow-2xl'
            }`}
            style={{
              borderRadius: showChassis ? `${currentDevice.frameRadius}px` : '18px'
            }}
          >
            {/* Dynamic Island / Punch Hole (iOS / Android) */}
            {showChassis && !isLandscape && (
              <>
                {currentDevice.hasDynamicIsland && (
                  <div
                    className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 h-[26px] w-[96px] bg-black rounded-full flex items-center justify-end pr-2.5 shadow-md pointer-events-none transition-all"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                  </div>
                )}
                {currentDevice.hasPunchHole && (
                  <div
                    className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-3.5 h-3.5 bg-black rounded-full border border-slate-800 shadow-xs pointer-events-none"
                  />
                )}
              </>
            )}

            {/* SCREEN AREA WITH IFRAME */}
            <div
              className="relative flex-1 w-full h-full bg-white overflow-hidden"
              style={{
                borderRadius: showChassis ? `${currentDevice.screenRadius}px` : '14px'
              }}
            >
              {/* Loading Overlay */}
              {isIframeLoading && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-white pointer-events-none">
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
                onLoad={() => setIsIframeLoading(false)}
                className="w-full h-full border-0 bg-white"
                style={{
                  width: '100%',
                  height: '100%',
                  WebkitOverflowScrolling: 'touch'
                }}
                title={`Mô phỏng ${currentDevice.name}`}
              />

              {/* iOS Home Indicator Bar */}
              {showChassis && !isLandscape && currentDevice.category === 'ios' && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 w-32 h-1 bg-slate-900/60 rounded-full pointer-events-none" />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── BOTTOM STATUS BADGE ── */}
      <footer className="h-8 bg-slate-900/80 border-t border-slate-800/80 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-sky-400" />
          <span>Mô phỏng môi trường Mobile thật: Viewport CSS, Touch Scroll, Media Queries &amp; Breakpoints.</span>
        </div>
        <div className="font-mono text-slate-400 hidden sm:block">
          {currentDevice.name} • {effectiveWidth}×{effectiveHeight}px (Tỉ lệ: {Math.round(activeScale * 100)}%)
        </div>
      </footer>
    </div>,
    document.body
  );
};

export default MobileDeviceSimulator;
