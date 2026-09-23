/**
 * Universal Capture Utility for CRM Siêu Thị
 * Ensures exported images match on-screen display 100% (Desktop & Mobile).
 * 
 * Rules applied:
 * 1. Zero-Shadow Export: triệt tiêu toàn bộ boxShadow, textShadow, filter, class shadow-*
 * 2. AutoFitTable unwrapping: triệt tiêu transform: scale(...) và locked sizing-box
 * 3. Faithful Fonts: bảo tồn font chữ pastel (Plus Jakarta Sans, Lexend...) nếu card dùng
 * 4. Fixed colgroup & table layout: chống méo viền, co dúm cột
 */

export interface PrepareCloneOptions {
  /** Chiều rộng cụ thể ép cho clone nếu cần (px) */
  targetWidth?: number;
  /** Bắt buộc font UTM Avo nếu không phát hiện font custom */
  defaultFont?: string;
  /** Giữ nguyên colgroup của table */
  preserveTableLayout?: boolean;
}

/**
 * Phát hiện font chữ chủ đạo của phần tử nguồn
 */
export function detectElementFontFamily(el: HTMLElement): string | null {
  try {
    const inlineFont = el.style.fontFamily;
    if (inlineFont && !/inherit/i.test(inlineFont)) {
      return inlineFont;
    }
    // Kiểm tra các phần tử con chính như h2, table, span
    const headings = el.querySelectorAll('h1, h2, h3, table, [style*="font-family"]');
    for (const h of Array.from(headings)) {
      const hFont = (h as HTMLElement).style.fontFamily;
      if (hFont && /plus jakarta|lexend|montserrat|oswald/i.test(hFont)) {
        return hFont;
      }
    }
    const computed = window.getComputedStyle(el).fontFamily;
    if (computed && /plus jakarta|lexend|montserrat|oswald/i.test(computed)) {
      return computed;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Chuẩn bị và làm sạch cây DOM clone để chụp ảnh chính xác 100% so với màn hình
 */
export function prepareCloneForCapture(
  clone: HTMLElement,
  sourceElement?: HTMLElement,
  options: PrepareCloneOptions = {}
): { detectedFont: string; isCustomFont: boolean } {
  // 1. Ẩn / gỡ bỏ các phần tử điều khiển tương tác
  const noCaptureEls = clone.querySelectorAll(
    '.no-capture, button, textarea, .capture-btn, input:not([type="checkbox"]):not([type="radio"]), select'
  );
  noCaptureEls.forEach(el => {
    (el as HTMLElement).style.display = 'none';
  });

  // 2. Triệt tiêu hoàn toàn bóng mờ (Zero-Shadow Export Rule per AGENTS.md)
  const allEls = clone.querySelectorAll('*');
  allEls.forEach(el => {
    const htmlEl = el as HTMLElement;
    if (htmlEl.style) {
      htmlEl.style.boxShadow = 'none';
      htmlEl.style.textShadow = 'none';
      htmlEl.style.filter = 'none';
    }
    if (htmlEl.classList) {
      Array.from(htmlEl.classList).forEach(cls => {
        if (cls.startsWith('shadow') || cls.startsWith('drop-shadow')) {
          htmlEl.classList.remove(cls);
        }
      });
    }
  });

  // 3. Giải phóng hoàn toàn AutoFitTable: gỡ bỏ transform scale, unwrap sizing-box
  const sizingBoxes = clone.querySelectorAll('.autofit-sizing-box, [data-autofit-sizing]');
  sizingBoxes.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.width = '100%';
    htmlEl.style.minWidth = '100%';
    htmlEl.style.maxWidth = 'none';
    htmlEl.style.height = 'auto';
    htmlEl.style.position = 'static';
    htmlEl.style.overflow = 'visible';
    htmlEl.style.margin = '0';
  });

  const contentBoxes = clone.querySelectorAll('.autofit-content-box, [data-autofit-content]');
  contentBoxes.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.transform = 'none';
    htmlEl.style.position = 'static';
    htmlEl.style.width = '100%';
    htmlEl.style.minWidth = '100%';
    htmlEl.style.maxWidth = 'none';
    htmlEl.style.top = 'auto';
    htmlEl.style.left = 'auto';
  });

  const autoFitContainers = clone.querySelectorAll('.autofit-table-container, [data-autofit-container]');
  autoFitContainers.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = 'visible';
    htmlEl.style.width = '100%';
    htmlEl.style.maxWidth = 'none';
  });

  // 4. Giải phóng các thanh cuộn để hiển thị 100% nội dung
  const scrollContainers = clone.querySelectorAll(
    '.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]'
  );
  scrollContainers.forEach(el => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = 'visible';
    htmlEl.style.width = '100%';
    htmlEl.style.minWidth = '100%';
    htmlEl.style.height = 'auto';
    htmlEl.style.maxWidth = 'none';
    htmlEl.style.maxHeight = 'none';
    el.classList.remove('overflow-x-auto', 'overflow-y-auto', 'overflow-hidden', 'overflow-auto');
  });

  // 5. Gỡ bỏ sticky positioning (tránh lỗi lệch cột trên canvas)
  const stickyEls = clone.querySelectorAll('.sticky, [style*="sticky"]');
  stickyEls.forEach(el => {
    (el as HTMLElement).style.position = 'relative';
    (el as HTMLElement).style.left = 'auto';
    (el as HTMLElement).style.zIndex = 'auto';
  });

  // 6. Phát hiện và bảo tồn font chữ
  const customFont = sourceElement ? detectElementFontFamily(sourceElement) : detectElementFontFamily(clone);
  const isCustomFont = Boolean(customFont && /plus jakarta|lexend|montserrat|oswald/i.test(customFont));
  const activeFont = customFont || options.defaultFont || "'UTM Avo', 'Inter', sans-serif";

  clone.style.fontFamily = activeFont;

  // 7. Khóa bảng chuẩn nét
  const tables = clone.querySelectorAll('table');
  tables.forEach(table => {
    const htmlTable = table as HTMLElement;
    htmlTable.style.boxSizing = 'border-box';
    if (options.preserveTableLayout !== false) {
      htmlTable.style.tableLayout = 'fixed';
    }
    htmlTable.style.width = '100%';
    htmlTable.style.minWidth = '100%';
    htmlTable.style.maxWidth = 'none';
  });

  // 8. Style ẩn toàn bộ thanh cuộn trong ảnh chụp
  const hideScrollStyle = document.createElement('style');
  hideScrollStyle.innerHTML = `
    *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
    * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
  `;
  clone.appendChild(hideScrollStyle);

  return { detectedFont: activeFont, isCustomFont };
}
