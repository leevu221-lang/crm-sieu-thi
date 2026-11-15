/**
 * Hybrid Client-Side Auto-OCR Engine for LUỸ KẾ THI ĐUA.
 * Runs directly on the browser via WebAssembly (Tesseract.js) inside a reusable worker.
 *
 * KEY FEATURES:
 * 1. Automatic Execution: Runs immediately upon image selection/drop — no manual button required.
 * 2. 2D Table Reconstruction: Utilizes bounding boxes (X, Y) to reliably segment columns & rows.
 * 3. OCR Disambiguation: Corrects 0/O, 1/l/I, 5/S, 8/B, DT/D7/0T, SL/S1/5L and decimal separators.
 * 4. Image Preprocessing: Canvas contrast stretching, grayscale, and smart upscaling for small text.
 * 5. Reusable Worker Singleton: Reuses worker instance across multiple pages to prevent memory leaks and speed up processing.
 * 6. Multi-page Dedup: Integrates with `mergeMultiPageReports` to handle multi-page BI reports cleanly.
 * 7. AI Fallback: Gracefully defers to Cloud AI only if client OCR produces low-confidence/no-table output.
 */

import { createWorker, type Worker, type Page, type Line, type Word } from 'tesseract.js';
import {
  createRowId,
  mergeMultiPageReports,
  normalizeKenh,
  normalizeProgramName,
  parseStrictBiNumber,
  validateThiDuaRow,
  type ThiDuaAiReportResult,
  type ThiDuaAiRow,
  type ThiDuaKenh,
} from './thiDuaAiParser';

// ==========================================
// 1. REUSABLE WORKER SINGLETON
// ==========================================

let ocrWorkerInstance: Worker | null = null;
let isInitializingWorker = false;
let workerInitPromise: Promise<Worker> | null = null;

export type OcrProgressCallback = (progress: number, stageText: string) => void;

/**
 * Retrieves or lazily creates a shared OCR worker.
 * Reusing the worker prevents the 2-3s initialization delay on every image.
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
      onProgress?.(10, 'Đang nạp bộ đọc OCR WebAssembly...');

      // Attempt to load vie+eng for high accuracy with Vietnamese program names and English BI terms
      // If network fails to fetch Vietnamese traineddata, gracefully fallback to 'eng'
      let worker: Worker;
      try {
        worker = await createWorker(['vie', 'eng'], 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 80) + 15;
              onProgress?.(p, `Đang quét nhận diện ký tự (${Math.round((m.progress || 0) * 100)}%)...`);
            } else if (m.status === 'loading tesseract core') {
              onProgress?.(15, 'Đang chuẩn bị lõi xử lý WebAssembly...');
            } else if (m.status === 'loading language traineddata') {
              onProgress?.(30, 'Đang đồng bộ từ điển nhận dạng...');
            } else if (m.status === 'initializing api') {
              onProgress?.(45, 'Đang tối ưu cấu hình bảng...');
            }
          },
        });
      } catch {
        // Fallback to pure 'eng' (built-in characters, numbers, and Latin text)
        worker = await createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 80) + 15;
              onProgress?.(p, `Đang quét nhận diện ký tự (${Math.round((m.progress || 0) * 100)}%)...`);
            }
          },
        });
      }

      // Configure OCR parameters for structured table tabular data
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: '6' as any, // Single uniform block of text (ideal for data tables)
          preserve_interword_spaces: '1',
        });
      } catch {
        // Continue if custom params are not supported
      }

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
 * Cleanly terminates the OCR worker when navigating away or refreshing.
 */
export async function terminateSharedOcrWorker(): Promise<void> {
  if (ocrWorkerInstance) {
    try {
      await ocrWorkerInstance.terminate();
    } catch {
      // Ignore termination errors
    } finally {
      ocrWorkerInstance = null;
      isInitializingWorker = false;
      workerInitPromise = null;
    }
  }
}

// ==========================================
// 2. CANVAS IMAGE PREPROCESSING
// ==========================================

export interface PreprocessedImageResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Preprocesses an image before feeding it to Tesseract:
 * 1. Upscales small text if width < 1600px.
 * 2. Converts to high-contrast Grayscale.
 * 3. Applies contrast stretching & threshold normalization.
 */
