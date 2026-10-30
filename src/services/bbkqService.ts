import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { isSuperAdmin43751, firestoreStats } from '../firebaseAdapter';
import { UserProfile } from '../types';

export const BBKQ_COLLECTION = 'bbkq_store_data';

export interface BbkqHistoryItem {
  id: string;
  recordKey: string; // Unique business key: storeCode__storeName__dateKey__staffId__slotKey
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  version: number; // Optimistic concurrency version (>= 1)
  timeStr: string; // "20:08"
  dateStr: string; // "30/10/2026"
  storeName: string;
  storeCode: string;
  staffId: string; // Stable employee code / username (not just display name)
  staffName?: string;
  counts: Record<number, number>;
  totalActual: number;
  totalBills: number;
  erpTotal: number;
  discrepancy: number;
}

export interface BbkqWarehouseDocument {
  storeCode: string;
  storeName?: string;
  version: number;
  updatedAt: string;
  updatedBy: string;
  recordsByKey: Record<string, BbkqHistoryItem>;
}

export class BbkqConflictError extends Error {
  public readonly code = 'BBKQ_CONFLICT';
  public readonly serverRecord: BbkqHistoryItem;
  public readonly localRecord: BbkqHistoryItem;

  constructor(message: string, serverRecord: BbkqHistoryItem, localRecord: BbkqHistoryItem) {
    super(message);
    this.name = 'BbkqConflictError';
    this.serverRecord = serverRecord;
    this.localRecord = localRecord;
  }
}

export class BbkqPermissionError extends Error {
  public readonly code = 'BBKQ_PERMISSION_DENIED';
  constructor(message: string) {
    super(message);
    this.name = 'BbkqPermissionError';
  }
}

export function normalizeKhoCode(raw: string | number | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toUpperCase();
}

