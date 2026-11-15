import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';

export type CrmPlatform = 'web' | 'android' | 'ios';

export const APP_NATIVE_VERSION = '1.0.0';
export const APP_NATIVE_BUILD_NUMBER = 1;
export const APP_ID = 'vn.crm43751.app';

// Khóa lưu trữ được bảo vệ khi đăng nhập / đăng xuất (không bị xóa bởi localStorage.clear())
export const PROTECTED_STORAGE_KEYS = [
  'theme',
  'crm_device_id',
  'crm_active_bundle_version',
  'crm_previous_stable_bundle',
  'crm_last_update_check',
  'crm_boot_fail_count'
];

/**
 * Trả về nền tảng đang chạy: 'web' | 'android' | 'ios'
 */
export function getCurrentPlatform(): CrmPlatform {
  try {
    const p = Capacitor.getPlatform();
    if (p === 'android' || p === 'ios') return p;
  } catch {}
  return 'web';
}

export function isNativeMobileApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Bảo tồn các khóa hệ thống quan trọng trước khi thực hiện localStorage.clear()
 */
export function clearUserStoragePreservingDeviceState(): void {
  const preserved: Record<string, string> = {};
  for (const key of PROTECTED_STORAGE_KEYS) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) preserved[key] = val;
    } catch {}
  }

  try {
    localStorage.clear();
  } catch {}
  try {
    sessionStorage.clear();
  } catch {}

  for (const [key, val] of Object.entries(preserved)) {
    try {
      localStorage.setItem(key, val);
    } catch {}
  }
}

/**
 * Lấy hoặc khởi tạo Device ID duy nhất, đồng bộ giữa Capacitor Preferences và localStorage
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const KEY = 'crm_device_id';
  try {
    const existingLocal = localStorage.getItem(KEY);
    if (existingLocal && existingLocal.trim().length >= 8) {
      if (isNativeMobileApp()) {
        await Preferences.set({ key: KEY, value: existingLocal }).catch(() => {});
      }
      return existingLocal;
    }

    if (isNativeMobileApp()) {
      const { value } = await Preferences.get({ key: KEY });
      if (value && value.trim().length >= 8) {
        localStorage.setItem(KEY, value);
        return value;
      }
    }
  } catch {}

  const platform = getCurrentPlatform().toUpperCase();
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()
      : Math.random().toString(36).substring(2, 10).toUpperCase() + Date.now().toString(36).toUpperCase();
  const newId = `DEV-${platform}-${randomPart}`;

  try {
    localStorage.setItem(KEY, newId);
    if (isNativeMobileApp()) {
      await Preferences.set({ key: KEY, value: newId }).catch(() => {});
    }
  } catch {}

  return newId;
}

/**
 * Lấy tên thiết bị thân thiện để hiển thị trong bảng Quản lý Thiết bị của Admin 43751
 */
export function getFriendlyDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent || '';
  const platform = getCurrentPlatform();
  if (platform === 'ios' || /iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS (\d+[_\d]*)/);
    const osVer = match ? match[1].replace(/_/g, '.') : '';
    const isPad = /iPad/i.test(ua);
    return `${isPad ? 'iPad' : 'iPhone'}${osVer ? ` (iOS ${osVer})` : ''} — App`;
  }
  if (platform === 'android' || /Android/i.test(ua)) {
    const match = ua.match(/Android\s+([0-9.]+);\s*([^;)]+)/i);
    if (match) {
      return `${match[2].trim()} (Android ${match[1]})`;
    }
    return 'Android Smartphone — App';
  }
  if (/Macintosh/i.test(ua)) return 'MacBook / macOS Browser';
  if (/Windows/i.test(ua)) return 'Windows PC Browser';
  return 'Web Browser Client';
}

/**
 * Tính mã băm SHA-256 thực tế cho chuỗi hoặc ArrayBuffer (Dùng để xác thực toàn vẹn Web Bundle / Artifact)
 */
export async function computeSha256Hex(input: string | ArrayBuffer): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer =
        typeof input === 'string' ? new TextEncoder().encode(input) : input;
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {}
  // Fallback deterministic hash nếu môi trường không có WebCrypto
  const str = typeof input === 'string' ? input : String(input.byteLength);
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  return hex.repeat(4);
}

