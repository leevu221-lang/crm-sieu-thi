import React, { useRef, useState, useEffect, useCallback, useId } from 'react';

export interface AutoFitTableProps {
  children: React.ReactNode;
  /** Giới hạn mức thu nhỏ tối thiểu, mặc định 0.55 (55%) */
  minScale?: number;
  /** Độ rộng tự nhiên cố định gợi ý (px), ví dụ: 1450 cho bảng lịch PG, 1000 cho bảng thưởng */
  minWidth?: number;
  /** ClassName bổ sung cho khung bọc ngoài (outer container) */
  className?: string;
  /** Style bổ sung cho khung bọc ngoài */
  style?: React.CSSProperties;
  /** Vô hiệu hóa tính năng auto scale (giữ nguyên tỷ lệ 100%) */
  disabled?: boolean;
}

export const AutoFitTable: React.FC<AutoFitTableProps> = ({
  children,
  minScale = 0.55,
  minWidth: explicitMinWidth,
  className = '',
  style = {},
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);
  const instanceId = useId();

  const calculateFit = useCallback(() => {
    if (disabled) {
      setScale(1);
      setNaturalDims(null);
      return;
    }

    // Khi đang xuất ảnh (screenshot / export mode), luôn giữ nguyên tỷ lệ gốc 100%
    if (
      typeof document !== 'undefined' &&
      (document.body.classList.contains('capturing-screenshot') ||
       document.body.classList.contains('export-short-mode'))
    ) {
      setScale(1);
      setNaturalDims(null);
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    // Tìm thẻ table bên trong content
    const tableEl = content.querySelector('table');

    // Xác định chiều rộng tự nhiên thật của bảng
    let naturalW = explicitMinWidth || 0;
    if (!naturalW) {
      if (tableEl) {
        const styleMinWidth = parseInt(tableEl.style.minWidth || '', 10) || 0;
        naturalW = Math.max(tableEl.scrollWidth, styleMinWidth, content.scrollWidth);
      } else {
        naturalW = content.scrollWidth;
      }
    }

    // Chiều cao tự nhiên thật
    const naturalH = tableEl ? tableEl.scrollHeight : content.scrollHeight;

    // Nếu bảng vừa khít hoặc nhỏ hơn khung chứa, không cần scale
    if (naturalW <= containerWidth) {
      setScale(1);
      setNaturalDims(null);
      return;
    }

    // Tính tỉ lệ thu nhỏ, sàn tối thiểu là minScale (0.55)
    const rawScale = containerWidth / naturalW;
    const targetScale = Math.max(minScale, Math.min(1, rawScale));

    setScale(targetScale);
    setNaturalDims({ width: naturalW, height: naturalH });
  }, [disabled, explicitMinWidth, minScale]);

  // Lắng nghe thay đổi kích thước của khung chứa (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let rafId: number;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateFit);
    });

    ro.observe(container);

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

  // Remeasure khi nội dung bên trong (children / filter / dữ liệu) thay đổi
  useEffect(() => {
    const rafId = requestAnimationFrame(calculateFit);
    return () => cancelAnimationFrame(rafId);
  }, [children, explicitMinWidth, calculateFit]);

  // Quan sát thay đổi class trên body (capturing-screenshot)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      calculateFit();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [calculateFit]);

  const isScaled = !disabled && scale < 1 && naturalDims !== null;

  return (
    <div
      ref={containerRef}
      id={`autofit-${instanceId}`}
      className={`autofit-table-container w-full overflow-x-auto relative ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        ...style,
      }}
    >
      {isScaled ? (
        <div
          className="autofit-sizing-box mx-auto"
          style={{
            width: `${Math.ceil(naturalDims.width * scale)}px`,
            height: `${Math.ceil(naturalDims.height * scale)}px`,
            position: 'relative',
            overflow: 'visible',
            maxWidth: 'none',
          }}
        >
          <div
            ref={contentRef}
            className="autofit-content-box"
            style={{
              width: `${naturalDims.width}px`,
              minWidth: `${naturalDims.width}px`,
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
        <div ref={contentRef} className="autofit-content-unscaled w-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default AutoFitTable;
