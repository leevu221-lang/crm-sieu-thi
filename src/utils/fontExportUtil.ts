/**
 * Font Utility for Image Export
 * Ensures UTM Avo font is fully loaded before htmlToImage/domToPng renders.
 * Prevents canvas/SVG renderers from falling back to system fonts on mobile.
 */

// Base64 font embedding cache (populated on first call)
interface FontDataCache {
  regular: string;
  bold: string;
  italic: string;
  boldItalic: string;
}

let _fontDataCache: FontDataCache | null = null;
let _cachedFontCss: string | null = null;
let _preloadPromise: Promise<string> | null = null;

/**
 * Convert a font file URL to a base64 data URI for inline embedding.
 * Supports primary URL with automatic fallback.
 */
async function fetchFontAsBase64(primaryUrl: string, fallbackUrl?: string): Promise<string> {
  const tryFetch = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
  };

  try {
    return await tryFetch(primaryUrl);
  } catch (e) {
    if (fallbackUrl) {
      try {
        return await tryFetch(fallbackUrl);
      } catch (err) {
        console.warn(`[FontUtil] Fallback font fetch failed for ${fallbackUrl}:`, err);
      }
    }
    console.warn(`[FontUtil] Failed to fetch font ${primaryUrl}:`, e);
    return '';
  }
}

// Preload fonts immediately in the background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    preloadFontDataCache().catch(() => {});
  }, 200);
}

/**
 * Preload base64 font files and compile the inline font CSS once in memory.
 * Covers all weights (300, 400, 500, 600, 700, 800, 900) so Safari iOS never falls back.
 */
export async function preloadFontDataCache(): Promise<string> {
  if (_cachedFontCss) return _cachedFontCss;
  if (_preloadPromise) return _preloadPromise;

  _preloadPromise = (async () => {
    try {
      if (!_fontDataCache) {
        const [regular, bold, italic, boldItalic] = await Promise.all([
          fetchFontAsBase64('/fonts/UTM%20Avo.ttf', '/fonts/UTM Avo.ttf'),
          fetchFontAsBase64('/fonts/UTM%20Avo%20Bold.ttf', '/fonts/UTM Avo Bold.ttf'),
          fetchFontAsBase64('/fonts/UTM%20Avo%20Italic.ttf', '/fonts/UTM Avo Italic.ttf'),
          fetchFontAsBase64('/fonts/UTM%20Avo%20Bold%20Italic.ttf', '/fonts/UTM Avo Bold Italic.ttf'),
        ]);
        _fontDataCache = { regular, bold, italic, boldItalic };
      }

      const reg = _fontDataCache.regular;
      const bld = _fontDataCache.bold || reg;
      const itl = _fontDataCache.italic || reg;
      const bit = _fontDataCache.boldItalic || bld;

      if (reg || bld) {
        _cachedFontCss = `
          /* UTM Avo - Regular Weights (300 - 500, normal) */
          @font-face {
            font-family: "UTM Avo";
            src: url("${reg}") format("truetype");
            font-weight: 300 500;
            font-style: normal;
          }
          @font-face {
            font-family: "UTM Avo";
            src: url("${reg}") format("truetype");
            font-weight: 400;
            font-style: normal;
          }

          /* UTM Avo - Bold & Heavy Weights (600 - 900, bold) */
          @font-face {
            font-family: "UTM Avo";
            src: url("${bld}") format("truetype");
            font-weight: 600 900;
            font-style: normal;
          }
          @font-face {
            font-family: "UTM Avo";
            src: url("${bld}") format("truetype");
            font-weight: 700;
            font-style: normal;
          }
          @font-face {
            font-family: "UTM Avo";
            src: url("${bld}") format("truetype");
            font-weight: 900;
            font-style: normal;
          }

          /* UTM Avo - Italic Weights */
          @font-face {
            font-family: "UTM Avo";
            src: url("${itl}") format("truetype");
            font-weight: 400;
            font-style: italic;
          }
          @font-face {
            font-family: "UTM Avo";
            src: url("${bit}") format("truetype");
            font-weight: 600 900;
            font-style: italic;
          }
          @font-face {
            font-family: "UTM Avo";
            src: url("${bit}") format("truetype");
            font-weight: 700;
            font-style: italic;
          }
        `;
      }
    } catch (e) {
      console.warn('[FontUtil] Failed to build preload font cache:', e);
    }
    return _cachedFontCss || '';
  })();

  return _preloadPromise;
}

