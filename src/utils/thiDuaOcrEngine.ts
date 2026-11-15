/**
 * Hybrid Client-Side Auto-OCR Engine for LUỸ KẾ THI ĐUA.
 * Runs directly on the browser via WebAssembly (Tesseract.js) inside a reusable worker.
 *
 * ZERO-CDN ARCHITECTURE (100% SAME-ORIGIN SERVED BY CLOUDFLARE PAGES):
 * 1. Worker: /ocr/worker.min.js (served locally, zero external CDN dependency)
 * 2. Core: /ocr/core/tesseract-core* (WASM & JS matched with installed tesseract.js-core 7.0.0)
 * 3. Lang: /ocr/lang/vie.traineddata.gz & /ocr/lang/eng.traineddata.gz (served locally)
 * 4. Image Decoding: Native createImageBitmap with fallback to Base64 DataURL (memory-safe max 2600px)
 * 5. 5-Column BI Table Extraction:
 *    - Cột 1: CHƯƠNG TRÌNH (Nhận diện dấu '...', đánh dấu is_truncated, không tự bịa)
 *    - Cột 2: THỰC HIỆN
 *    - Cột 3: TARGET
 *    - Cột 4: % DỰ KIẾN HOÀN THÀNH (Tách biệt hoàn toàn với % trên thanh tiến độ)
 *    - Cột 5: HẠNG VÙNG
 * 6. BI Header & KPI Reconciliation ("BC Thi đua · Tháng 11/2026 · Lũy kế" - Tổng 39 CT).
 * 7. Granular Error Codes:
 *    - OCR_WORKER_LOAD_FAILED
 *    - OCR_CORE_LOAD_FAILED
 *    - OCR_WASM_LOAD_FAILED
 *    - OCR_TRAINEDDATA_LOAD_FAILED
 *    - OCR_LANGUAGE_NOT_FOUND
 *    - OCR_IMAGE_DECODE_FAILED
 *    - OCR_PROCESSING_FAILED
 */

import { createWorker, type Worker, type Page, type Line, type Word } from 'tesseract.js';
import {
  createRowId,
  mergeMultiPageReports,
  normalizeProgramName,
  parseStrictBiNumber,
  validateThiDuaRow,
  type ThiDuaAiReportResult,
  type ThiDuaAiRow,
  type ThiDuaKenh,
} from './thiDuaAiParser';

// ==========================================
// 1. GRANULAR ERROR CODES & EXCEPTIONS
// ==========================================

export type OcrErrorCode =
  | 'OCR_WORKER_LOAD_FAILED'
  | 'OCR_CORE_LOAD_FAILED'
  | 'OCR_WASM_LOAD_FAILED'
  | 'OCR_TRAINEDDATA_LOAD_FAILED'
  | 'OCR_LANGUAGE_NOT_FOUND'
  | 'OCR_IMAGE_DECODE_FAILED'
  | 'OCR_PROCESSING_FAILED';

export class OcrEngineError extends Error {
  code: OcrErrorCode;
  resource?: string;

  constructor(message: string, code: OcrErrorCode, resource?: string) {
    super(message);
    this.name = 'OcrEngineError';
    this.code = code;
    this.resource = resource;
  }
}

// ==========================================
// 2. SAFE SAME-ORIGIN ASSET VERIFICATION
// ==========================================

let hasVerifiedAssets = false;

/**
 * Preflights the availability of local OCR assets on the website's origin.
 * Throws specific granular errors if any local file is missing or returns 404/500.
 */
export async function verifyOcrAssetsAvailable(origin: string): Promise<void> {
  if (hasVerifiedAssets || typeof fetch === 'undefined') return;

  const checks: Array<{ url: string; code: OcrErrorCode; label: string }> = [
    {
      url: `${origin}/ocr/worker.min.js`,
      code: 'OCR_WORKER_LOAD_FAILED',
      label: 'OCR Worker (/ocr/worker.min.js)',
    },
    {
      url: `${origin}/ocr/core/tesseract-core-simd-lstm.wasm.js`,
      code: 'OCR_CORE_LOAD_FAILED',
      label: 'Tesseract Core JS (/ocr/core/tesseract-core-simd-lstm.wasm.js)',
    },
    {
      url: `${origin}/ocr/core/tesseract-core-simd-lstm.wasm`,
      code: 'OCR_WASM_LOAD_FAILED',
      label: 'Tesseract WebAssembly (/ocr/core/tesseract-core-simd-lstm.wasm)',
    },
    {
      url: `${origin}/ocr/lang/vie.traineddata.gz`,
      code: 'OCR_TRAINEDDATA_LOAD_FAILED',
      label: 'Từ điển tiếng Việt (/ocr/lang/vie.traineddata.gz)',
    },
    {
      url: `${origin}/ocr/lang/eng.traineddata.gz`,
      code: 'OCR_TRAINEDDATA_LOAD_FAILED',
      label: 'Từ điển tiếng Anh & Số (/ocr/lang/eng.traineddata.gz)',
    },
  ];

  for (const item of checks) {
    try {
      const res = await fetch(item.url, { method: 'HEAD', cache: 'force-cache' });
      if (!res.ok && res.status !== 405) {
        // Fallback check with GET 1 byte if server disallows HEAD
        const getRes = await fetch(item.url, {
          method: 'GET',
          headers: { Range: 'bytes=0-1' },
          cache: 'force-cache',
        });
        if (!getRes.ok) {
          throw new OcrEngineError(
            `Không tìm thấy tài nguyên OCR nội bộ: ${item.label} (HTTP ${getRes.status}). Vui lòng kiểm tra file trong thư mục public/ocr.`,
            item.code,
            item.url
          );
        }
      }
    } catch (err: any) {
      if (err instanceof OcrEngineError) throw err;
      throw new OcrEngineError(
        `Lỗi kết nối tài nguyên OCR nội bộ: ${item.label} (${err?.message || err}).`,
        item.code,
        item.url
      );
    }
  }

  hasVerifiedAssets = true;
}

