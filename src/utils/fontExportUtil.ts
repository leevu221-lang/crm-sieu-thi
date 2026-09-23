/**
 * Font Utility for Image Export
 * Ensures UTM Avo font is fully loaded before htmlToImage/domToPng renders.
 * Prevents canvas/SVG renderers from falling back to system fonts on mobile.
 */

// Base64 font embedding cache (populated on first call)
let _fontDataCache: { regular: string; bold: string } | null = null;
let _cachedFontCss: string | null = null;

/**
 * Convert a font file URL to a base64 data URI for inline embedding.
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        if (res && !res.startsWith('data:font/')) {
          resolve(res.replace(/^data:[^;]+;base64,/, 'data:font/truetype;base64,'));
        } else {
          resolve(res || '');
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('[FontUtil] Failed to fetch font as base64:', url, e);
    return '';
  }
}

// Preload fonts in the background as soon as module loads
if (typeof window !== 'undefined') {
  setTimeout(() => {
    preloadFontDataCache().catch(() => {});
  }, 1000);
}

/**
 * Preload base64 font files and compile the inline font CSS once in memory.
 */
export async function preloadFontDataCache(): Promise<string> {
  if (_cachedFontCss) return _cachedFontCss;

  if (!_fontDataCache) {
    const [regular, bold] = await Promise.all([
      fetchFontAsBase64('/fonts/UTM Avo.ttf'),
      fetchFontAsBase64('/fonts/UTM Avo Bold.ttf'),
    ]);
    _fontDataCache = { regular, bold };
  }

  if (_fontDataCache.regular || _fontDataCache.bold) {
    _cachedFontCss = `
      @font-face {
        font-family: "UTM Avo";
        src: url("${_fontDataCache.regular}") format("truetype");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "UTM Avo";
        src: url("${_fontDataCache.bold}") format("truetype");
        font-weight: 700;
        font-style: normal;
      }
    `;
  }
  return _cachedFontCss || '';
}

/**
 * Ensures shared export stylesheet is injected once into document.head.
 * Eliminates DOM insertion overhead and avoids style leaks.
 */
export function ensureSharedCaptureStyle(): void {
  if (typeof document === 'undefined' || document.getElementById('export-isolated-card-shared-style')) return;
  const style = document.createElement('style');
  style.id = 'export-isolated-card-shared-style';
  style.textContent = `
    ${getPreloadedFontCss()}
    .export-isolated-card * {
      box-shadow: none !important;
      text-shadow: none !important;
      filter: none !important;
      animation: none !important;
      transition: none !important;
    }
    .export-isolated-card .truncate {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: normal !important;
    }
    .export-isolated-card .overflow-x-auto, 
    .export-isolated-card .overflow-y-auto, 
    .export-isolated-card .overflow-hidden, 
    .export-isolated-card [class*="overflow"] {
      overflow: visible !important;
      width: 100% !important;
      height: auto !important;
      max-width: none !important;
      max-height: none !important;
      box-sizing: border-box !important;
    }
    .export-isolated-card .max-w-\\[960px\\], 
    .export-isolated-card [class*="max-w"] {
      max-width: 100% !important;
      width: 100% !important;
      box-shadow: none !important;
    }
    .export-isolated-card [class*="grid-cols"] {
      display: grid !important;
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
      width: 100% !important;
      box-sizing: border-box !important;
    }
    .export-isolated-card table {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
    }
    .export-isolated-card colgroup col:nth-child(1) { width: 55px !important; }
    .export-isolated-card colgroup col:nth-child(2) { width: 480px !important; }
    .export-isolated-card colgroup col:nth-child(3) { width: 125px !important; }
    .export-isolated-card colgroup col:nth-child(4) { width: 125px !important; }
    .export-isolated-card colgroup col:nth-child(5) { width: 125px !important; }
    .export-isolated-card colgroup col:nth-child(6) { width: 150px !important; }
  `;
  document.head.appendChild(style);
}

/**
 * Get synchronously preloaded font CSS string (returns empty string if not yet loaded).
 */
export function getPreloadedFontCss(): string {
  return _cachedFontCss || '';
}