/**
 * Build the complete CSS string for .export-isolated-card so it can be injected
 * both into document.head (for live layout measurement) and inside the cloned
 * frameWrapper (so SVG foreignObject serialization retains all rules).
 */
export function buildSharedCaptureCss(fontCss: string = ''): string {
  return `
    ${fontCss}
    .export-isolated-card,
    .export-isolated-card * {
      animation: none !important;
      transition: none !important;
      zoom: 1 !important;
      -webkit-text-size-adjust: 100% !important;
    }
    .export-isolated-card .truncate {
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: normal !important;
    }
    .export-isolated-card .overflow-x-auto,
    .export-isolated-card .overflow-y-auto,
    .export-isolated-card .mobile-table-scroll {
      overflow: visible !important;
      width: 100% !important;
      height: auto !important;
      max-width: 100% !important;
      max-height: none !important;
      box-sizing: border-box !important;
    }

    /* Executive Card Wrapper & Layout */
    .export-isolated-card {
      font-family: 'UTM Avo', 'Inter', sans-serif !important;
      background-color: #ffffff !important;
      color: #10233F !important;
      box-sizing: border-box !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
      zoom: 1 !important;
      transform: none !important;
    }

    /* Outer Container Padding */
    .export-isolated-card .emp-detail-card {
      width: 100% !important;
      max-width: 100% !important;
      padding: 14px !important;
      gap: 12px !important;
      border-radius: 24px !important;
      border: 1.5px solid #C9DDF0 !important;
      background: linear-gradient(180deg, #EAF3FB 0%, #F1F7FD 50%, #E9F2FA 100%) !important;
      box-sizing: border-box !important;
    }

    /* Top Employee Header Card */
    .export-isolated-card .emp-header-card {
      padding: 14px 18px !important;
      border-radius: 18px !important;
      border: 1px solid #D2E3F3 !important;
      background-color: #FFFFFF !important;
      overflow: hidden !important;
    }
    .export-isolated-card .emp-header-card .emp-header-row {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 14px !important;
    }
    .export-isolated-card .emp-header-card .emp-header-left {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 14px !important;
      width: auto !important;
      flex: 0 0 auto !important;
    }
    .export-isolated-card .emp-header-card .emp-header-icon-box {
      width: 62px !important;
      height: 62px !important;
      border-radius: 16px !important;
      flex-shrink: 0 !important;
    }
    .export-isolated-card .emp-header-card .emp-header-icon-box svg {
      width: 32px !important;
      height: 32px !important;
    }
    .export-isolated-card .emp-header-card .emp-header-subinfo {
      display: flex !important;
      flex-direction: column !important;
      flex-shrink: 0 !important;
    }
    .export-isolated-card .emp-header-card .emp-header-right-cluster {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 8px !important;
      margin-left: auto !important;
      flex: 1 1 0% !important;
      min-width: 0 !important;
    }
    .export-isolated-card .emp-header-card .emp-header-art {
      display: flex !important;
      position: relative !important;
      right: auto !important;
      flex: 1 1 0% !important;
      width: 100% !important;
      min-width: 60px !important;
      max-width: 300px !important;
      height: 82px !important;
      align-items: flex-end !important;
      justify-content: flex-end !important;
      margin-left: 0 !important;
    }
    .export-isolated-card .emp-header-card .emp-header-art svg {
      width: 100% !important;
      height: 82px !important;
    }
    .export-isolated-card .emp-header-card .emp-dat-card {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
      padding: 8px 12px !important;
      min-width: 74px !important;
      border-radius: 14px !important;
    }
    .export-isolated-card .emp-header-card .emp-dat-icon-box {
      width: 34px !important;
      height: 34px !important;
      border-radius: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .export-isolated-card .emp-header-card .emp-dat-icon-box svg {
      width: 19px !important;
      height: 19px !important;
    }
    .export-isolated-card .emp-header-card .emp-dat-label {
      font-size: 11.5px !important;
      line-height: 1.08 !important;
      margin-top: 4px !important;
      font-weight: 800 !important;
    }
    .export-isolated-card .emp-header-card .emp-dat-value {
      font-size: 15.5px !important;
      line-height: 1.1 !important;
      margin-top: 1px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card .emp-header-card .emp-dat-pct {
      font-size: 11.5px !important;
      line-height: 1.08 !important;
      margin-top: 1px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card .emp-banner-progress-track {
      height: 16px !important;
      width: 104px !important;
      overflow: hidden !important;
      display: flex !important;
      align-items: center !important;
      border-radius: 9999px !important;
      padding: 2px !important;
      box-sizing: border-box !important;
    }
    .export-isolated-card .emp-progress-track {
      height: 14px !important;
      min-width: 60px !important;
      overflow: hidden !important;
      display: flex !important;
      align-items: center !important;
      border-radius: 9999px !important;
      padding: 1.5px !important;
      box-sizing: border-box !important;
    }
    .export-isolated-card .emp-progress-fill {
      height: 100% !important;
      min-height: 10px !important;
      border-radius: 9999px !important;
      display: block !important;
    }
    .export-isolated-card .emp-header-card .emp-header-main-title {
      font-size: 23px !important;
      font-weight: 900 !important;
      line-height: 1.12 !important;
      letter-spacing: 0.015em !important;
      text-transform: uppercase !important;
      color: #0E2240 !important;
    }
    .export-isolated-card .emp-header-card h2,
    .export-isolated-card .emp-header-card .emp-header-staff-name {
      font-size: 19px !important;
      font-weight: 900 !important;
      line-height: 1.2 !important;
      letter-spacing: -0.01em !important;
      text-transform: uppercase !important;
      text-align: left !important;
      margin: 2px 0 0 0 !important;
    }
    .export-isolated-card .emp-header-card .emp-header-meta {
      font-size: 12.5px !important;
      margin-top: 4px !important;
      letter-spacing: 0 !important;
    }
    .export-isolated-card .emp-header-card .emp-header-meta svg {
      width: 14px !important;
      height: 14px !important;
    }

    /* 6 KPI StatCards Grid in Export */
    .export-isolated-card .emp-kpi-wrapper {
      padding: 8px !important;
      border-radius: 18px !important;
      background-color: rgba(255, 255, 255, 0.9) !important;
      border: 1px solid #D2E3F3 !important;
    }
    .export-isolated-card .emp-kpi-grid {
      display: grid !important;
      grid-template-columns: repeat(6, 1fr) !important;
      gap: 8px !important;
      width: 100% !important;
      margin: 0 !important;
      box-sizing: border-box !important;
    }
    .export-isolated-card .emp-kpi-card {
      padding: 9px 10px !important;
      border-radius: 13px !important;
      min-height: 74px !important;
      gap: 8px !important;
      box-sizing: border-box !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
    }
    .export-isolated-card .emp-kpi-icon-box {
      width: 36px !important;
      height: 36px !important;
      border-radius: 9999px !important;
      flex-shrink: 0 !important;
    }
    .export-isolated-card .emp-kpi-icon-box svg {
      width: 19px !important;
      height: 19px !important;
    }
    .export-isolated-card .emp-kpi-label {
      font-size: 10.5px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card .emp-kpi-val {
      font-size: 21px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card .emp-kpi-sub {
      font-size: 10px !important;
    }

    /* SectionTable Container */
    .export-isolated-card .emp-section-table {
      border-radius: 18px !important;
      border: 1.5px solid #CFE0F0 !important;
      padding: 6px !important;
      overflow: hidden !important;
      background-color: #FFFFFF !important;
    }
    .export-isolated-card .emp-section-banner {
      padding: 11px 16px !important;
      border-radius: 13px !important;
      gap: 10px !important;
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      justify-content: space-between !important;
      overflow: hidden !important;
    }
    .export-isolated-card .emp-banner-icon-box {
      width: 32px !important;
      height: 32px !important;
      border-radius: 10px !important;
    }
    .export-isolated-card .emp-banner-icon-box svg {
      width: 17px !important;
      height: 17px !important;
    }
    .export-isolated-card .emp-section-title {
      font-size: 16px !important;
      letter-spacing: 0.03em !important;
    }
    .export-isolated-card .emp-section-meta {
      font-size: 13px !important;
      gap: 6px !important;
      letter-spacing: 0.02em !important;
    }
    .export-isolated-card .emp-section-meta svg {
      width: 16px !important;
      height: 16px !important;
    }

    /* Table Typography & Columns (Identical to Desktop UI >= 640px) */
    .export-isolated-card table.employee-data-table {
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      table-layout: fixed !important;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      font-size: 13px !important;
      zoom: 1 !important;
    }
    .export-isolated-card table.employee-data-table col.col-stt,
    .export-isolated-card table.employee-data-table th.col-stt {
      width: 48px !important;
      padding-left: 4px !important;
      padding-right: 4px !important;
    }
    .export-isolated-card table.employee-data-table col.col-name,
    .export-isolated-card table.employee-data-table th.col-name {
      width: auto !important;
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
    .export-isolated-card table.employee-data-table col.col-target,
    .export-isolated-card table.employee-data-table th.col-target {
      width: 78px !important;
      padding-left: 4px !important;
      padding-right: 4px !important;
    }
    .export-isolated-card table.employee-data-table col.col-luyke,
    .export-isolated-card table.employee-data-table th.col-luyke {
      width: 78px !important;
      padding-left: 4px !important;
      padding-right: 4px !important;
    }
    .export-isolated-card table.employee-data-table col.col-ht,
    .export-isolated-card table.employee-data-table th.col-ht {
      width: 196px !important;
      padding: 0 !important;
    }
    .export-isolated-card table.employee-data-table col.col-conlai,
    .export-isolated-card table.employee-data-table th.col-conlai {
      width: 76px !important;
      padding-left: 4px !important;
      padding-right: 4px !important;
    }
    .export-isolated-card .emp-ht-header-label {
      width: 58px !important;
    }

    .export-isolated-card thead tr {
      height: 38px !important;
    }
    .export-isolated-card thead th {
      font-size: 12px !important;
      font-weight: 900 !important;
      letter-spacing: 0.02em !important;
      text-transform: uppercase !important;
    }
    .export-isolated-card tbody tr {
      height: auto !important;
      min-height: 40px !important;
    }
    .export-isolated-card tbody td {
      font-size: 13px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card tbody td.emp-num-cell {
      padding: 7px 4px !important;
      font-size: 13px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card tbody td.emp-ht-cell,
    .export-isolated-card tfoot td.emp-ht-cell {
      padding: 0 !important;
    }
    .export-isolated-card .emp-ht-inner {
      padding: 7px 6px !important;
      gap: 8px !important;
    }
    .export-isolated-card .emp-ht-badge-col {
      width: 56px !important;
      padding-right: 5px !important;
    }
    .export-isolated-card .emp-ht-badge {
      font-size: 12px !important;
      padding: 3.5px 7px !important;
      border-radius: 6px !important;
    }
    .export-isolated-card .emp-medal-hex {
      width: 26px !important;
      height: 28px !important;
    }
    .export-isolated-card .emp-medal-hex span {
      font-size: 12px !important;
    }
    .export-isolated-card .emp-rank-circle {
      width: 24px !important;
      height: 24px !important;
      font-size: 12px !important;
    }
    .export-isolated-card .emp-rank-unreached {
      font-size: 13px !important;
    }
    .export-isolated-card .emp-check-circle {
      width: 22px !important;
      height: 22px !important;
    }
    .export-isolated-card tbody td.emp-cat-name-cell {
      padding: 8px 12px !important;
      font-size: 13px !important;
      font-weight: 900 !important;
      text-transform: uppercase !important;
      line-height: 1.32 !important;
      letter-spacing: 0 !important;
      white-space: normal !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
      overflow: visible !important;
      text-overflow: clip !important;
    }
    .export-isolated-card tbody td.emp-cat-name-cell .emp-cat-name-text {
      font-size: 13px !important;
      letter-spacing: 0 !important;
      -webkit-line-clamp: unset !important;
      line-clamp: unset !important;
      white-space: normal !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
      overflow: visible !important;
      text-overflow: clip !important;
      line-height: 1.32 !important;
    }
    .export-isolated-card tfoot.hidden {
      display: none !important;
    }
    .export-isolated-card tfoot tr {
      height: auto !important;
      min-height: 44px !important;
    }
    .export-isolated-card tfoot td {
      font-size: 14px !important;
      font-weight: 900 !important;
    }
    .export-isolated-card tfoot td:nth-child(2) {
      padding-left: 12px !important;
      padding-right: 12px !important;
    }
  `;
}