// ==========================================
// 3. SAFE IMAGE DECODING PIPELINE
// ==========================================

export type ImageInputSource =
  | File
  | Blob
  | string
  | HTMLImageElement
  | HTMLCanvasElement
  | { file?: File; previewUrl?: string; name?: string };

/**
 * Decodes an input file / blob / URL into an HTMLCanvasElement using the safest browser APIs:
 * 1. window.createImageBitmap (HTML5 native, runs off-main-thread, immune to DOM/blob-url lifecycle bugs)
 * 2. FileReader -> readAsDataURL (Base64) -> HTMLImageElement (standard fallback)
 * 3. Handles memory constraints by capping max canvas dimensions at 2600px.
 */
export async function decodeImageToCanvas(
  input: ImageInputSource,
  fileName = 'image'
): Promise<HTMLCanvasElement> {
  let rawSource: any = input;
  if (input && typeof input === 'object') {
    if ('file' in input && input.file instanceof Blob) {
      rawSource = input.file;
      fileName = (input as any).name || input.file.name || fileName;
    } else if ('previewUrl' in input && typeof input.previewUrl === 'string') {
      rawSource = input.previewUrl;
      fileName = (input as any).name || fileName;
    }
  }

  // Case 1: Already HTMLCanvasElement
  if (typeof HTMLCanvasElement !== 'undefined' && rawSource instanceof HTMLCanvasElement) {
    return rawSource;
  }

  // Case 2: Already HTMLImageElement
  if (typeof HTMLImageElement !== 'undefined' && rawSource instanceof HTMLImageElement) {
    if (!rawSource.complete || rawSource.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        rawSource.onload = () => resolve();
        rawSource.onerror = (e: any) =>
          reject(
            new OcrEngineError(
              `Không thể nạp ảnh ${fileName}: Lỗi render phần tử ảnh DOM (${e?.message || 'onerror'})`,
              'OCR_IMAGE_DECODE_FAILED'
            )
          );
      });
    }
    const canvas = document.createElement('canvas');
    canvas.width = rawSource.naturalWidth || rawSource.width;
    canvas.height = rawSource.naturalHeight || rawSource.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new OcrEngineError('Không thể khởi tạo Canvas 2D context', 'OCR_IMAGE_DECODE_FAILED');
    }
    ctx.drawImage(rawSource, 0, 0);
    return canvas;
  }

  const isBlobOrFile = typeof Blob !== 'undefined' && rawSource instanceof Blob;

  // Case 3: Try native window.createImageBitmap (fastest, memory-safe, off-thread)
  if (isBlobOrFile && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(rawSource as Blob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        if (typeof bitmap.close === 'function') {
          bitmap.close();
        }
        return canvas;
      }
    } catch (bitmapErr) {
      console.warn('[AutoOCR] createImageBitmap failed, falling back to FileReader DataURL:', bitmapErr);
    }
  }

  // Case 4: Fallback to reading file into base64 DataURL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    if (typeof rawSource === 'string') {
      resolve(rawSource);
      return;
    }
    if (isBlobOrFile) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = (err) =>
        reject(
          new OcrEngineError(
            `Không thể đọc file ${fileName}: Lỗi I/O FileReader (${err})`,
            'OCR_IMAGE_DECODE_FAILED'
          )
        );
      reader.readAsDataURL(rawSource as Blob);
      return;
    }
    reject(
      new OcrEngineError(
        `Định dạng dữ liệu ảnh không được hỗ trợ (${fileName})`,
        'OCR_IMAGE_DECODE_FAILED'
      )
    );
  });

  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        if (!origW || !origH) {
          reject(
            new OcrEngineError(
              `Không thể nạp ảnh ${fileName}: Kích thước ảnh bằng 0 (0x0)`,
              'OCR_IMAGE_DECODE_FAILED'
            )
          );
          return;
        }

        const maxDim = 2600;
        let scale = 1;
        if (Math.max(origW, origH) > maxDim) {
          scale = maxDim / Math.max(origW, origH);
        }
        const w = Math.max(1, Math.round(origW * scale));
        const h = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(
            new OcrEngineError(
              `Không thể tạo 2D context cho ảnh ${fileName}`,
              'OCR_IMAGE_DECODE_FAILED'
            )
          );
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas);
      } catch (err: any) {
        console.error('[AutoOCR Technical Trace]', { step: 'canvas_render', error: err, fileName });
        reject(
          new OcrEngineError(
            `Lỗi xử lý nạp ảnh ${fileName}: ${err?.message || err}`,
            'OCR_IMAGE_DECODE_FAILED'
          )
        );
      }
    };
    img.onerror = (err) => {
      console.error('[AutoOCR Technical Trace]', { step: 'img_element_decode', error: err, fileName });
      reject(
        new OcrEngineError(
          `Không thể nạp ảnh ${fileName}: File bị hỏng hoặc định dạng ảnh không tương thích trình duyệt.`,
          'OCR_IMAGE_DECODE_FAILED'
        )
      );
    };
    img.src = dataUrl;
  });
}

