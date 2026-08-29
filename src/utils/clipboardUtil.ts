/**
 * Utility for copying images (dataURL or Blob) to the system clipboard.
 * Supports modern ClipboardItem API with graceful fallback.
 */

export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function copyImageToClipboard(dataurlOrBlob: string | Blob): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !navigator.clipboard || !window.ClipboardItem) {
      return false;
    }
    const blob = dataurlOrBlob instanceof Blob ? dataurlOrBlob : dataURLtoBlob(dataurlOrBlob);
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('[ClipboardUtil] Copy image to clipboard failed or permission denied:', err);
    return false;
  }
}