/**
 * Computes optimal high-DPI export scale (3x - 4x Retina) while staying safely within
 * mobile & desktop browser HTMLCanvasElement maximum area (16.77MP on WebKit) and dimension limits.
 */
export function computeOptimalExportScale(
  width: number,
  height: number,
  minScale: number = 3,
  maxScale: number = 4
): number {
  const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 3) : 3;
  const desiredScale = Math.min(maxScale, Math.max(minScale, rawDpr));
  // WebKit / iOS Safari enforces a 16,777,216 pixel (4096 x 4096) maximum canvas area.
  // Keeping total pixels <= 16,200,000 and max dimension <= 12,288 guarantees 3x+ resolution
  // even on 40-category reports (880 x 1980 -> 2640 x 5940 = 15.68MP) without canvas crashes.
  const maxCanvasPixels = 16650000;
  const maxCanvasDimension = 12288;
  const safeArea = Math.max(1, width * height);
  const maxScaleByArea = Math.sqrt(maxCanvasPixels / safeArea);
  const maxScaleByDim = maxCanvasDimension / Math.max(1, width, height);
  return Number(Math.max(2, Math.min(desiredScale, maxScaleByArea, maxScaleByDim)).toFixed(2));
}

let _sharedHeadCssInitialized = false;
let _cachedDocCss: string | null = null;
let _cachedEncodedSvgStyleTag: string | null = null;