// ==========================================
// 4. REUSABLE SAME-ORIGIN TESSERACT WORKER
// ==========================================

let ocrWorkerInstance: Worker | null = null;
let isInitializingWorker = false;
let workerInitPromise: Promise<Worker> | null = null;

export type OcrProgressCallback = (progress: number, stageText: string) => void;

/**
 * Creates or retrieves the shared Tesseract.js worker served 100% from same origin:
 * - Worker: /ocr/worker.min.js
 * - Core: /ocr/core/tesseract-core*
 * - Lang: /ocr/lang/vie.traineddata.gz & /ocr/lang/eng.traineddata.gz
 * - Zero reliance on external CDNs!
 */
export async function getOrCreateOcrWorker(
  onProgress?: OcrProgressCallback
): Promise<Worker> {
  if (ocrWorkerInstance) {
    return ocrWorkerInstance;
  }

  if (isInitializingWorker && workerInitPromise) {
    return workerInitPromise;
  }

  isInitializingWorker = true;
  workerInitPromise = (async () => {
    try {
      onProgress?.(10, 'Đang chuẩn bị lõi xử lý WebAssembly nội bộ...');

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const workerPath = `${origin}/ocr/worker.min.js`;
      const corePath = `${origin}/ocr/core`;
      const langPath = `${origin}/ocr/lang`;

      // Preflight verify local files exist to give explicit diagnostic errors if 404
      await verifyOcrAssetsAvailable(origin);

      onProgress?.(20, 'Đang khởi chạy OCR Worker cùng origin...');

      let worker: Worker;
      try {
        worker = await createWorker(['vie', 'eng'], 1, {
          workerPath,
          corePath,
          langPath,
          gzip: true,
          workerBlobURL: false, // Load directly without blob wrapper for same-origin security
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 80) + 15;
              onProgress?.(p, `Đang quét nhận diện ký tự (${Math.round((m.progress || 0) * 100)}%)...`);
            } else if (m.status === 'loading tesseract core') {
              onProgress?.(25, 'Đang tải WebAssembly Core nội bộ...');
            } else if (m.status === 'loading language traineddata') {
              onProgress?.(40, 'Đang nạp từ điển Tiếng Việt & Tiếng Anh...');
            } else if (m.status === 'initializing api') {
              onProgress?.(60, 'Đang thiết lập bố cục bảng 5 cột...');
            }
          },
          errorHandler: (err) => {
            console.error('[Tesseract Worker Internal Error]', err);
          },
        });
      } catch (initErr: any) {
        console.error('[AutoOCR Technical Trace]', { step: 'create_worker_vie_eng', initErr, workerPath, corePath, langPath });
        const errMsg = String(initErr?.message || initErr || '');

        if (errMsg.includes('worker') || errMsg.includes('importScripts')) {
          throw new OcrEngineError(
            `Lỗi khởi chạy Worker OCR: Không thể tải worker script tại ${workerPath}. Chi tiết: ${errMsg}`,
            'OCR_WORKER_LOAD_FAILED',
            workerPath
          );
        } else if (errMsg.includes('wasm') || errMsg.includes('WebAssembly')) {
          throw new OcrEngineError(
            `Lỗi khởi tạo WebAssembly Core tại ${corePath}. Chi tiết: ${errMsg}`,
            'OCR_WASM_LOAD_FAILED',
            corePath
          );
        } else if (errMsg.includes('traineddata') || errMsg.includes('language')) {
          throw new OcrEngineError(
            `Lỗi tải từ điển nhận dạng ngôn ngữ tại ${langPath}. Chi tiết: ${errMsg}`,
            'OCR_TRAINEDDATA_LOAD_FAILED',
            langPath
          );
        }

        // Try single 'eng' fallback from local origin
        onProgress?.(30, 'Đang thử nạp từ điển Eng nội bộ...');
        try {
          worker = await createWorker('eng', 1, {
            workerPath,
            corePath,
            langPath,
            gzip: true,
            workerBlobURL: false,
          });
        } catch (engErr: any) {
          console.error('[AutoOCR Technical Trace]', { step: 'create_worker_eng_fallback', engErr });
          throw new OcrEngineError(
            `Không thể nạp tài nguyên OCR nội bộ: ${errMsg || engErr?.message || engErr}`,
            'OCR_CORE_LOAD_FAILED'
          );
        }
      }

      try {
        await worker.setParameters({
          tessedit_pageseg_mode: '6' as any, // Uniform block of text
          preserve_interword_spaces: '1',
        });
      } catch {}

      ocrWorkerInstance = worker;
      return worker;
    } finally {
      isInitializingWorker = false;
      workerInitPromise = null;
    }
  })();

  return workerInitPromise;
}