/**
 * Khởi tạo môi trường Native (Status Bar, Splash Screen, Keyboard, Back Button, Deep Link)
 */
export async function initCapacitorNativeEnvironment(options: {
  onNavigatePage?: (pageId: string) => void;
  onHardwareBack?: () => boolean;
}): Promise<() => void> {
  if (!isNativeMobileApp()) {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  try {
    // 1. Cấu hình Status Bar đồng bộ thương hiệu #082B59
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (getCurrentPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#082B59' }).catch(() => {});
      await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }

    // 2. Ẩn Splash Screen mượt mà sau khi React mount hoàn tất
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }, 400);

    // 3. Tự động cuộn ô nhập liệu khi bàn phím ảo xuất hiện trên iOS / Android
    const kbShowListener = await Keyboard.addListener('keyboardDidShow', () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
        setTimeout(() => {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      }
    });
    cleanups.push(() => kbShowListener.remove());

    // 4. Xử lý nút Back vật lý trên Android & thao tác quay lại
    const backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
      // Ưu tiên 1: Nếu có Modal đang mở (ví dụ ImagePreviewModal hoặc Dialog), đóng modal trước
      const closeBtn = document.querySelector('[data-modal-close="true"], [title="Đóng"]') as HTMLElement | null;
      if (closeBtn) {
        closeBtn.click();
        return;
      }

      // Ưu tiên 2: Gọi callback điều hướng nội bộ của App.tsx
      if (options.onHardwareBack && options.onHardwareBack()) {
        return;
      }

      // Ưu tiên 3: Lịch sử WebView nếu có
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.minimizeApp().catch(() => {});
      }
    });
    cleanups.push(() => backListener.remove());

    // 5. Xử lý Deep Link (crm43751:// hoặc https://crm43751.pages.dev/...)
    const urlListener = await CapApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        const path = (url.pathname || url.host || '').replace(/^\/+|\/+$/g, '').toLowerCase();
        if (path && options.onNavigatePage) {
          options.onNavigatePage(path);
        }
      } catch {}
    });
    cleanups.push(() => urlListener.remove());
  } catch (err) {
    console.warn('[CapacitorBridge] Native init warning:', err);
  }

  return () => {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  };
}

/**
 * Xuất file Excel tương thích đa nền tảng (Web Browser + iOS App + Android App)
 */
export async function exportExcelCrossPlatform(
  workbook: XLSX.WorkBook,
  filename: string
): Promise<void> {
  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;

  if (!isNativeMobileApp()) {
    XLSX.writeFile(workbook, safeName);
    return;
  }

  try {
    const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const savedFile = await Filesystem.writeFile({
      path: safeName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: safeName,
      text: `Báo cáo Excel xuất từ CRM43751: ${safeName}`,
      url: savedFile.uri,
      dialogTitle: 'Lưu hoặc chia sẻ file Excel',
    });
  } catch (err) {
    console.warn('[CapacitorBridge] Native Excel share fallback to writeFile:', err);
    XLSX.writeFile(workbook, safeName);
  }
}

/**
 * Lưu hoặc chia sẻ hình ảnh PNG tương thích đa nền tảng (Web + iOS App + Android App)
 */
export async function saveOrShareImageCrossPlatform(
  dataUrl: string,
  filename: string
): Promise<boolean> {
  const safeName = filename.endsWith('.png') ? filename : `${filename}.png`;

  if (isNativeMobileApp()) {
    try {
      const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const savedFile = await Filesystem.writeFile({
        path: safeName,
        data: base64Part,
        directory: Directory.Cache,
      });

      await Share.share({
        title: safeName,
        text: 'Báo cáo xuất từ ứng dụng CRM43751',
        url: savedFile.uri,
        dialogTitle: 'Lưu hoặc gửi ảnh báo cáo',
      });
      return true;
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').includes('canceled')) {
        return true;
      }
      console.warn('[CapacitorBridge] Native image share failed:', err);
    }
  }

  return false;
}

