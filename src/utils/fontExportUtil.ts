/**
 * Font Utility for Image Export
 * Ensures UTM Avo font is fully loaded before htmlToImage/domToPng renders.
 * Prevents canvas/SVG renderers from falling back to system fonts on mobile.
 */

// Base64 font embedding cache (populated on first call)
let _fontDataCache: { regular: string; bold: string } | null = null;

/**
 * Convert a font file URL to a base64 data URI for inline embedding.
 */
async function fetchFontAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:font/truetype;base64,${btoa(binary)}`;
  } catch (e) {
    console.warn('[FontUtil] Failed to fetch font as base64:', url, e);
    return '';
  }
}

/**
 * Ensure UTM Avo fonts are loaded and ready for rendering.
 * Call this BEFORE any htmlToImage/domToPng export.
 * 
 * Returns true if fonts are confirmed loaded.
 */
export async function ensureFontsReady(): Promise<boolean> {
  try {
    // 1. Wait for all browser font loading to complete
    if (document.fonts) {
      await document.fonts.ready;
    }

    // 2. Force-load UTM Avo if not already loaded
    const fontFamilies = [
      { family: 'UTM Avo', weight: '400' },
      { family: 'UTM Avo', weight: '700' },
    ];

    for (const { family, weight } of fontFamilies) {
      try {
        const font = new FontFace(family, '', { weight });
        // Check if this font variation is loaded
        const isLoaded = document.fonts.check(`${weight} 16px "${family}"`);
        if (!isLoaded) {
          console.warn(`[FontUtil] Font "${family}" weight ${weight} not detected. Attempting force-load...`);
          // Try to trigger load by creating a hidden element
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
          
          // Wait a bit for browser to trigger font load
          await new Promise(r => setTimeout(r, 100));
          if (document.fonts) await document.fonts.ready;
          document.body.removeChild(probe);
        }
      } catch (e) {
        // Font check API might not be available, continue
      }
    }

    // 3. Final confirmation wait
    if (document.fonts) {
      await document.fonts.ready;
    }

    // 4. Verify font is actually available
    const verified = document.fonts.check('700 16px "UTM Avo"');
    if (!verified) {
      console.warn('[FontUtil] UTM Avo Bold font could not be verified. Export may use fallback font.');
    } else {
      console.log('[FontUtil] ✅ UTM Avo font confirmed loaded and ready for export.');
    }

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
    // Fetch font files as base64 (cached)
    if (!_fontDataCache) {
      const [regular, bold] = await Promise.all([
        fetchFontAsBase64('/fonts/UTM Avo.ttf'),
        fetchFontAsBase64('/fonts/UTM Avo Bold.ttf'),
      ]);
      _fontDataCache = { regular, bold };
    }

    if (!_fontDataCache.regular && !_fontDataCache.bold) {
      console.warn('[FontUtil] No font data available for inline injection.');
      return;
    }

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-font-inject', 'true');
    styleEl.textContent = `
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
      @font-face {
        font-family: "UTM Avo";
        src: url("${_fontDataCache.bold}") format("truetype");
        font-weight: 800;
        font-style: normal;
      }
      @font-face {
        font-family: "UTM Avo";
        src: url("${_fontDataCache.bold}") format("truetype");
        font-weight: 900;
        font-style: normal;
      }
    `;

    // Insert at the beginning of the container
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