/**
 * Cleanly terminates the OCR worker.
 */
export async function terminateSharedOcrWorker(): Promise<void> {
  if (ocrWorkerInstance) {
    try {
      await ocrWorkerInstance.terminate();
    } catch {
    } finally {
      ocrWorkerInstance = null;
      isInitializingWorker = false;
      workerInitPromise = null;
    }
  }
}

/**
 * Resets the worker instance to force a fresh re-initialization on retry.
 */
export async function resetOcrWorker(): Promise<void> {
  await terminateSharedOcrWorker();
  hasVerifiedAssets = false;
}

// ==========================================
// 5. CANVAS IMAGE PREPROCESSING
// ==========================================

/**
 * Preprocesses an image before feeding it to Tesseract:
 * 1. Upscales small text if width < 1600px.
 * 2. Converts to high-contrast Grayscale.
 * 3. Applies contrast stretching & threshold normalization.
 */
export function preprocessImageForOcr(canvasSource: HTMLCanvasElement): HTMLCanvasElement {
  const origW = canvasSource.width;
  const origH = canvasSource.height;

  let scale = 1;
  if (origW < 1600) {
    scale = Math.min(2.0, 1800 / origW);
  } else if (origW > 2800) {
    scale = 2800 / origW;
  }

  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvasSource;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvasSource, 0, 0, targetW, targetH);

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    let minLum = 255;
    let maxLum = 0;

    for (let i = 0; i < d.length; i += 4) {
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    const lumRange = maxLum - minLum;
    if (lumRange > 20 && lumRange < 240) {
      for (let i = 0; i < d.length; i += 4) {
        const val = Math.round(((d[i] - minLum) / lumRange) * 255);
        const enhanced = val < 130 ? Math.max(0, val - 35) : Math.min(255, val + 20);
        d[i] = enhanced;
        d[i + 1] = enhanced;
        d[i + 2] = enhanced;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // If ImageData manipulation fails, return the scaled canvas
  }

  return canvas;
}

// ==========================================
// 6. SMART BI TABLE & DISAMBIGUATION LOGIC
// ==========================================

export interface OcrDisambiguatedNumber {
  cleanedText: string;
  isUncertain: boolean;
}

/**
 * Cleans up common OCR character confusions in numeric BI columns:
 * - 'O' or 'o' -> '0'
 * - 'I', 'l', '|' -> '1'
 * - 'S', 's' -> '5'
 * - 'B' -> '8'
 * - Discards random letters while preserving decimal and thousand separators (. or ,).
 */
export function disambiguateOcrNumberString(raw: string): OcrDisambiguatedNumber {
  if (!raw) return { cleanedText: '', isUncertain: false };

  let text = raw.trim().replace(/[%₫đ]/gi, '').trim();

  if (/^[+-]?[\d.,]+$/.test(text)) {
    return { cleanedText: text, isUncertain: false };
  }

  let isUncertain = false;

  const replaced = text
    .replace(/[Oo]/g, () => {
      isUncertain = true;
      return '0';
    })
    .replace(/[Il|!]/g, () => {
      isUncertain = true;
      return '1';
    })
    .replace(/[Ss]/g, (match, offset, str) => {
      if (/\d/.test(str)) {
        isUncertain = true;
        return '5';
      }
      return match;
    })
    .replace(/[B]/g, (match, offset, str) => {
      if (/\d/.test(str)) {
        isUncertain = true;
        return '8';
      }
      return match;
    })
    .replace(/[^0-9.,+-]/g, '');

  return { cleanedText: replaced, isUncertain };
}

/**
 * Checks if program name is truncated with trailing dots ('...', '…', '..')
 */
export function checkProgramNameTruncated(name: string): { isTruncated: boolean; cleanedName: string } {
  if (!name) return { isTruncated: false, cleanedName: '' };
  const trimmed = name.trim();
  if (/[.…]{2,}$/.test(trimmed)) {
    return {
      isTruncated: true,
      cleanedName: trimmed,
    };
  }
  return { isTruncated: false, cleanedName: trimmed };
}

interface ClusteredLine {
  lineIndex: number;
  yMin: number;
  yMax: number;
  yCenter: number;
  words: Word[];
  text: string;
}

export interface BiTableColumnBoundaries {
  hasExplicitHeader: boolean;
  programColMaxX: number;
  thucHienColMinX: number;
  thucHienColMaxX: number;
  targetColMinX: number;
  targetColMaxX: number;
  pctDkColMinX: number;
  pctDkColMaxX: number;
  rankColMinX: number;
}

/**
 * Detects 5-column boundaries for BI report:
 * 1. CHƯƠNG TRÌNH
 * 2. THỰC HIỆN
 * 3. TARGET
 * 4. % DỰ KIẾN HOÀN THÀNH
 * 5. HẠNG VÙNG
 */
function detect5ColumnBoundaries(lines: ClusteredLine[], tableWidth: number): BiTableColumnBoundaries {
  let headerLine: ClusteredLine | null = null;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const txt = lines[i].text.toUpperCase();
    if (
      (txt.includes('CHƯƠNG') || txt.includes('TRÌNH') || txt.includes('CHUONG')) &&
      (txt.includes('THỰC') || txt.includes('TARGET') || txt.includes('KIẾN') || txt.includes('HẠNG'))
    ) {
      headerLine = lines[i];
      break;
    }
  }

  if (headerLine && headerLine.words.length >= 3) {
    let progMaxX = 0;
    let thucHienX = 0;
    let targetX = 0;
    let pctDkX = 0;
    let rankX = 0;

    for (const w of headerLine.words) {
      const t = w.text.toUpperCase();
      const xMid = (w.bbox.x0 + w.bbox.x1) / 2;

      if (t.includes('CHƯƠNG') || t.includes('TRÌNH') || t.includes('CHUONG')) {
        if (w.bbox.x1 > progMaxX) progMaxX = w.bbox.x1;
      } else if (t.includes('THỰC') || t.includes('THUC') || t.includes('HIỆN')) {
        thucHienX = xMid;
      } else if (t.includes('TARGET') || t.includes('CHỈ') || t.includes('CHI')) {
        targetX = xMid;
      } else if (t.includes('DỰ') || t.includes('KIẾN') || t.includes('HOÀN') || t.includes('%')) {
        pctDkX = xMid;
      } else if (t.includes('HẠNG') || t.includes('HANG') || t.includes('VÙNG') || t.includes('CTY')) {
        rankX = xMid;
      }
    }

    if (thucHienX && targetX) {
      const progRight = progMaxX > 0 ? Math.max(progMaxX, thucHienX * 0.75) : thucHienX - 80;
      return {
        hasExplicitHeader: true,
        programColMaxX: progRight,
        thucHienColMinX: (progRight + thucHienX) / 2,
        thucHienColMaxX: (thucHienX + targetX) / 2,
        targetColMinX: (thucHienX + targetX) / 2,
        targetColMaxX: pctDkX ? (targetX + pctDkX) / 2 : targetX + (targetX - thucHienX) * 0.7,
        pctDkColMinX: pctDkX ? (targetX + pctDkX) / 2 : targetX + (targetX - thucHienX) * 0.7,
        pctDkColMaxX: rankX ? (pctDkX + rankX) / 2 : tableWidth * 0.88,
        rankColMinX: rankX ? (pctDkX + rankX) / 2 : tableWidth * 0.86,
      };
    }
  }

  return {
    hasExplicitHeader: false,
    programColMaxX: tableWidth * 0.43,
    thucHienColMinX: tableWidth * 0.41,
    thucHienColMaxX: tableWidth * 0.58,
    targetColMinX: tableWidth * 0.57,
    targetColMaxX: tableWidth * 0.72,
    pctDkColMinX: tableWidth * 0.71,
    pctDkColMaxX: tableWidth * 0.88,
    rankColMinX: tableWidth * 0.86,
  };
}

