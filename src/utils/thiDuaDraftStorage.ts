import { supabase } from '../supabaseClient';
import { normalizeStoreId, isValidStoreName } from '../pages/RTST/utils';
import type { ThiDuaAiRow, ThiDuaAiReportResult } from './thiDuaAiParser';

export interface ThiDuaDraftRecord {
  draftId: string;
  storeId: string;
  storeLabel: string;
  month: number | null;
  year: number | null;
  expected_total_rows: number | null;
  rows: ThiDuaAiRow[];
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  warningRowsCount: number;
  savedAt: string;
  savedBy: string;
  modelUsed?: string;
  pageCount?: number;
  duplicatesMerged?: number;
  duplicatePrograms?: string[];
  adminConfirmedWarnings?: boolean;
  isCommitted?: boolean;
}

const DRAFT_PREFIX = 'crm_thidua_draft_';
const LATEST_KEY_PTR = 'crm_thidua_draft_latest_key';
const LATEST_BACKUP = 'crm_thidua_draft_latest';

export function getDraftStorageKey(
  storeId?: string,
  month?: number | null,
  year?: number | null
): string {
  const cleanStore = storeId ? normalizeStoreId(storeId) : 'DEFAULT';
  const m = month ? String(month).padStart(2, '0') : 'curr';
  const y = year ? String(year) : 'curr';
  return `${DRAFT_PREFIX}${cleanStore}_${m}_${y}`;
}

/**
 * Saves or updates a Thi Dua OCR draft to Multi-Tier Storage:
 * 1. LocalStorage (0ms instant write, resilient to network cut / tab crash / F5)
 * 2. Firestore Document wrapper (async background sync to store doc)
 */
export async function saveThiDuaDraft(
  partialDraft: Partial<ThiDuaDraftRecord> & {
    rows: ThiDuaAiRow[];
    storeLabel: string;
  }
): Promise<ThiDuaDraftRecord> {
  const now = new Date();
  const rows = partialDraft.rows || [];
  const validRowsCount = rows.filter((r) => !r.errors || r.errors.length === 0).length;
  const errorRowsCount = rows.filter((r) => r.errors && r.errors.length > 0).length;
  const warningRowsCount = rows.filter((r) => r.warnings && r.warnings.length > 0).length;

  const targetStore = partialDraft.storeLabel || 'ĐML - SIÊU THỊ';
  const targetStoreId = partialDraft.storeId || normalizeStoreId(targetStore);

  const draftRecord: ThiDuaDraftRecord = {
    draftId: partialDraft.draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    storeId: targetStoreId,
    storeLabel: targetStore,
    month: partialDraft.month ?? null,
    year: partialDraft.year ?? null,
    expected_total_rows: partialDraft.expected_total_rows ?? null,
    rows: rows.map((r) => ({ ...r })),
    totalRows: rows.length,
    validRowsCount,
    errorRowsCount,
    warningRowsCount,
    savedAt: now.toISOString(),
    savedBy: partialDraft.savedBy || 'ADMIN',
    modelUsed: partialDraft.modelUsed || 'Hybrid OCR WebAssembly',
    pageCount: partialDraft.pageCount || 1,
    duplicatesMerged: partialDraft.duplicatesMerged || 0,
    duplicatePrograms: partialDraft.duplicatePrograms || [],
    adminConfirmedWarnings: Boolean(partialDraft.adminConfirmedWarnings),
    isCommitted: Boolean(partialDraft.isCommitted),
  };

  const key = getDraftStorageKey(targetStoreId, draftRecord.month, draftRecord.year);

  // 1. LocalStorage Persistence (Instant & Resilient)
  try {
    const serialized = JSON.stringify(draftRecord);
    localStorage.setItem(key, serialized);
    localStorage.setItem(LATEST_KEY_PTR, key);
    localStorage.setItem(LATEST_BACKUP, serialized);
  } catch (err) {
    console.warn('[ThiDuaDraftStorage] LocalStorage quota warning:', err);
  }

  // 2. Database Sync (Async Non-Blocking Firestore wrapper)
  if (targetStore && targetStore !== 'ALL' && isValidStoreName(targetStore)) {
    const storeDocId = normalizeStoreId(targetStore);
    if (storeDocId && storeDocId !== 'ALL') {
      supabase
        .from('store')
        .upsert({
          id: storeDocId,
          ten_sieu_thi: targetStore,
          lk_ocr_draft: draftRecord,
        })
        .then(() => {})
        .catch((dbErr: any) => {
          console.warn('[ThiDuaDraftStorage] Cloud sync non-critical warning:', dbErr);
        });
    }
  }

  return draftRecord;
}