export function preprocessImageForOcr(
  img: HTMLImageElement | HTMLCanvasElement
): HTMLCanvasElement {
  const origW = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width;
  const origH = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height;

  // Ideal OCR width for 8-10pt BI table fonts is 1800 - 2600px
  let scale = 1;
  if (origW < 1600) {
    scale = Math.min(2.2, 1800 / origW);
  } else if (origW > 3200) {
    scale = 3200 / origW;
  }

  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  try {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const d = imgData.data;

    // Grayscale + Min/Max luminance calculation for contrast stretching
    let minLum = 255;
    let maxLum = 0;

    for (let i = 0; i < d.length; i += 4) {
      // Standard ITU-R BT.601 luminance
      const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = lum;
      d[i + 1] = lum;
      d[i + 2] = lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    // Contrast stretching if range is compressed
    const lumRange = maxLum - minLum;
    if (lumRange > 20 && lumRange < 235) {
      for (let i = 0; i < d.length; i += 4) {
        const val = Math.round(((d[i] - minLum) / lumRange) * 255);
        // Mild adaptive thresholding to sharpen text characters against light table background
        const enhanced = val < 135 ? Math.max(0, val - 35) : Math.min(255, val + 25);
        d[i] = enhanced;
        d[i + 1] = enhanced;
        d[i + 2] = enhanced;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch {
    // If ImageData manipulation fails (e.g. tainted canvas), keep original draw
  }

  return canvas;
}

// ==========================================
// 3. TABLE STRUCTURE & OCR DISAMBIGUATION
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

  // If already standard number
  if (/^[+-]?[\d.,]+$/.test(text)) {
    return { cleanedText: text, isUncertain: false };
  }

  let isUncertain = false;

  // Disambiguate common OCR letter substitutions in numeric fields
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
      // Only replace S with 5 if flanked by numbers or punctuation
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
 * Disambiguates Kênh (DT vs SL) from OCR text:
 * Handles: "DT", "SL", "D7", "DL", "0T", "S1", "5L", "SI", "Doanh thu", "So luong".
 */
export function disambiguateKenhToken(token: string): { kenh: ThiDuaKenh | null; isUncertain: boolean } {
  const norm = token.normalize('NFC').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (norm === 'DT' || norm === 'DTLK') return { kenh: 'DT', isUncertain: false };
  if (norm === 'SL' || norm === 'SLLK') return { kenh: 'SL', isUncertain: false };

  // Common OCR mistakes
  if (norm === 'D7' || norm === 'DL' || norm === '0T' || norm === 'OT' || norm === 'DF') {
    return { kenh: 'DT', isUncertain: true };
  }
  if (norm === 'S1' || norm === 'SI' || norm === '5L' || norm === 'SL1' || norm === 'S2') {
    return { kenh: 'SL', isUncertain: true };
  }

  return { kenh: normalizeKenh(token), isUncertain: false };
}

interface ClusteredLine {
  lineIndex: number;
  yMin: number;
  yMax: number;
  yCenter: number;
  words: Word[];
  text: string;
}

interface TableColumnBoundaries {
  hasExplicitHeader: boolean;
  programColMaxX: number;
  kenhColMinX: number;
  kenhColMaxX: number;
  thucHienColMinX: number;
  thucHienColMaxX: number;
  targetColMinX: number;
  targetColMaxX: number;
  pctThColMinX?: number;
  pctThColMaxX?: number;
  pctDkColMinX: number;
  pctDkColMaxX: number;
  rankColMinX: number;
}

/**
 * Detects column boundaries from header text words or geometric distribution.
 */
function detectColumnBoundaries(lines: ClusteredLine[], tableWidth: number): TableColumnBoundaries {
  // Look for header keywords in the first 10 lines
  let headerLine: ClusteredLine | null = null;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const txt = lines[i].text.toUpperCase();
    if (
      (txt.includes('CHƯƠNG') || txt.includes('CHUONG') || txt.includes('TRÌNH') || txt.includes('TRINH')) &&
      (txt.includes('KÊNH') || txt.includes('KENH') || txt.includes('THỰC') || txt.includes('THUC') || txt.includes('TARGET'))
    ) {
      headerLine = lines[i];
      break;
    }
  }

  if (headerLine && headerLine.words.length >= 3) {
    let kenhX = 0;
    let thucHienX = 0;
    let targetX = 0;
    let pctThX = 0;
    let pctDkX = 0;
    let rankX = 0;

    for (const w of headerLine.words) {
      const t = w.text.toUpperCase();
      const xMid = (w.bbox.x0 + w.bbox.x1) / 2;
      if (t.includes('KÊNH') || t.includes('KENH')) kenhX = xMid;
      else if (t.includes('THỰC') || t.includes('THUC')) {
        if (!thucHienX) thucHienX = xMid;
      } else if (t.includes('TARGET') || t.includes('CHỈ') || t.includes('CHI')) {
        targetX = xMid;
      } else if (t.includes('DỰ') || t.includes('DU') || t.includes('KIẾN') || t.includes('KIEN')) {
        pctDkX = xMid;
      } else if (t.includes('HẠNG') || t.includes('HANG') || t.includes('CTY')) {
        rankX = xMid;
      }
    }

    if (kenhX && thucHienX && targetX) {
      return {
        hasExplicitHeader: true,
        programColMaxX: (kenhX + (kenhX - 50)) / 2,
        kenhColMinX: kenhX - (thucHienX - kenhX) * 0.4,
        kenhColMaxX: (kenhX + thucHienX) / 2,
        thucHienColMinX: (kenhX + thucHienX) / 2,
        thucHienColMaxX: (thucHienX + targetX) / 2,
        targetColMinX: (thucHienX + targetX) / 2,
        targetColMaxX: pctDkX ? (targetX + pctDkX) / 2 : targetX + (targetX - thucHienX) * 0.6,
        pctDkColMinX: pctDkX ? (targetX + pctDkX) / 2 : targetX + (targetX - thucHienX) * 0.6,
        pctDkColMaxX: rankX ? (pctDkX + rankX) / 2 : tableWidth * 0.9,
        rankColMinX: rankX ? (pctDkX + rankX) / 2 : tableWidth * 0.88,
      };
    }
  }

  // Fallback to canonical MWG BI table column width ratios
  return {
    hasExplicitHeader: false,
    programColMaxX: tableWidth * 0.38,
    kenhColMinX: tableWidth * 0.36,
    kenhColMaxX: tableWidth * 0.46,
    thucHienColMinX: tableWidth * 0.45,
    thucHienColMaxX: tableWidth * 0.58,
    targetColMinX: tableWidth * 0.57,
    targetColMaxX: tableWidth * 0.70,
    pctThColMinX: tableWidth * 0.69,
    pctThColMaxX: tableWidth * 0.80,
    pctDkColMinX: tableWidth * 0.78,
    pctDkColMaxX: tableWidth * 0.90,
    rankColMinX: tableWidth * 0.89,
  };
}

/**
 * Parses OCR recognized words & bounding boxes into a standardized `ThiDuaAiReportResult`.
 */
export function reconstructTableFromOcrPage(
  ocrPage: Page,
  pageIndex = 1,
  metadataHints: {
    monthHint?: number | null;
    yearHint?: number | null;
    storeNameHint?: string | null;
  } = {}
): ThiDuaAiReportResult {
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

  // Determine image/table width
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

  // Sort words inside each line from left to right (X0 ascending)
  for (const cl of clusteredLines) {
    cl.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    cl.text = cl.words.map((w) => w.text).join(' ');
  }

  // Sort lines from top to bottom
  clusteredLines.sort((a, b) => a.yMin - b.yMin);

  // 2. Extract Metadata (Month, Year, Store Name) from header lines
  let extractedMonth: number | null = metadataHints.monthHint || null;
  let extractedYear: number | null = metadataHints.yearHint || null;
  let extractedStore: string | null = metadataHints.storeNameHint || null;

  for (let i = 0; i < Math.min(6, clusteredLines.length); i++) {
    const txt = clusteredLines[i].text;
    const monthMatch = txt.match(/th[aá]ng\s*(\d{1,2})[/-](\d{4})/i) || txt.match(/T(\d{1,2})[/-](\d{4})/i);
    if (monthMatch) {
      const m = Number(monthMatch[1]);
      const y = Number(monthMatch[2]);
      if (m >= 1 && m <= 12) extractedMonth = m;
      if (y >= 2020 && y <= 2100) extractedYear = y;
    }

    const storeMatch = txt.match(/(ĐML\s*-\s*\d+|ĐMX\s+[A-Za-z0-9\s]+|TGDD\s+[A-Za-z0-9\s]+)/i);
    if (storeMatch && !extractedStore) {
      extractedStore = storeMatch[1].trim();
    }
  }

  // 3. Detect Column Boundaries
  const cols = detectColumnBoundaries(clusteredLines, maxTableWidth);

  // 4. Identify Data Rows
  const extractedRows: ThiDuaAiRow[] = [];
  let headerSeen = cols.hasExplicitHeader ? false : true;

  for (const line of clusteredLines) {
    const lineTextUpper = line.text.toUpperCase();

    // Skip header line if not seen yet
    if (!headerSeen) {
      if (
        (lineTextUpper.includes('CHƯƠNG') || lineTextUpper.includes('TRÌNH') || lineTextUpper.includes('CHUONG')) &&
        (lineTextUpper.includes('KÊNH') || lineTextUpper.includes('THỰC') || lineTextUpper.includes('TARGET'))
      ) {
        headerSeen = true;
        continue;
      }
    }

    // Skip footer / non-table lines
    if (
      lineTextUpper.includes('TRANG') ||
      lineTextUpper.includes('TỔNG CỘNG') ||
      lineTextUpper.includes('TONG CONG') ||
      lineTextUpper.includes('IN NGÀY') ||
      line.words.length < 2
    ) {
      continue;
    }

    // Classify words in this line into columns
    const programWords: Word[] = [];
    let kenhCandidate = '';
    let kenhConfidence = 100;
    const numericWords: Array<{ word: Word; x: number; text: string }> = [];

    for (const w of line.words) {
      const xMid = (w.bbox.x0 + w.bbox.x1) / 2;

      if (xMid < cols.programColMaxX) {
        programWords.push(w);
      } else if (xMid >= cols.kenhColMinX && xMid <= cols.kenhColMaxX) {
        kenhCandidate = w.text;
        kenhConfidence = w.confidence;
      } else {
        numericWords.push({ word: w, x: xMid, text: w.text });
      }
    }

    // If Col 2 was empty, look if program words end with DT/SL or first numeric word is DT/SL
    if (!kenhCandidate) {
      const lastProgWord = programWords[programWords.length - 1];
      if (lastProgWord && /^(DT|SL|D7|S1|5L|0T)$/i.test(lastProgWord.text)) {
        kenhCandidate = lastProgWord.text;
        kenhConfidence = lastProgWord.confidence;
        programWords.pop();
      } else if (numericWords[0] && /^(DT|SL|D7|S1|5L|0T)$/i.test(numericWords[0].text)) {
        kenhCandidate = numericWords[0].text;
        kenhConfidence = numericWords[0].word.confidence;
        numericWords.shift();
      }
    }

    const programName = normalizeProgramName(programWords.map((w) => w.text).join(' '));

    // Ignore lines that don't have a reasonable program name
    if (!programName || programName.length < 3 || /^\d+$/.test(programName)) {
      continue;
    }

    const uncertainFields = new Set<string>();

    // Kenh normalization
    const { kenh, isUncertain: kenhUncertain } = disambiguateKenhToken(kenhCandidate);
    if (kenhUncertain || kenhConfidence < 65) {
      uncertainFields.add('kenh');
    }

    // Sort remaining numeric tokens by X position
    numericWords.sort((a, b) => a.x - b.x);

    // Map numeric words to Thuc Hien, Target, % Thuc Hien, % Du Kien, Hang Cty
    let rawThucHien = '';
    let rawTarget = '';
    let rawPctTh = '';
    let rawPctDk = '';
    let rawHang = '';

    for (const nw of numericWords) {
      const x = nw.x;
      const cleanNum = disambiguateOcrNumberString(nw.text);
      if (cleanNum.isUncertain || nw.word.confidence < 60) {
        // Will track uncertain per field
      }

      if (x >= cols.thucHienColMinX && x < cols.thucHienColMaxX) {
        if (!rawThucHien) {
          rawThucHien = cleanNum.cleanedText;
          if (cleanNum.isUncertain || nw.word.confidence < 65) uncertainFields.add('thuc_hien');
        }
      } else if (x >= cols.targetColMinX && x < cols.targetColMaxX) {
        if (!rawTarget) {
          rawTarget = cleanNum.cleanedText;
          if (cleanNum.isUncertain || nw.word.confidence < 65) uncertainFields.add('target');
        }
      } else if (x >= (cols.pctThColMinX || cols.targetColMaxX) && x < cols.pctDkColMinX) {
        if (!rawPctTh) {
          rawPctTh = cleanNum.cleanedText;
          if (cleanNum.isUncertain || nw.word.confidence < 65) uncertainFields.add('ty_le_thuc_hien');
        }
      } else if (x >= cols.pctDkColMinX && x < cols.rankColMinX) {
        if (!rawPctDk) {
          rawPctDk = cleanNum.cleanedText;
          if (cleanNum.isUncertain || nw.word.confidence < 65) uncertainFields.add('ty_le_du_kien');
        }
      } else if (x >= cols.rankColMinX) {
        if (!rawHang) {
          rawHang = cleanNum.cleanedText;
          if (cleanNum.isUncertain || nw.word.confidence < 65) uncertainFields.add('hang_cty');
        }
      }
    }

    // Parse strictly using shared parser
    const parsedTh = parseStrictBiNumber(rawThucHien);
    const parsedTarget = parseStrictBiNumber(rawTarget);
    const parsedPctTh = parseStrictBiNumber(rawPctTh, { isPercentage: true });
    const parsedPctDk = parseStrictBiNumber(rawPctDk, { isPercentage: true });
    const parsedHang = parseStrictBiNumber(rawHang, { isIntegerRank: true });

    const validatedRow = validateThiDuaRow(
      {
        id: createRowId(extractedRows.length, pageIndex),
        ten_chuong_trinh: programName,
        kenh,
        thuc_hien: parsedTh.value,
        target: parsedTarget.value,
        ty_le_thuc_hien: parsedPctTh.value,
        ty_le_du_kien: parsedPctDk.value,
        hang_cty: parsedHang.value,
        uncertain_fields: Array.from(uncertainFields),
        sourcePageIndex: pageIndex,
      },
      extractedRows.length,
      pageIndex,
      {
        invalidThucHien: parsedTh.invalidToken,
        invalidTarget: parsedTarget.invalidToken,
        invalidTyLeThucHien: parsedPctTh.invalidToken,
        invalidTyLeDuKien: parsedPctDk.invalidToken,
        invalidHangCty: parsedHang.invalidToken,
      }
    );

    extractedRows.push(validatedRow);
  }

  const quality: 'GOOD' | 'BLURRY' | 'PARTIAL' =
    extractedRows.length >= 10 ? 'GOOD' : extractedRows.length >= 3 ? 'PARTIAL' : 'BLURRY';

  const warnings: string[] = [];
  if (extractedRows.length === 0) {
    warnings.push('Chưa nhận diện được dòng chương trình nào. Ảnh có thể quá mờ hoặc bị che khuất.');
  }

  return {
    report_type: 'THI_DUA_LUY_KE',
    month: extractedMonth,
    year: extractedYear,
    store_name: extractedStore,
    expected_total_rows: null,
    image_quality: quality,
    quality_warnings: warnings,
    rows: extractedRows,
  };
}

// ==========================================
// 4. MULTI-IMAGE AUTO OCR PIPELINE
// ==========================================

export interface AutoOcrImageItem {
  id: string;
  name: string;
  previewUrl: string;
  file?: File;
  width?: number;
  height?: number;
}

export interface AutoOcrResult {
  report: ThiDuaAiReportResult;
  totalPages: number;
  totalRecognizedRows: number;
  validRowsCount: number;
  uncertainRowsCount: number;
  errorRowsCount: number;
  confidenceScore: number; // 0 - 100
  needsAiFallback: boolean;
}

/**
 * Runs the end-to-end Auto-OCR pipeline on multiple images:
 * - Preprocesses each image canvas.
 * - Executes Tesseract WebAssembly worker.
 * - Extracts BI structured table rows.
 * - Merges and deduplicates multi-page data.
 */
export async function runAutoOcrOnImages(
  images: AutoOcrImageItem[],
  metadataHints: {
    monthHint?: number | null;
    yearHint?: number | null;
    storeNameHint?: string | null;
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
    onProgress?.(
      Math.round((i / images.length) * 80) + 10,
      `Đang tiền xử lý & quét OCR trang ${i + 1}/${images.length} (${item.name})...`
    );

    // 1. Load image into HTMLImageElement
    const imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Không thể nạp ảnh ${item.name}`));
      img.src = item.previewUrl;
    });

    // 2. Canvas enhancement (sharpening, contrast, upscaling)
    const processedCanvas = preprocessImageForOcr(imgEl);

    // 3. Run OCR worker
    const ocrResult = await worker.recognize(processedCanvas);

    // 4. Reconstruct table
    const pageReport = reconstructTableFromOcrPage(ocrResult.data, i + 1, metadataHints);
    pageReports.push(pageReport);
  }

  onProgress?.(95, 'Đang tổng hợp & chuẩn hoá bảng số liệu đa trang...');

  // 5. Merge multiple pages and deduplicate rows
  const { merged } = mergeMultiPageReports(pageReports);

  // Compute confidence summary
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

  // Defer to AI only if OCR detected 0 rows or error rate exceeds 60%
  const needsAiFallback = total === 0 || (total > 0 && errorCount / total > 0.6);

  onProgress?.(100, `Hoàn thành tự động đọc ${total} chương trình!`);

  return {
    report: merged,
    totalPages: images.length,
    totalRecognizedRows: total,
    validRowsCount: validCount,
    uncertainRowsCount: uncertainCount,
    errorRowsCount: errorCount,
    confidenceScore,
    needsAiFallback,
  };
}