/**
 * Ensures shared export stylesheet is injected into document.head ONCE without
 * repeatedly invalidating the document's CSSOM on every cloned card.
 */
export function ensureSharedCaptureStyle(): void {
  if (typeof document === 'undefined') return;
  let style = document.getElementById('export-isolated-card-shared-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'export-isolated-card-shared-style';
    style.textContent = buildSharedCaptureCss('');
    document.head.appendChild(style);
    _sharedHeadCssInitialized = true;
  } else if (!_sharedHeadCssInitialized) {
    style.textContent = buildSharedCaptureCss('');
    _sharedHeadCssInitialized = true;
  }
}

/**
 * Extracts and caches all active CSS rules from document.styleSheets once.
 * Excludes external URL @font-face rules so SVG foreignObject never attempts network fetches.
 */
export function getDocumentCssText(): string {
  if (_cachedDocCss !== null) return _cachedDocCss;
  if (typeof document === 'undefined') return '';
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const ownerNode = sheet.ownerNode as HTMLElement | null;
      if (ownerNode && ownerNode.id === 'export-isolated-card-shared-style') continue;
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (rule.type === CSSRule.FONT_FACE_RULE && !rule.cssText.includes('data:')) {
          continue;
        }
        chunks.push(rule.cssText);
      }
    } catch {
      // Ignore cross-origin stylesheets
    }
  }
  _cachedDocCss = chunks.join('\n');
  return _cachedDocCss;
}