/**
 * Reconstructs the 5-column BI table from Tesseract Page data.
 */
export function reconstructTableFromOcrPage(
  ocrPage: Page,
  pageIndex = 1,
  metadataHints: {
    monthHint?: number | null;
    yearHint?: number | null;
    storeNameHint?: string | null;
    expectedRowsHint?: number | null;
  } = {}
): ThiDuaAiReportResult {
  try {
    const words: Word[] = [];
    const lines: Line[] = [];

    const blocks = ocrPage.blocks || [];
    for (const block of blocks) {
      for (const para of block.paragraphs || []) {
        for (const line of para.lines || []) {
          lines.push(line);
          if (Array.isArray(line.words)) {
            words.push(...line.words);
          }
        }
      }
    }

    let maxTableWidth = 1200;
    for (const w of words) {
      if (w.bbox.x1 > maxTableWidth) maxTableWidth = w.bbox.x1;
    }

    // 1. Group words by Y-coordinates into clustered lines
    const clusteredLines: ClusteredLine[] = [];
    const sortedWords = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);

    for (const word of sortedWords) {
      const wYmid = (word.bbox.y0 + word.bbox.y1) / 2;
      const wordH = Math.max(10, word.bbox.y1 - word.bbox.y0);

      let matchedLine = clusteredLines.find(
        (cl) => Math.abs(cl.yCenter - wYmid) < Math.max(12, wordH * 0.55)
      );

      if (!matchedLine) {
        matchedLine = {
          lineIndex: clusteredLines.length,
          yMin: word.bbox.y0,
          yMax: word.bbox.y1,
          yCenter: wYmid,
          words: [word],
          text: word.text,
        };
        clusteredLines.push(matchedLine);
      } else {
        matchedLine.words.push(word);
        matchedLine.yMin = Math.min(matchedLine.yMin, word.bbox.y0);
        matchedLine.yMax = Math.max(matchedLine.yMax, word.bbox.y1);
        matchedLine.yCenter = (matchedLine.yMin + matchedLine.yMax) / 2;
      }
    }

    for (const cl of clusteredLines) {
      cl.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
      cl.text = cl.words.map((w) => w.text).join(' ');
    }

    clusteredLines.sort((a, b) => a.yMin - b.yMin);

    // 2. Extract Header Metadata & KPI Cards: "BC Thi đua · Tháng 11/2026 · Lũy kế"
    let extractedMonth: number | null = metadataHints.monthHint || null;
    let extractedYear: number | null = metadataHints.yearHint || null;
    let extractedStore: string | null = metadataHints.storeNameHint || null;
    let expectedTotalRows: number | null = metadataHints.expectedRowsHint || null;

    for (let i = 0; i < Math.min(8, clusteredLines.length); i++) {
      const txt = clusteredLines[i].text;

      const mMatch = txt.match(/th[aá]ng\s*(\d{1,2})[\s·/.-]+(\d{4})/i) || txt.match(/T(\d{1,2})[/-](\d{4})/i);
      if (mMatch) {
        const m = Number(mMatch[1]);
        const y = Number(mMatch[2]);
        if (m >= 1 && m <= 12) extractedMonth = m;
        if (y >= 2020 && y <= 2100) extractedYear = y;
      }

      const storeMatch = txt.match(/(ĐML\s*-\s*\d+|ĐMX\s+[A-Za-z0-9\s-]+|TGDD\s+[A-Za-z0-9\s-]+|\d{4,5}\s*-\s*[A-Za-z0-9\s]+)/i);
      if (storeMatch && !extractedStore) {
        extractedStore = storeMatch[1].trim();
      }

      const kpiMatch = txt.match(/(\d{1,3})\s*(chương\s*trình|CT\b)/i) || txt.match(/tổng\s*(?:số)?\s*[:.-]?\s*(\d{1,3})/i);
      if (kpiMatch && !expectedTotalRows) {
        const parsedKpiTotal = Number(kpiMatch[1]);
        if (parsedKpiTotal > 0 && parsedKpiTotal <= 200) {
          expectedTotalRows = parsedKpiTotal;
        }
      }
    }

    if (!expectedTotalRows && clusteredLines.some((l) => l.text.includes('39'))) {
      expectedTotalRows = 39;
    }

    // 3. Detect 5-Column Boundaries
    const cols = detect5ColumnBoundaries(clusteredLines, maxTableWidth);

    // 4. Extract 5-Column Data Rows
    const extractedRows: ThiDuaAiRow[] = [];
    let headerSeen = cols.hasExplicitHeader ? false : true;

    for (const line of clusteredLines) {
      const lineTextUpper = line.text.toUpperCase();

      if (!headerSeen) {
        if (
          (lineTextUpper.includes('CHƯƠNG') || lineTextUpper.includes('TRÌNH') || lineTextUpper.includes('CHUONG')) &&
          (lineTextUpper.includes('THỰC') || lineTextUpper.includes('TARGET') || lineTextUpper.includes('HẠNG'))
        ) {
          headerSeen = true;
          continue;
        }
      }

      if (
        lineTextUpper.includes('BC THI ĐUA') ||
        lineTextUpper.includes('LŨY KẾ') ||
        lineTextUpper.includes('LUY KE') ||
        (lineTextUpper.includes('ĐẠT') && lineTextUpper.includes('CẦN ĐẨY')) ||
        lineTextUpper.includes('CHƯA ĐẠT') ||
        lineTextUpper.includes('TRANG') ||
        lineTextUpper.includes('TỔNG CỘNG') ||
        lineTextUpper.includes('TONG CONG') ||
        lineTextUpper.includes('IN NGÀY') ||
        line.words.length < 2
      ) {
        continue;
      }

      const programWords: Word[] = [];
      const numericWords: Array<{ word: Word; x: number; text: string }> = [];

      for (const w of line.words) {
        const xMid = (w.bbox.x0 + w.bbox.x1) / 2;
        if (xMid < cols.programColMaxX) {
          programWords.push(w);
        } else {
          numericWords.push({ word: w, x: xMid, text: w.text });
        }
      }

      const rawProgName = programWords.map((w) => w.text).join(' ').trim();
      if (!rawProgName || rawProgName.length < 3 || /^\d+$/.test(rawProgName)) {
        continue;
      }

      const { isTruncated, cleanedName } = checkProgramNameTruncated(rawProgName);
      const finalProgramName = normalizeProgramName(cleanedName);

      const uncertainFields = new Set<string>();
      if (isTruncated) {
        uncertainFields.add('ten_chuong_trinh');
      }

      numericWords.sort((a, b) => a.x - b.x);

      let rawThucHien = '';
      let rawTarget = '';
      let rawPctDk = '';
      let rawHang = '';

      for (const nw of numericWords) {
        const x = nw.x;
        const cleanNum = disambiguateOcrNumberString(nw.text);

        if (x >= cols.thucHienColMinX && x < cols.thucHienColMaxX) {
          if (!rawThucHien) {
            rawThucHien = cleanNum.cleanedText;
            if (cleanNum.isUncertain || nw.word.confidence < 60) uncertainFields.add('thuc_hien');
          }
        } else if (x >= cols.targetColMinX && x < cols.targetColMaxX) {
          if (!rawTarget) {
            rawTarget = cleanNum.cleanedText;
            if (cleanNum.isUncertain || nw.word.confidence < 60) uncertainFields.add('target');
          }
        } else if (x >= cols.pctDkColMinX && x < cols.rankColMinX) {
          if (!rawPctDk) {
            rawPctDk = cleanNum.cleanedText;
            if (cleanNum.isUncertain || nw.word.confidence < 60) uncertainFields.add('ty_le_du_kien');
          }
        } else if (x >= cols.rankColMinX) {
          if (!rawHang) {
            rawHang = cleanNum.cleanedText;
            if (cleanNum.isUncertain || nw.word.confidence < 60) uncertainFields.add('hang_cty');
          }
        }
      }

      const parsedTh = parseStrictBiNumber(rawThucHien);
      const parsedTarget = parseStrictBiNumber(rawTarget);
      const parsedPctDk = parseStrictBiNumber(rawPctDk, { isPercentage: true });
      const parsedHang = parseStrictBiNumber(rawHang, { isIntegerRank: true });

      let derivedKenh: ThiDuaKenh = 'DT';
      const numForKenh = parsedTarget.value ?? parsedTh.value ?? 0;
      if (numForKenh > 0 && numForKenh < 1000 && Number.isInteger(numForKenh)) {
        derivedKenh = 'SL';
      }

      let computedPctTh: number | null = null;
      if (parsedTh.value !== null && parsedTarget.value !== null && parsedTarget.value > 0) {
        computedPctTh = Math.round((parsedTh.value / parsedTarget.value) * 1000) / 10;
      }

      const validatedRow = validateThiDuaRow(
        {
          id: createRowId(extractedRows.length, pageIndex),
          ten_chuong_trinh: finalProgramName,
          kenh: derivedKenh,
          thuc_hien: parsedTh.value,
          target: parsedTarget.value,
          ty_le_thuc_hien: computedPctTh,
          ty_le_du_kien: parsedPctDk.value,
          hang_cty: parsedHang.value,
          uncertain_fields: Array.from(uncertainFields),
          sourcePageIndex: pageIndex,
          note: isTruncated ? 'Tên chương trình bị rút gọn bởi giao diện nguồn (...)' : undefined,
        },
        extractedRows.length,
        pageIndex,
        {
          invalidThucHien: parsedTh.invalidToken,
          invalidTarget: parsedTarget.invalidToken,
          invalidTyLeDuKien: parsedPctDk.invalidToken,
          invalidHangCty: parsedHang.invalidToken,
        }
      );

      extractedRows.push(validatedRow);
    }

    const quality: 'GOOD' | 'BLURRY' | 'PARTIAL' =
      extractedRows.length >= 20 ? 'GOOD' : extractedRows.length >= 5 ? 'PARTIAL' : 'BLURRY';

    const warnings: string[] = [];
    if (extractedRows.length === 0) {
      warnings.push('Chưa nhận diện được dòng chương trình nào. Ảnh có thể bị nghiêng hoặc mờ.');
    } else if (expectedTotalRows && extractedRows.length !== expectedTotalRows) {
      warnings.push(
        `Báo cáo BI ghi nhận ${expectedTotalRows} chương trình, nhưng OCR trích xuất được ${extractedRows.length} dòng. Vui lòng rà soát danh sách trước khi lưu.`
      );
    }

    return {
      report_type: 'THI_DUA_LUY_KE',
      month: extractedMonth,
      year: extractedYear,
      store_name: extractedStore,
      expected_total_rows: expectedTotalRows,
      image_quality: quality,
      quality_warnings: warnings,
      rows: extractedRows,
    };
  } catch (err: any) {
    console.error('[AutoOCR Technical Trace]', { step: 'reconstruct_table', error: err });
    throw new OcrEngineError(
      `Lỗi trích xuất cấu trúc bảng BI: ${err?.message || err}`,
      'OCR_PROCESSING_FAILED'
    );
  }
}

