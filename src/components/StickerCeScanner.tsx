import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Camera, Trash2, CheckCircle, Smartphone, AlertTriangle, Play, Square, Plus, RefreshCw } from 'lucide-react';

export default function StickerCeScanner() {
  const [sessionToken, setSessionToken] = useState<string>('');
  const [storeName, setStoreName] = useState<string>('');
  const [scannedCodes, setScannedCodes] = useState<string[]>([]);
  
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1 });
  const [currentZoom, setCurrentZoom] = useState(1);

  const scannerRef = useRef<any>(null);
  const playBeepRef = useRef<() => void>(() => {});

  // Parse session and store from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session') || '';
    const store = params.get('store') || '';
    setSessionToken(session);
    setStoreName(store);
  }, []);

  // Synthetic Audio Beep generator using Web Audio API
  useEffect(() => {
    const playBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 1000; // 1000Hz frequency
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
        
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        console.warn('Audio beep failed:', e);
      }
    };
    playBeepRef.current = playBeep;
  }, []);

  // Fetch initial scanned codes for session
  useEffect(() => {
    if (!sessionToken) return;
    const fetchSession = async () => {
      try {
        setSyncStatus('syncing');
        const { data, error } = await supabase
          .from('scanner_sessions')
          .select('*')
          .eq('id', sessionToken)
          .maybeSingle();

        if (error) {
          console.error('Error fetching scanner session:', error);
          setSyncStatus('error');
          return;
        }

        if (data && data.scanned_codes) {
          try {
            const codes = JSON.parse(data.scanned_codes);
            setScannedCodes(codes);
            setSyncStatus('synced');
          } catch (e) {
            console.error('Error parsing session scanned codes:', e);
            setSyncStatus('error');
          }
        } else {
          setSyncStatus('synced');
        }
      } catch (err) {
        console.error('Error in fetchSession:', err);
        setSyncStatus('error');
      }
    };

    fetchSession();
  }, [sessionToken]);

  // Load html5-qrcode script from CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setScanError('Không thể tải thư viện quét camera từ CDN. Vui lòng kiểm tra kết nối mạng.');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Start scanning when camera list or selected camera ID changes
  const startScanning = async (deviceId: string) => {
    if (!scannerRef.current || !deviceId) return;
    setIsScanning(true);
    setScanError(null);
    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      
      await scannerRef.current.start(
        deviceId,
        {
          fps: 15,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          },
          aspectRatio: 1.0
        },
        (decodedText: string) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame error (regular frame-by-frame scanner updates)
        }
      );

      // Autofocus & zoom capabilities extraction (Fast close-up macro autofocus)
      setTimeout(async () => {
        try {
          if (scannerRef.current && scannerRef.current.isScanning) {
            await scannerRef.current.applyVideoConstraints({
              focusMode: 'continuous'
            });
          }
        } catch (e) {
          console.warn('html5-qrcode applyVideoConstraints focusMode continuous error:', e);
        }

        try {
          const video = document.querySelector('#reader video') as HTMLVideoElement | null;
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities: any = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
              const advanced: any = [];
              
              if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                advanced.push({ focusMode: 'continuous' });
              }
              
              if (capabilities.focusDistance) {
                // Set to minimum focus distance to simulate macro close-up autofocus
                advanced.push({ focusDistance: capabilities.focusDistance.min || 0 });
              }

              if (advanced.length > 0) {
                await track.applyConstraints({ advanced });
                console.log('Successfully applied macro autofocus constraints:', advanced);
              }

              if (capabilities.zoom) {
                setZoomSupported(true);
                setZoomRange({
                  min: capabilities.zoom.min || 1,
                  max: capabilities.zoom.max || 1
                });
                setCurrentZoom(1);
              } else {
                setZoomSupported(false);
              }
            }
          }
        } catch (err) {
          console.warn('Failed to apply track-level macro autofocus constraints:', err);
        }
      }, 1200);

    } catch (err: any) {
      console.error('Failed to start camera scan:', err);
      setScanError('Không thể mở camera. Hãy thử chọn camera khác hoặc cấp quyền.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      setIsScanning(false);
    }
    setZoomSupported(false);
  };

  const handleZoomChange = async (val: number) => {
    try {
      setCurrentZoom(val);
      const video = document.querySelector('#reader video') as HTMLVideoElement | null;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            advanced: [{ zoom: val } as any]
          });
        }
      }
    } catch (err) {
      console.error('Error adjusting camera zoom:', err);
    }
  };

  // Initialize scanner instance when library loads
  useEffect(() => {
    if (!scriptLoaded) return;

    try {
      const scanner = new (window as any).Html5Qrcode('reader');
      scannerRef.current = scanner;

      (window as any).Html5Qrcode.getCameras().then((devices: any[]) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prioritize back camera
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment') ||
            device.label.toLowerCase().includes('sau')
          );
          const defaultId = backCamera ? backCamera.id : devices[0].id;
          setSelectedCameraId(defaultId);
          startScanning(defaultId);
        } else {
          setScanError('Không tìm thấy camera trên thiết bị này.');
        }
      }).catch((err: any) => {
        console.error('Error getting cameras:', err);
        setScanError('Vui lòng cấp quyền truy cập camera trong cài đặt trình duyệt của bạn.');
      });
    } catch (err) {
      console.error('Error initializing scanner:', err);
      setScanError('Không thể khởi tạo camera quét.');
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [scriptLoaded]);

  // Handle successful scan
  const handleScanSuccess = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    // Beep and vibrate
    playBeepRef.current();
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    setScannedCodes(prev => {
      if (prev.includes(cleanCode)) return prev;
      const nextCodes = [cleanCode, ...prev];
      syncWithDb(nextCodes);
      return nextCodes;
    });
  };

  // Synchronize array list with Database (Firestore)
  const syncWithDb = async (codesList: string[]) => {
    if (!sessionToken) return;
    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('scanner_sessions')
        .upsert({
          id: sessionToken,
          store_id: storeName,
          scanned_codes: JSON.stringify(codesList)
        }, { onConflict: 'id' });

      if (error) {
        console.error('Sync error:', error);
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
      }
    } catch (e) {
      console.error('Sync error in upsert:', e);
      setSyncStatus('error');
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = manualCode.trim();
    if (!cleanCode) return;

    setScannedCodes(prev => {
      if (prev.includes(cleanCode)) return prev;
      const nextCodes = [cleanCode, ...prev];
      syncWithDb(nextCodes);
      return nextCodes;
    });
    setManualCode('');
  };

  const handleDeleteCode = (codeToDelete: string) => {
    setScannedCodes(prev => {
      const nextCodes = prev.filter(c => c !== codeToDelete);
      syncWithDb(nextCodes);
      return nextCodes;
    });
  };

  const handleClearAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ danh sách đã quét?')) {
      setScannedCodes([]);
      syncWithDb([]);
    }
  };

  if (!sessionToken) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-6">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black mb-2 uppercase tracking-wide">Phiên Quét Không Hợp Lệ</h2>
        <p className="text-sm text-slate-400 max-w-sm">
          Đường dẫn quét thiếu thông tin phiên làm việc. Vui lòng quét lại mã QR hiển thị trên màn hình máy tính của bạn.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 md:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
            <Smartphone size={20} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase leading-tight">MÁY QUÉT TỒN KHO</h1>
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px] block mt-0.5">{storeName || 'SIÊU THỊ ĐANG CHỌN'}</span>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-1.5 bg-slate-950/50 px-2.5 py-1.5 rounded-full border border-slate-800">
          <div className={`w-2 h-2 rounded-full ${
            syncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' :
            syncStatus === 'syncing' ? 'bg-amber-500 animate-spin border border-dashed border-white' : 'bg-rose-500'
          }`} />
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-300">
            {syncStatus === 'synced' ? 'Đã đồng bộ' :
             syncStatus === 'syncing' ? 'Đang đồng bộ' : 'Lỗi kết nối'}
          </span>
        </div>
      </div>

      {/* Main Scanner Box */}
      <div className="relative bg-black flex-1 flex flex-col justify-center overflow-hidden min-h-0">
        {/* HTML5 QR Container */}
        <div id="reader" className="w-full h-full object-cover"></div>
        
        {/* Zoom controller overlay */}
        {zoomSupported && zoomRange.max > 1 && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 z-30 shadow-lg">
            <button
              type="button"
              onClick={() => handleZoomChange(1)}
              className={`text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                currentZoom === 1 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              1x
            </button>
            {zoomRange.max >= 2 && (
              <button
                type="button"
                onClick={() => handleZoomChange(Math.min(2, zoomRange.max))}
                className={`text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  currentZoom > 1 && currentZoom <= 2.5 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                2x
              </button>
            )}
            {zoomRange.max >= 3 && (
              <button
                type="button"
                onClick={() => handleZoomChange(Math.min(3, zoomRange.max))}
                className={`text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  currentZoom > 2.5 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                3x
              </button>
            )}
          </div>
        )}

        {/* Scan Frame Overlay overlayed on top if isScanning */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Dark mask outside the scanner frame */}
            <div className="w-48 h-48 border-2 border-emerald-500 rounded-3xl relative flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              {/* Laser line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] top-1/2 -translate-y-1/2 animate-[pulse_1.5s_infinite]" />
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
            </div>
            <p className="mt-8 text-xs font-bold text-slate-300 uppercase tracking-widest bg-slate-900/80 px-4 py-2 rounded-full backdrop-blur-sm shadow-md">
              Đặt mã vạch vào khung hình
            </p>
          </div>
        )}

        {scanError && (
          <div className="absolute inset-x-4 top-4 bg-rose-500/90 text-white text-xs font-bold p-3.5 rounded-2xl flex items-center gap-3 backdrop-blur-sm shadow-lg z-20">
            <AlertTriangle size={18} className="shrink-0" />
            <p>{scanError}</p>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="bg-slate-900 px-4 py-4 border-t border-slate-800 space-y-3 shrink-0">
        <div className="flex gap-2">
          {/* Camera Selection Dropdown */}
          <div className="flex-1 relative">
            <select
              value={selectedCameraId}
              onChange={(e) => {
                setSelectedCameraId(e.target.value);
                startScanning(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 py-2.5 px-3 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
            >
              <option value="">-- Chọn Camera --</option>
              {cameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
            <Camera size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          {/* Toggle Scan Button */}
          <button
            onClick={() => {
              if (isScanning) {
                stopScanning();
              } else {
                startScanning(selectedCameraId);
              }
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
              isScanning 
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/20' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20'
            }`}
          >
            {isScanning ? (
              <>
                <Square size={14} fill="currentColor" /> Tạm dừng
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Tiếp tục
              </>
            )}
          </button>
        </div>

        {/* Manual Barcode Input Form */}
        <form onSubmit={handleManualAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập mã sản phẩm bằng tay..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-white py-2.5 px-4 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> Thêm
          </button>
        </form>
      </div>

      {/* Scanned List Box */}
      <div className="bg-slate-950 p-4 flex-1 max-h-[200px] md:max-h-[300px] flex flex-col min-h-[120px] md:min-h-[180px] shrink-0 border-t border-slate-900">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">DANH SÁCH ĐÃ QUÉT</h3>
            <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-black px-2 py-0.5 rounded-full">
              {scannedCodes.length} sản phẩm
            </span>
          </div>
          {scannedCodes.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[10px] font-black text-rose-500 uppercase hover:underline"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {/* Scrollable Scanned List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
          {scannedCodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-1.5">
              <Smartphone size={24} className="stroke-[1.5]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-center">Chưa quét sản phẩm nào</span>
            </div>
          ) : (
            scannedCodes.map((code, idx) => (
              <div
                key={`${code}-${idx}`}
                className="bg-slate-900 border border-slate-800/60 px-3 py-2 rounded-xl flex items-center justify-between shadow-sm animate-[fadeIn_0.2s_ease-out]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-slate-500 w-5 text-center">{scannedCodes.length - idx}</span>
                  <span className="text-xs font-black font-mono tracking-wider text-indigo-400">{code}</span>
                </div>
                <button
                  onClick={() => handleDeleteCode(code)}
                  className="text-slate-500 hover:text-rose-500 p-1.5 rounded-lg hover:bg-slate-950/60 transition-colors"
                  title="Xóa mã này"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