/**
 * Builds and caches the URI-encoded `<style>...</style>` block for SVG foreignObject
 * rendering so batch exporting 13+ employee cards encodes the stylesheet only once.
 */
export async function getPreEncodedExportSvgStyleTag(): Promise<string> {
  if (_cachedEncodedSvgStyleTag) return _cachedEncodedSvgStyleTag;
  const fontCss = _cachedFontCss || (await preloadFontDataCache());
  const combinedCss = `${getDocumentCssText()}\n${buildSharedCaptureCss(fontCss)}`;
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleEl.textContent = combinedCss;
  const serializedStyle = new XMLSerializer()
    .serializeToString(styleEl)
    .replace(/[\u0000-\u0008\v\f\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, '');
  _cachedEncodedSvgStyleTag = encodeURIComponent(serializedStyle);
  return _cachedEncodedSvgStyleTag;
}

export interface FastCardRenderResult {
  blob: Blob;
  renderCanvasMs: number;
  canvasToBlobMs: number;
}

/**
 * High-speed SVG foreignObject -> HTMLCanvasElement -> PNG Blob renderer for `.export-isolated-card`.
 * Avoids 35,000+ synchronous `window.getComputedStyle` calls and reuses a single Canvas per worker.
 */
export async function renderIsolatedCardFastToBlob(
  frameWrapper: HTMLElement,
  width: number,
  height: number,
  scale: number,
  reusableCanvas?: HTMLCanvasElement,
  preEncodedStyleTag?: string
): Promise<FastCardRenderResult> {
  const tRenderStart = performance.now();
  const encodedStyle = preEncodedStyleTag || (await getPreEncodedExportSvgStyleTag());

  frameWrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const serializedCard = new XMLSerializer()
    .serializeToString(frameWrapper)
    .replace(/[\u0000-\u0008\v\f\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, '');

  const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  const foOpen = `<foreignObject x="0" y="0" width="100%" height="100%">`;
  const foClose = `</foreignObject></svg>`;

  const svgDataUrl =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(svgHeader) +
    encodedStyle +
    encodeURIComponent(foOpen + serializedCard + foClose);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'sync';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (err) => reject(err);
    img.src = svgDataUrl;
  });

  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);
  const canvas = reusableCanvas || document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.width = 0;
    canvas.height = 0;
    throw new Error('Canvas 2D context unavailable');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  const tRenderEnd = performance.now();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/png')
  );
  // Immediately release GPU/RAM backing store
  canvas.width = 0;
  canvas.height = 0;
  img.src = '';
  const tBlobEnd = performance.now();

  if (!blob || blob.size < 1000) {
    throw new Error('Fast SVG foreignObject produced empty blob');
  }

  return {
    blob,
    renderCanvasMs: tRenderEnd - tRenderStart,
    canvasToBlobMs: tBlobEnd - tRenderEnd,
  };
}

