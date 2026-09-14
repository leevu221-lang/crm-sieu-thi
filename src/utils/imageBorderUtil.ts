/**
 * Utility to add a clean white border/padding around exported images (Data URLs).
 * Used when capturing dashboard tables and cards so that content does not touch
 * the outer edges of the generated image.
 *
 * @param dataUrl The base64 PNG data URL
 * @param borderCssPx The border padding in logical CSS pixels (default: 20px)
 * @param referenceWidth Optional reference width of the source element in CSS pixels
 * @returns Promise resolving to the padded Data URL
 */
export function addWhiteBorderToDataUrl(
  dataUrl: string,
  borderCssPx: number = 20,
  referenceWidth?: number
): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }

    if (typeof window === 'undefined') {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const naturalWidth = img.naturalWidth || img.width;
        const naturalHeight = img.naturalHeight || img.height;

        if (!naturalWidth || !naturalHeight) {
          resolve(dataUrl);
          return;
        }

        // Determine scale factor relative to CSS logical pixels
        const scale = referenceWidth && referenceWidth > 0
          ? naturalWidth / referenceWidth
          : (naturalWidth >= 2000 ? 2.5 : naturalWidth >= 1200 ? 2 : 1);

        const pad = Math.max(16, Math.round(borderCssPx * scale));

        const canvas = document.createElement('canvas');
        canvas.width = naturalWidth + pad * 2;
        canvas.height = naturalHeight + pad * 2;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fill background with pure white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw original captured image centered with equal white margin on all 4 sides
        ctx.drawImage(img, pad, pad, naturalWidth, naturalHeight);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('[imageBorderUtil] Failed to add white border:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = (err) => {
      console.warn('[imageBorderUtil] Image failed to load for border padding:', err);
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}