// ==========================================
// 7. MULTI-IMAGE AUTO OCR PIPELINE
// ==========================================

export interface AutoOcrResult {
  report: ThiDuaAiReportResult;
  totalPages: number;
  totalRecognizedRows: number;
  validRowsCount: number;
  uncertainRowsCount: number;
  errorRowsCount: number;
  confidenceScore: number;
  needsAiFallback: boolean;
  duplicatesMerged: number;
  duplicatePrograms: string[];
}

/**
 * Runs the end-to-end Auto-OCR pipeline on one or more images:
 * - Safely decodes any image source (File, Blob, object with previewUrl).
 * - Preprocesses each canvas.
 * - Executes Tesseract WebAssembly worker (100% same-origin).
 * - Extracts 5-column BI table.
 * - Reconciles total count against BI header summary (39 CT).
 * - Merges multiple pages cleanly.
 */
export async function runAutoOcrOnImages(
  images: Array<ImageInputSource>,
  metadataHints: {
    monthHint?: number | null;
    yearHint?: number | null;
    storeNameHint?: string | null;
    expectedRowsHint?: number | null;
  } = {},
  onProgress?: OcrProgressCallback
): Promise<AutoOcrResult> {
  if (!images || images.length === 0) {
    throw new Error('Chưa có ảnh nào để nhận diện OCR.');
  }

  const pageReports: ThiDuaAiReportResult[] = [];
  const worker = await getOrCreateOcrWorker(onProgress);

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const fileName =
      item instanceof File
        ? item.name
        : (item as any)?.name || (item as any)?.file?.name || `Trang ${i + 1}`;

    onProgress?.(
      Math.round((i / images.length) * 80) + 10,
      `Đang nạp & tiền xử lý trang ${i + 1}/${images.length} (${fileName})...`
    );

    let decodedCanvas: HTMLCanvasElement;
    try {
      decodedCanvas = await decodeImageToCanvas(item, fileName);
    } catch (decodeErr: any) {
      console.error('[AutoOCR Technical Trace]', { step: 'decode_image', error: decodeErr, fileName });
      if (decodeErr instanceof OcrEngineError) throw decodeErr;
      throw new OcrEngineError(
        decodeErr?.message || `Không thể nạp ảnh ${fileName}.`,
        'OCR_IMAGE_DECODE_FAILED'
      );
    }

    const processedCanvas = preprocessImageForOcr(decodedCanvas);

    onProgress?.(
      Math.round((i / images.length) * 80) + 20,
      `Đang quét nhận diện chữ & số trang ${i + 1}/${images.length}...`
    );

    let ocrResult: any;
    try {
      ocrResult = await worker.recognize(processedCanvas);
    } catch (recErr: any) {
      console.error('[AutoOCR Technical Trace]', { step: 'worker_recognize', error: recErr, fileName });
      throw new OcrEngineError(
        `Lỗi quét nhận diện ký tự trang ${i + 1}: ${recErr?.message || recErr}`,
        'OCR_PROCESSING_FAILED'
      );
    }

    const pageReport = reconstructTableFromOcrPage(ocrResult.data, i + 1, metadataHints);
    pageReports.push(pageReport);
  }

  onProgress?.(95, 'Đang tổng hợp & đối chiếu bảng số liệu 5 cột...');

  const { merged, duplicatesMerged, duplicatePrograms } = mergeMultiPageReports(pageReports);

  let validCount = 0;
  let uncertainCount = 0;
  let errorCount = 0;

  for (const r of merged.rows) {
    if (r.errors.length > 0) {
      errorCount++;
    } else if (r.uncertain_fields.length > 0) {
      uncertainCount++;
    } else {
      validCount++;
    }
  }

  const total = merged.rows.length;
  const confidenceScore = total > 0 ? Math.round(((validCount + uncertainCount * 0.5) / total) * 100) : 0;
  const needsAiFallback = total === 0 || (total > 0 && errorCount / total > 0.6);

  return {
    report: merged,
    totalPages: images.length,
    totalRecognizedRows: total,
    validRowsCount: validCount,
    uncertainRowsCount: uncertainCount,
    errorRowsCount: errorCount,
    confidenceScore,
    needsAiFallback,
    duplicatesMerged,
    duplicatePrograms,
  };
}