/**
 * Convenience wrapper returning a `data:image/png;base64,...` string for single-card preview modals.
 */
export async function renderIsolatedCardFastToDataUrl(
  frameWrapper: HTMLElement,
  width: number,
  height: number,
  scale: number
): Promise<string> {
  const { blob } = await renderIsolatedCardFastToBlob(frameWrapper, width, height, scale);
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.length > 1000) {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader produced empty dataUrl'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
    // 1. Always ensure base64 font data cache is preloaded and ready
    const fontCachePromise = preloadFontDataCache().catch(() => '');

    // 2. Native CSS Font Loading API: load all required font weights in parallel
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await Promise.all([
          document.fonts.load('400 16px "UTM Avo"'),
          document.fonts.load('600 16px "UTM Avo"'),
          document.fonts.load('700 16px "UTM Avo"'),
          document.fonts.load('800 16px "UTM Avo"'),
          document.fonts.load('900 16px "UTM Avo"'),
          document.fonts.load('italic 400 16px "UTM Avo"'),
          document.fonts.load('italic 700 16px "UTM Avo"'),
          document.fonts.load('italic 900 16px "UTM Avo"'),
          document.fonts.load('600 16px "Plus Jakarta Sans"'),
          document.fonts.load('700 16px "Plus Jakarta Sans"'),
          document.fonts.load('800 16px "Plus Jakarta Sans"'),
        ]);
        await document.fonts.ready;
      } catch (fontErr) {
        console.warn('[FontUtil] Native document.fonts.load warning:', fontErr);
      }
    }

    // 3. Fallback DOM probe check if UTM Avo is not yet detected by document.fonts
    if (typeof document !== 'undefined' && document.fonts) {
      const isBoldLoaded = document.fonts.check('700 16px "UTM Avo"');
      const isRegularLoaded = document.fonts.check('400 16px "UTM Avo"');
      if (!isBoldLoaded || !isRegularLoaded) {
        console.warn('[FontUtil] UTM Avo not yet verified via check(). Probing DOM...');
        const probe = document.createElement('span');
        probe.style.fontFamily = '"UTM Avo", monospace';
        probe.style.fontWeight = '700';
        probe.style.fontSize = '16px';
        probe.style.position = 'absolute';
        probe.style.left = '-9999px';
        probe.style.top = '-9999px';
        probe.style.visibility = 'hidden';
        probe.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        document.body.appendChild(probe);

        await new Promise(r => setTimeout(r, 40));
        await document.fonts.ready;
        probe.remove();
      }
    }

    // 4. Await base64 cache completion
    const fontCss = await fontCachePromise;

    // 5. Update shared stylesheet in head so it definitely has base64 fonts
    ensureSharedCaptureStyle();

    const verified = (typeof document !== 'undefined' && document.fonts)
      ? (document.fonts.check('700 16px "UTM Avo"') || document.fonts.check('400 16px "UTM Avo"'))
      : Boolean(fontCss);

    return verified || Boolean(fontCss);
  } catch (e) {
    console.warn('[FontUtil] Font readiness check failed:', e);
    return false;
  }
}

/**
 * Inject inline @font-face CSS into a cloned element tree for export.
 * This ensures the font definition is available inside the SVG foreignObject
 * that htmlToImage and domToPng create, which is critical on mobile Safari iOS
 * where fonts are isolated from the document context.
 */
export async function injectFontStyleIntoClone(container: HTMLElement): Promise<void> {
  try {
    const css = await preloadFontDataCache();
    const isIsolatedCard = container.classList?.contains('export-isolated-card');
    const fullCss = isIsolatedCard ? buildSharedCaptureCss(css) : css;
    if (!fullCss) return;

    // Remove any previous injected font style to prevent duplicates
    const existing = container.querySelector('style[data-font-inject="true"]');
    if (existing) {
      existing.remove();
    }

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-font-inject', 'true');
    styleEl.textContent = fullCss;

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