export function normalizeKeySegment(raw: string | undefined | null): string {
  const cleaned = String(raw ?? '')
    .trim()
    .normalize('NFC')
    .replace(/\s+/g, '_')
    .replace(/[/.#$[\]]/g, '-')
    .toUpperCase();
  return cleaned || 'DEFAULT';
}

export function getBbkqDocId(storeCode: string): string {
  const norm = normalizeKhoCode(storeCode);
  if (!norm) throw new Error('Mã kho không hợp lệ');
  return `KHO_${norm}`;
}

/**
 * Reads the requested warehouse code (`kho`) from URL query parameters.
 */
export function getUrlKhoParam(search?: string): string {
  if (typeof window === 'undefined' && !search) return '';
  try {
    const rawSearch =
      search !== undefined
        ? search
        : window.location.search || window.location.hash || '';
    const queryPart = rawSearch.includes('?')
      ? rawSearch.substring(rawSearch.indexOf('?'))
      : rawSearch.startsWith('#')
        ? rawSearch.substring(1)
        : rawSearch;
    const params = new URLSearchParams(queryPart);
    const val =
      params.get('kho') ||
      params.get('k') ||
      params.get('makho') ||
      params.get('store') ||
      '';
    return normalizeKhoCode(val);
  } catch {
    return '';
  }
}

/**
 * Verifies warehouse isolation and access permissions for the current user and URL `?kho=` parameter.
 * - SuperAdmin (43751 / ADMIN) can access any warehouse specified in `?kho=` or their profile warehouse.
 * - Logged-in regular users can ONLY access their assigned warehouse (`userProfile.ma_kho`).
 *   If `?kho=` on the URL specifies a different warehouse, access is strictly denied.
 * - Guest share sessions are strictly isolated to the single `kho` in the URL.
 */
export function resolveAndVerifyWarehouseAccess(
  userProfile: UserProfile | null | undefined,
  urlSearch?: string
): {
  authorized: boolean;
  effectiveKho: string;
  requestedUrlKho: string;
  userKho: string;
  staffId: string;
  reason?: string;
} {
  const requestedUrlKho = getUrlKhoParam(urlSearch);
  const userKho = normalizeKhoCode(userProfile?.ma_kho || userProfile?.storeCode || '');
  const rawUsername = String(
    userProfile?.username || userProfile?.ma_nhan_vien || userProfile?.user_id || ''
  ).trim();
  const isSuperAdmin =
    isSuperAdmin43751(rawUsername) ||
    rawUsername.toUpperCase() === 'ADMIN' ||
    userProfile?.role === 'admin';
  const isGuest = Boolean(userProfile?.role === 'guest' || userProfile?.isGuest);

  // 1. Logged-in non-guest user
  if (userProfile && !isGuest) {
    if (isSuperAdmin) {
      const targetKho = requestedUrlKho || userKho || '1841';
      return {
        authorized: true,
        effectiveKho: targetKho,
        requestedUrlKho,
        userKho,
        staffId: rawUsername || '43751',
      };
    }

    if (!userKho) {
      return {
        authorized: false,
        effectiveKho: '',
        requestedUrlKho,
        userKho: '',
        staffId: rawUsername || 'UNKNOWN',
        reason: 'Tài khoản chưa được gán mã kho hợp lệ.',
      };
    }

    // Strict check: user must have 'bbkq' in allowed_pages
    const allowedPages = Array.isArray(userProfile.userPermissions?.allowedPages)
      ? userProfile.userPermissions.allowedPages
      : [];
    if (!allowedPages.includes('bbkq')) {
      return {
        authorized: false,
        effectiveKho: userKho,
        requestedUrlKho,
        userKho,
        staffId: rawUsername || `NV_${userKho}`,
        reason: `Tài khoản "${rawUsername}" chưa được cấp quyền truy cập trang BBKQ (Kiểm Quỹ).`,
      };
    }

    // Strict check: if URL specifies ?kho=... that does not match the user's assigned warehouse, block access!
    if (requestedUrlKho && requestedUrlKho !== userKho) {
      return {
        authorized: false,
        effectiveKho: userKho,
        requestedUrlKho,
        userKho,
        staffId: rawUsername || `NV_${userKho}`,
        reason: `Tài khoản thuộc kho ${userKho} không có quyền truy cập hoặc chỉnh sửa dữ liệu BBKQ của kho ${requestedUrlKho}.`,
      };
    }

    return {
      authorized: true,
      effectiveKho: userKho,
      requestedUrlKho,
      userKho,
      staffId: rawUsername || `NV_${userKho}`,
    };
  }

  // 2. Guest / Direct share link access
  const guestKho = requestedUrlKho || userKho;
  if (!guestKho) {
    return {
      authorized: false,
      effectiveKho: '',
      requestedUrlKho,
      userKho,
      staffId: 'GUEST',
      reason: 'Vui lòng đăng nhập hoặc cung cấp mã kho hợp lệ trên đường dẫn (?kho=...).',
    };
  }

  // Ensure guest profile matches requested URL warehouse
  if (requestedUrlKho && userKho && requestedUrlKho !== userKho) {
    return {
      authorized: false,
      effectiveKho: '',
      requestedUrlKho,
      userKho,
      staffId: 'GUEST',
      reason: `Phiên truy cập kho ${userKho} không khớp với mã kho ${requestedUrlKho} trên đường dẫn.`,
    };
  }

  return {
    authorized: true,
    effectiveKho: guestKho,
    requestedUrlKho,
    userKho: guestKho,
    staffId: rawUsername && !rawUsername.startsWith('Khách') ? rawUsername : `GUEST_${guestKho}`,
  };
}

/**
 * Generates a deterministic unique business key for a BBKQ record.
 * Combines warehouse code, normalized store name, date (DD/MM/YYYY -> YYYYMMDD), stable staff ID, and session slot.
 */
export function buildBbkqRecordKey(params: {
  storeCode: string;
  storeName: string;
  dateStr: string;
  staffId: string;
  slotId?: string;
}): string {
  const kho = normalizeKhoCode(params.storeCode);
  const store = normalizeKeySegment(params.storeName || kho);
  const dateClean = String(params.dateStr || '')
    .trim()
    .replace(/\//g, '');
  const staff = normalizeKeySegment(params.staffId || 'STAFF');
  const slot = normalizeKeySegment(params.slotId || 'MAIN');
  return `${kho}__${store}__${dateClean}__${staff}__${slot}`;
}

/**
 * Computes a deterministic content signature to detect duplicate payloads.
 */
export function computeCountsSignature(
  counts: Record<number, number>,
  erpTotal: number
): string {
  const denoms = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000, 500];
  const parts = denoms.map(d => `${d}:${Number(counts?.[d] || 0)}`);
  return `${parts.join('|')}||ERP:${Math.round(Number(erpTotal || 0))}`;
}

/**
 * Converts a Firestore `recordsByKey` map into a sorted array (newest first).
 */
export function sortBbkqRecordsList(
  recordsByKey: Record<string, BbkqHistoryItem> | undefined | null
): BbkqHistoryItem[] {
  if (!recordsByKey || typeof recordsByKey !== 'object') return [];
  const list = Object.values(recordsByKey).filter(
    (item): item is BbkqHistoryItem =>
      Boolean(item && typeof item === 'object' && item.id && item.storeCode)
  );
  list.sort((a, b) => {
    const tA = Date.parse(a.updatedAt || a.createdAt || '') || 0;
    const tB = Date.parse(b.updatedAt || b.createdAt || '') || 0;
    return tB - tA;
  });
  return list;
}

/**
 * Subscribes to real-time updates for a specific warehouse's BBKQ document.
 * Guarantees a single active listener per subscription call.
 */
export function subscribeBbkqWarehouseDoc(
  storeCode: string,
  onData: (records: BbkqHistoryItem[], docVersion: number, rawDoc: BbkqWarehouseDocument | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const normKho = normalizeKhoCode(storeCode);
  if (!normKho) {
    onData([], 0, null);
    return () => {};
  }

  const docRef = doc(db, BBKQ_COLLECTION, getBbkqDocId(normKho));
  firestoreStats.activeListeners++;

  const unsub = onSnapshot(
    docRef,
    snapshot => {
      firestoreStats.reads++;
      if (!snapshot.exists()) {
        onData([], 0, null);
        return;
      }
      const data = snapshot.data() as BbkqWarehouseDocument;
      // Strict warehouse filter: only return records belonging to normKho
      const rawMap = data?.recordsByKey || {};
      const filteredMap: Record<string, BbkqHistoryItem> = {};
      for (const [k, rec] of Object.entries(rawMap)) {
        if (rec && normalizeKhoCode(rec.storeCode) === normKho) {
          filteredMap[k] = {
            ...rec,
            recordKey: rec.recordKey || k,
            version: Number(rec.version || 1),
            updatedAt: rec.updatedAt || rec.createdAt,
            staffId: rec.staffId || 'STAFF',
          };
        }
      }
      const sorted = sortBbkqRecordsList(filteredMap);
      onData(sorted, Number(data?.version || 1), data);
    },
    err => {
      console.error(`[bbkqService] Error listening to ${normKho}:`, err);
      if (onError) onError(err);
    }
  );

  return () => {
    firestoreStats.activeListeners = Math.max(0, firestoreStats.activeListeners - 1);
    unsub();
  };
}

/**
 * Atomically saves or updates a single BBKQ record inside `bbkq_store_data/KHO_{storeCode}`
 * using a Firestore transaction (`runTransaction`).
 *
 * Guarantees:
 * 1. Warehouse isolation: verifies `storeCode` matches the target document's warehouse.
 * 2. Differential record-level merge: never overwrites records created/edited by other users.
 * 3. Unique business key & deduplication: updates existing record in-place when `recordKey` matches
 *    or when an identical record by the same staff/store/date already exists.
 * 4. Optimistic concurrency control (`expectedVersion`): if two users edit the same `recordKey`
 *    and the server version has advanced, throws `BbkqConflictError` instead of silently overwriting.
 */
export async function saveBbkqRecordTransaction(params: {
  storeCode: string;
  storeName: string;
  staffId: string;
  dateStr: string;
  timeStr: string;
  counts: Record<number, number>;
  totalActual: number;
  totalBills: number;
  erpTotal: number;
  discrepancy: number;
  existingRecordKey?: string | null;
  expectedVersion?: number | null;
  forceOverwrite?: boolean;
}): Promise<{
  savedRecord: BbkqHistoryItem;
  allRecords: BbkqHistoryItem[];
  wasUpdated: boolean;
  wasDeduplicated: boolean;
}> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('NETWORK_OFFLINE: Thiết bị đang mất kết nối mạng. Vui lòng kiểm tra Internet và thử lại.');
  }

  const normKho = normalizeKhoCode(params.storeCode);
  if (!normKho) {
    throw new BbkqPermissionError('Mã kho không hợp lệ, không thể lưu dữ liệu.');
  }

  const docRef = doc(db, BBKQ_COLLECTION, getBbkqDocId(normKho));
  const nowIso = new Date().toISOString();
  const incomingSig = computeCountsSignature(params.counts, params.erpTotal);

  const txPromise = runTransaction(db, async transaction => {
    const snap = await transaction.get(docRef);
    firestoreStats.reads++;

    const currentDoc: BbkqWarehouseDocument = snap.exists()
      ? (snap.data() as BbkqWarehouseDocument)
      : {
          storeCode: normKho,
          storeName: params.storeName,
          version: 0,
          updatedAt: nowIso,
          updatedBy: params.staffId,
          recordsByKey: {},
        };

    if (currentDoc.storeCode && normalizeKhoCode(currentDoc.storeCode) !== normKho) {
      throw new BbkqPermissionError(
        `Xung đột mã kho dữ liệu (${currentDoc.storeCode} !== ${normKho}).`
      );
    }

    const recordsByKey: Record<string, BbkqHistoryItem> = {
      ...(currentDoc.recordsByKey || {}),
    };

    let targetKey = params.existingRecordKey ? String(params.existingRecordKey).trim() : '';
    if (targetKey && !targetKey.startsWith(`${normKho}__`)) {
      throw new BbkqPermissionError(
        `Truy cập bị từ chối: Khóa bản ghi (${targetKey}) không thuộc kho ${normKho}.`
      );
    }
    let wasDeduplicated = false;

    // If no explicit existingRecordKey was passed, check if an identical record for the same
    // (storeCode, storeName, dateStr, staffId) already exists to prevent duplicate insertions on retry/double-save
    if (!targetKey) {
      const sameDayStaffCandidate = Object.values(recordsByKey).find(
        r =>
          r &&
          normalizeKhoCode(r.storeCode) === normKho &&
          normalizeKeySegment(r.storeName) === normalizeKeySegment(params.storeName) &&
          r.dateStr === params.dateStr &&
          normalizeKeySegment(r.staffId) === normalizeKeySegment(params.staffId) &&
          computeCountsSignature(r.counts, r.erpTotal) === incomingSig
      );

      if (sameDayStaffCandidate) {
        targetKey = sameDayStaffCandidate.recordKey || sameDayStaffCandidate.id;
        wasDeduplicated = true;
      } else {
        // Generate deterministic business key for this staff member's session slot
        const existingCountForStaffToday = Object.values(recordsByKey).filter(
          r =>
            r &&
            normalizeKhoCode(r.storeCode) === normKho &&
            r.dateStr === params.dateStr &&
            normalizeKeySegment(r.staffId) === normalizeKeySegment(params.staffId)
        ).length;
        const slotId = `CA_${existingCountForStaffToday + 1}_${params.timeStr.replace(':', '')}`;
        targetKey = buildBbkqRecordKey({
          storeCode: normKho,
          storeName: params.storeName,
          dateStr: params.dateStr,
          staffId: params.staffId,
          slotId,
        });
      }
    }

    const existingServerRecord = recordsByKey[targetKey];

    // Optimistic Concurrency Check when updating an existing record
    if (existingServerRecord && !wasDeduplicated) {
      const serverVersion = Number(existingServerRecord.version || 1);
      const serverSig = computeCountsSignature(
        existingServerRecord.counts,
        existingServerRecord.erpTotal
      );

      // If server version moved ahead of client's expectedVersion and content differs -> Conflict!
      if (
        !params.forceOverwrite &&
        params.expectedVersion !== undefined &&
        params.expectedVersion !== null &&
        serverVersion !== params.expectedVersion &&
        serverSig !== incomingSig
      ) {
        const attemptedRecord: BbkqHistoryItem = {
          ...existingServerRecord,
          counts: { ...params.counts },
          totalActual: params.totalActual,
          totalBills: params.totalBills,
          erpTotal: params.erpTotal,
          discrepancy: params.discrepancy,
          updatedAt: nowIso,
          staffId: params.staffId,
        };
        throw new BbkqConflictError(
          `Bản ghi lúc ${existingServerRecord.timeStr} (${existingServerRecord.dateStr}) vừa được cập nhật bởi ${existingServerRecord.staffId || 'người dùng khác'} (phiên bản v${serverVersion}). Không thể ghi đè tự động.`,
          existingServerRecord,
          attemptedRecord
        );
      }
    }

    const nextRecordVersion = existingServerRecord
      ? Number(existingServerRecord.version || 1) + (wasDeduplicated ? 0 : 1)
      : 1;

    const savedRecord: BbkqHistoryItem = {
      id: targetKey,
      recordKey: targetKey,
      createdAt: existingServerRecord?.createdAt || nowIso,
      updatedAt: nowIso,
      version: nextRecordVersion,
      timeStr: existingServerRecord ? existingServerRecord.timeStr : params.timeStr,
      dateStr: existingServerRecord ? existingServerRecord.dateStr : params.dateStr,
      storeName: params.storeName,
      storeCode: normKho,
      staffId: params.staffId,
      counts: { ...params.counts },
      totalActual: params.totalActual,
      totalBills: params.totalBills,
      erpTotal: params.erpTotal,
      discrepancy: params.discrepancy,
    };

    recordsByKey[targetKey] = savedRecord;

    // Keep most recent 50 records per warehouse so document stays compact
    const sortedAll = sortBbkqRecordsList(recordsByKey).slice(0, 50);
    const trimmedMap: Record<string, BbkqHistoryItem> = {};
    for (const item of sortedAll) {
      trimmedMap[item.recordKey || item.id] = item;
    }

    const nextDocVersion = Number(currentDoc.version || 0) + 1;

    transaction.set(docRef, {
      ...currentDoc,
      storeCode: normKho,
      storeName: params.storeName || currentDoc.storeName || normKho,
      version: nextDocVersion,
      updatedAt: nowIso,
      updatedBy: params.staffId,
      recordsByKey: trimmedMap,
    });
    firestoreStats.writes++;

    return {
      savedRecord,
      allRecords: sortedAll,
      wasUpdated: Boolean(existingServerRecord),
      wasDeduplicated,
    };
  });

  // Guard against indefinite network hangs when connection drops mid-request
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new Error(
          'NETWORK_TIMEOUT: Kết nối máy chủ quá thời gian phản hồi. Vui lòng kiểm tra mạng và thử lưu lại.'
        )
      );
    }, 12000);
  });

  return Promise.race([txPromise, timeoutPromise]);
}

