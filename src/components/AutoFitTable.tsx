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
  const instanceId = useId();

  const calculateFit = useCallback(() => {
    if (disabled) {
      setScale(prev => prev === 1 ? prev : 1);
      setNaturalHeight(prev => prev === null ? prev : null);
      return;
    }

    // Khi đang xuất ảnh (screenshot / export mode), luôn giữ nguyên tỷ lệ gốc 100%
    if (
      typeof document !== 'undefined' &&
      (document.body.classList.contains('capturing-screenshot') ||
        document.body.classList.contains('export-short-mode'))
    ) {
      setScale(prev => prev === 1 ? prev : 1);
      setNaturalHeight(prev => prev === null ? prev : null);
      return;
    }

    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const containerWidth = container.clientWidth;
    if (containerWidth <= 0) return;

    // Chiều rộng chuẩn của bảng desktop
    const naturalW = minWidth;

    // Nếu khung chứa rộng hơn hoặc bằng độ rộng chuẩn (Desktop), không cần scale
    if (containerWidth >= naturalW) {
      setScale(prev => prev === 1 ? prev : 1);
      setNaturalHeight(prev => prev === null ? prev : null);
      return;
    }

    // Chiều cao tự nhiên thật của bảng
    const tableEl = content.querySelector('table');
    const naturalH = tableEl ? tableEl.scrollHeight : content.scrollHeight;

    // Tính tỉ lệ thu nhỏ trên mobile để vừa vặn 100% chiều rộng
    const rawScale = containerWidth / naturalW;
    const targetScale = Math.max(minScale, Math.min(1, rawScale));

    // STRICT THRESHOLD GUARD: chỉ update state nếu thay đổi thực sự có ý nghĩa
    // Ngăn chặn 100% hiện tượng rung lắc/infinite render loop
    setScale(prev => Math.abs(prev - targetScale) > 0.005 ? targetScale : prev);
    setNaturalHeight(prev => (prev !== null && Math.abs(prev - naturalH) <= 2) ? prev : naturalH);
  }, [disabled, minWidth, minScale]);

  // Lắng nghe thay đổi kích thước của container (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let rafId: number;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(calculateFit);
    });

    // Chỉ observe container ngoài cùng (không observe content để tránh loop khi transform: scale)
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
            width: `${Math.ceil(minWidth * scale)}px`,
            minWidth: '100%',
            height: `${Math.ceil(naturalHeight * scale)}px`,
            position: 'relative',
            overflow: 'hidden',
            maxWidth: 'none',
          }}
        >
          <div
            ref={contentRef}
            data-autofit-content="true"
            className="autofit-content-box no-mobile-zoom"
            style={{
              width: `${minWidth}px`,
              minWidth: `${minWidth}px`,
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
        <div ref={contentRef} data-autofit-content="true" className="autofit-content-unscaled no-mobile-zoom w-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default AutoFitTable;
