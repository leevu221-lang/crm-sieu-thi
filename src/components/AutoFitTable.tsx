import React, { useRef, useState, useEffect, useCallback, useId } from 'react';

export interface AutoFitTableProps {
  children: React.ReactNode;
  /** Giới hạn mức thu nhỏ tối thiểu, mặc định 0.25 (25%) */
  minScale?: number;
  /** Độ rộng tự nhiên chuẩn của bảng (px) trên desktop, ví dụ: 860 cho bảng chi tiết ngành hàng, 1160 cho so sánh */
  minWidth?: number;
  /** ClassName bổ sung cho khung bọc ngoài (outer container) */
  className?: string;
  /** Style bổ sung cho khung bọc ngoài */
  style?: React.CSSProperties;
  /** Vô hiệu hóa tính năng auto scale (giữ nguyên tỷ lệ 100%) */
  disabled?: boolean;
  /** ID phần tử HTML */
  id?: string;
}

export const AutoFitTable: React.FC<AutoFitTableProps> = ({
  children,
  minScale = 0.25,
  minWidth = 860,
  className = '',
  style = {},
  disabled = false,
  id,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [naturalHeight, setNaturalHeight] = useState<number | null>(null);
  const [effectiveWidth, setEffectiveWidth] = useState<number>(minWidth);
  const instanceId = useId();

  const calculateFit = useCallback(() => {
    if (disabled) {
      setScale(1);
      setNaturalHeight(null);
      setEffectiveWidth(minWidth);
      return;
    }

    // Khi đang xuất ảnh (screenshot / export mode), luôn giữ nguyên tỷ lệ gốc 100%
    if (
      typeof document !== 'undefined' &&
      (document.body.classList.contains('capturing-screenshot') ||
        document.body.classList.contains('export-short-mode'))
    ) {
      setScale(1);
      setNaturalHeight(null);
      setEffectiveWidth(minWidth);
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    // Chiều rộng chuẩn của bảng desktop: kết hợp giữa minWidth cấu hình và kích thước thực tế
    const tableEl = content.querySelector('table');
    let naturalW = minWidth;
    if (tableEl) {
      const inlineStyleWidth = parseInt(tableEl.style.minWidth || tableEl.style.width || '0', 10);
      if (inlineStyleWidth > 0) {
        naturalW = Math.max(naturalW, inlineStyleWidth);
      }
      naturalW = Math.max(naturalW, tableEl.scrollWidth || 0, tableEl.offsetWidth || 0);
    }

    // Chiều cao tự nhiên thật của bảng
    const naturalH = tableEl ? tableEl.scrollHeight : content.scrollHeight;

    // Nếu khung chứa rộng hơn hoặc bằng độ rộng chuẩn (Desktop), không cần scale
    if (containerWidth >= naturalW) {
      setScale(1);
      setNaturalHeight(null);
      setEffectiveWidth(naturalW);
      return;
    }

    // Tính tỉ lệ thu nhỏ trên mobile để vừa vặn 100% chiều rộng
    const rawScale = containerWidth / naturalW;
    const targetScale = Math.max(minScale, Math.min(1, rawScale));

    setScale(targetScale);
    setNaturalHeight(naturalH);
    setEffectiveWidth(naturalW);
  }, [disabled, minWidth, minScale]);

  // Lắng nghe thay đổi kích thước của container và content (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let rafId: number;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateFit);
    });

    ro.observe(container);
    if (content) {
      ro.observe(content);
    }

    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateFit);
    };

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [calculateFit]);

  // Đo lại khi children (dữ liệu, số hàng, filter) thay đổi
  useEffect(() => {
    const rafId = requestAnimationFrame(calculateFit);
    return () => cancelAnimationFrame(rafId);
  }, [children, minWidth, calculateFit]);

  // Lắng nghe class trên body khi chụp ảnh
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      calculateFit();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [calculateFit]);

  const isScaled = !disabled && scale < 1 && naturalHeight !== null;

  return (
    <div
      ref={containerRef}
      id={id || `autofit-${instanceId}`}
      data-autofit-container="true"
      className={`autofit-table-container w-full overflow-x-auto relative ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        ...style,
      }}
    >
      {isScaled ? (
        <div
          data-autofit-sizing="true"
          className="autofit-sizing-box mx-auto"
          style={{
            width: '100%',
            height: `${Math.ceil(naturalHeight * scale)}px`,
            position: 'relative',
            overflow: 'hidden',
            maxWidth: 'none',
          }}
        >
          <div
            ref={contentRef}
            data-autofit-content="true"
            className="autofit-content-box"
            style={{
              width: `${effectiveWidth}px`,
              minWidth: `${effectiveWidth}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div ref={contentRef} data-autofit-content="true" className="autofit-content-unscaled w-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default AutoFitTable;