/**
 * Loads the active uncommitted draft for the specified store + period.
 * Checks LocalStorage first (0ms), falls back to latest backup or Firestore.
 */
export async function loadThiDuaDraft(
  storeId?: string,
  month?: number | null,
  year?: number | null
): Promise<ThiDuaDraftRecord | null> {
  const key = getDraftStorageKey(storeId, month, year);

  // 1. Try exact scoped key in LocalStorage
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as ThiDuaDraftRecord;
      if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0 && !parsed.isCommitted) {
        return parsed;
      }
    }
  } catch {}

  // 2. Try latest backup key if matching store or recent (< 48h)
  try {
    const latestRaw = localStorage.getItem(LATEST_BACKUP);
    if (latestRaw) {
      const parsed = JSON.parse(latestRaw) as ThiDuaDraftRecord;
      if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0 && !parsed.isCommitted) {
        const targetClean = storeId ? normalizeStoreId(storeId) : '';
        if (!targetClean || targetClean === 'ALL' || parsed.storeId === targetClean) {
          return parsed;
        }
      }
    }
  } catch {}

  // 3. Fallback: check Firestore database if store is valid
  if (storeId && storeId !== 'ALL' && isValidStoreName(storeId)) {
    try {
      const storeDocId = normalizeStoreId(storeId);
      const { data, error } = await supabase
        .from('store')
        .select('lk_ocr_draft')
        .eq('id', storeDocId)
        .maybeSingle();

      if (!error && data?.lk_ocr_draft) {
        const draft = data.lk_ocr_draft as ThiDuaDraftRecord;
        if (draft && Array.isArray(draft.rows) && draft.rows.length > 0 && !draft.isCommitted) {
          return draft;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Synchronous check if an uncommitted draft exists in LocalStorage.
 */
export function hasActiveDraft(
  storeId?: string,
  month?: number | null,
  year?: number | null
): boolean {
  try {
    const key = getDraftStorageKey(storeId, month, year);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0 && !parsed.isCommitted) {
        return true;
      }
    }

    const latest = localStorage.getItem(LATEST_BACKUP);
    if (latest) {
      const parsed = JSON.parse(latest);
      if (parsed && Array.isArray(parsed.rows) && parsed.rows.length > 0 && !parsed.isCommitted) {
        const targetClean = storeId ? normalizeStoreId(storeId) : '';
        if (!targetClean || targetClean === 'ALL' || parsed.storeId === targetClean) {
          return true;
        }
      }
    }
  } catch {}
  return false;
}

/**
 * Clears or commits the active draft for a store + period.
 */
export async function clearThiDuaDraft(
  storeId?: string,
  month?: number | null,
  year?: number | null
): Promise<void> {
  const key = getDraftStorageKey(storeId, month, year);
  try {
    localStorage.removeItem(key);
    const latestPtr = localStorage.getItem(LATEST_KEY_PTR);
    if (latestPtr === key) {
      localStorage.removeItem(LATEST_KEY_PTR);
      localStorage.removeItem(LATEST_BACKUP);
    }
  } catch {}

  // Cloud database clean up
  if (storeId && storeId !== 'ALL' && isValidStoreName(storeId)) {
    try {
      const storeDocId = normalizeStoreId(storeId);
      await supabase
        .from('store')
        .upsert({
          id: storeDocId,
          lk_ocr_draft: null,
        });
    } catch {}
  }
}

/**
 * Converts a stored draft into a valid ThiDuaAiReportResult object for the review modal.
 */
export function convertDraftToAiReport(draft: ThiDuaDraftRecord): ThiDuaAiReportResult {
  return {
    report_type: 'THI_DUA_LUY_KE',
    month: draft.month,
    year: draft.year,
    store_name: draft.storeLabel,
    expected_total_rows: draft.expected_total_rows,
    image_quality: 'GOOD',
    quality_warnings: [],
    rows: draft.rows.map((r) => ({ ...r })),
  };
}