/**
 * Ensure UTM Avo fonts are loaded and ready for rendering.
 * Call this BEFORE any htmlToImage/domToPng export.
 * 
 * Returns true if fonts are confirmed loaded.
 */
export async function ensureFontsReady(): Promise<boolean> {
  try {
    // Fast path: If UTM Avo fonts are already confirmed loaded, return instantly in 0ms
    if (typeof document !== 'undefined' && document.fonts) {
      if (document.fonts.check('700 16px "UTM Avo"') && document.fonts.check('400 16px "UTM Avo"')) {
        return true;
      }
    }

    // 1. Preload base64 font cache in background immediately
    const fontCachePromise = preloadFontDataCache().catch(() => '');

    // 2. Wait for all browser font loading to complete
    if (document.fonts) {
      await document.fonts.ready;
    }

    // 3. Force-load UTM Avo if not already loaded
    const fontFamilies = [
      { family: 'UTM Avo', weight: '400' },
      { family: 'UTM Avo', weight: '700' },
    ];

    for (const { family, weight } of fontFamilies) {
      try {
        const isLoaded = document.fonts.check(`${weight} 16px "${family}"`);
        if (!isLoaded) {
          console.warn(`[FontUtil] Font "${family}" weight ${weight} not detected. Attempting force-load...`);
          const probe = document.createElement('span');
          probe.style.fontFamily = `"${family}", monospace`;
          probe.style.fontWeight = weight;
          probe.style.fontSize = '16px';
          probe.style.position = 'absolute';
          probe.style.left = '-9999px';
          probe.style.top = '-9999px';
          probe.style.visibility = 'hidden';
          probe.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          document.body.appendChild(probe);
          
          await new Promise(r => setTimeout(r, 60));
          if (document.fonts) await document.fonts.ready;
          document.body.removeChild(probe);
        }
      } catch (e) {}
    }

    // 4. Final confirmation wait & ensure font cache is completed
    if (document.fonts) {
      await document.fonts.ready;
    }
    await fontCachePromise;

    const verified = document.fonts.check('700 16px "UTM Avo"');
    return verified;
  } catch (e) {
    console.warn('[FontUtil] Font readiness check failed:', e);
    return false;
  }
}

/**
 * Inject inline @font-face CSS into a cloned element tree for export.
 * This ensures the font definition is available inside the SVG foreignObject
 * that htmlToImage creates, which is critical on mobile where fonts may not
 * be accessible from within the SVG context.
 */
export async function injectFontStyleIntoClone(container: HTMLElement): Promise<void> {
  try {
    const css = await preloadFontDataCache();
    if (!css) return;

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-font-inject', 'true');
    styleEl.textContent = css;

    if (container.firstChild) {
      container.insertBefore(styleEl, container.firstChild);
    } else {
      container.appendChild(styleEl);
    }
  } catch (e) {
    console.warn('[FontUtil] Failed to inject font style:', e);
  }
}

/**
 * Apply UTM Avo font-family to all elements in a container tree.
 * Use this on cloned elements before export to ensure font consistency.
 */
export function applyFontToTree(container: HTMLElement, fontFamily: string = "'UTM Avo', 'Inter', sans-serif"): void {
  container.style.fontFamily = fontFamily;
  const allElements = container.querySelectorAll('*') as NodeListOf<HTMLElement>;
  allElements.forEach((el) => {
    if (el.style) {
      // Only override if element doesn't have a specific font like Oswald/Colossalis
      const currentFont = el.style.fontFamily || '';
      const hasSpecialFont = /oswald|colossalis|montserrat/i.test(currentFont);
      if (!hasSpecialFont) {
        el.style.fontFamily = fontFamily;
      }
    }
  });
}

/**
 * Get the standard font-family string for UTM Avo exports.
 */
export const EXPORT_FONT_FAMILY = "'UTM Avo', 'Inter', sans-serif";

/**
 * Standard export style overrides that include font settings.
 * Merge this into the htmlToImage `style` option.
 */
export const EXPORT_FONT_STYLE = {
  fontFamily: "'UTM Avo', 'Inter', sans-serif",
  fontSmooth: 'always',
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
  textRendering: 'optimizeLegibility',
} as const;