/**
 * Atomically deletes a single BBKQ record by its `recordKey` without affecting other records.
 */
export async function deleteBbkqRecordTransaction(params: {
  storeCode: string;
  recordKey: string;
  staffId: string;
}): Promise<BbkqHistoryItem[]> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('NETWORK_OFFLINE: Thiết bị đang mất kết nối mạng. Không thể xóa bản ghi.');
  }

  const normKho = normalizeKhoCode(params.storeCode);
  if (!normKho) throw new BbkqPermissionError('Mã kho không hợp lệ.');

  const docRef = doc(db, BBKQ_COLLECTION, getBbkqDocId(normKho));
  const nowIso = new Date().toISOString();

  return runTransaction(db, async transaction => {
    const snap = await transaction.get(docRef);
    firestoreStats.reads++;
    if (!snap.exists()) return [];

    const currentDoc = snap.data() as BbkqWarehouseDocument;
    const recordsByKey: Record<string, BbkqHistoryItem> = {
      ...(currentDoc.recordsByKey || {}),
    };

    delete recordsByKey[params.recordKey];
    // Also remove if keyed by id
    for (const k of Object.keys(recordsByKey)) {
      if (recordsByKey[k]?.id === params.recordKey) {
        delete recordsByKey[k];
      }
    }

    const sortedAll = sortBbkqRecordsList(recordsByKey);
    transaction.set(docRef, {
      ...currentDoc,
      storeCode: normKho,
      version: Number(currentDoc.version || 0) + 1,
      updatedAt: nowIso,
      updatedBy: params.staffId,
      recordsByKey,
    });
    firestoreStats.writes++;
    return sortedAll;
  });
}

/**
 * Fetches current warehouse BBKQ document once (used for manual conflict reload or verification).
 */
export async function fetchBbkqWarehouseRecords(
  storeCode: string
): Promise<BbkqHistoryItem[]> {
  const normKho = normalizeKhoCode(storeCode);
  if (!normKho) return [];
  const docRef = doc(db, BBKQ_COLLECTION, getBbkqDocId(normKho));
  const snap = await getDoc(docRef);
  firestoreStats.reads++;
  if (!snap.exists()) return [];
  const data = snap.data() as BbkqWarehouseDocument;
  return sortBbkqRecordsList(data?.recordsByKey);
}
