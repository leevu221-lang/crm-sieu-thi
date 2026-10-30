import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  writeBatch,
  serverTimestamp,
  documentId,
  DocumentReference,
  SetOptions
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { APP_PAGES_REGISTRY, TABLE_REQUIRED_PAGES_MAP, isGuestShareLink } from "./constants/routes";

/**
 * Safely format doc ID for Firestore path. Replaces forward slashes '/' with '-'
 * so that Firestore does not interpret slashes as collection/subcollection path separators.
 */
const safeDocId = (id: any): string => {
  return String(id ?? '').trim().replace(/\//g, '-');
};

// ============================================================================
// SUPER ADMIN 43751 PROTECTION INVARIANTS & DATA-LAYER RLS GUARD
// ============================================================================
export const SUPER_ADMIN_USERNAME = '43751';
export const SUPER_ADMIN_ALL_PAGES = [
  'users',
  ...APP_PAGES_REGISTRY.map((p) => p.id),
];

export function isSuperAdmin43751(val: any): boolean {
  return String(val ?? '').trim() === SUPER_ADMIN_USERNAME;
}

// In-memory tamper-resistant cache of verified `allowed_pages` loaded from `user_permissions` DB
const verifiedUserPermissionsMap = new Map<string, string[]>();

export function syncVerifiedSessionPermissions(username: string, allowedPages: string[]) {
  const clean = String(username ?? '').trim();
  if (!clean) return;
  verifiedUserPermissionsMap.set(
    clean,
    isSuperAdmin43751(clean) ? SUPER_ADMIN_ALL_PAGES : (Array.isArray(allowedPages) ? allowedPages : [])
  );
}

/**
 * Resolves the current active user session & their verified `allowed_pages`.
 * Prefers the in-memory `verifiedUserPermissionsMap` populated directly from the database
 * over raw `localStorage` so DevTools tampering with `localStorage.userProfile` cannot bypass RLS.
 */
export function getActiveSessionPermissionContext(): {
  isAuthenticated: boolean;
  isGuest: boolean;
  isSuperAdmin: boolean;
  username: string;
  allowedPages: string[];
} {
  if (typeof window === 'undefined') {
    return { isAuthenticated: false, isGuest: false, isSuperAdmin: true, username: '', allowedPages: SUPER_ADMIN_ALL_PAGES };
  }
  try {
    const isShare = isGuestShareLink(window.location.search);
    const raw = localStorage.getItem('userProfile');
    if (!raw) {
      return {
        isAuthenticated: false,
        isGuest: isShare,
        isSuperAdmin: false,
        username: '',
        allowedPages: [],
      };
    }
    const parsed = JSON.parse(raw);
    const username = String(parsed?.username || '').trim();
    const isGuest = Boolean(parsed?.role === 'guest' || parsed?.isGuest || isShare);
    const isSuperAdmin =
      isSuperAdmin43751(username) ||
      username.toUpperCase() === 'ADMIN' ||
      Boolean(parsed?.userPermissions?.canEditUser);

    if (isSuperAdmin) {
      return {
        isAuthenticated: true,
        isGuest: false,
        isSuperAdmin: true,
        username,
        allowedPages: SUPER_ADMIN_ALL_PAGES,
      };
    }

    // Use DB-verified permissions if already fetched in RAM; fallback to profile's allowedPages
    const verifiedPages = verifiedUserPermissionsMap.has(username)
      ? verifiedUserPermissionsMap.get(username)!
      : (Array.isArray(parsed?.userPermissions?.allowedPages) ? parsed.userPermissions.allowedPages : []);

    return {
      isAuthenticated: Boolean(username && !isGuest),
      isGuest,
      isSuperAdmin: false,
      username,
      allowedPages: verifiedPages,
    };
  } catch {
    return { isAuthenticated: false, isGuest: false, isSuperAdmin: false, username: '', allowedPages: [] };
  }
}

/**
 * Enforces Row-Level Security (RLS) & `allowed_pages` permission checks at the Data Adapter layer.
 * Blocks unauthorized API/Database queries and mutations even if invoked directly outside React UI.
 */
export function enforceTableRlsPolicy(
  tableName: string,
  operation: 'select' | 'insert' | 'upsert' | 'update' | 'delete',
  payload?: any
): void {
  const ctx = getActiveSessionPermissionContext();

  // 1. SuperAdmin (43751 / ADMIN / canEditUser) has full access (subject to SuperAdmin write guard)
  if (ctx.isSuperAdmin) return;

  // 2. Protect `user_permissions` table from privilege escalation by non-admin logged-in users
  if (tableName === 'user_permissions' && operation !== 'select') {
    if (ctx.isAuthenticated) {
      throw new Error(
        '[RLS Policy Violation] Truy cập bị từ chối: Chỉ Quản trị viên mới có quyền thay đổi bảng phân quyền (user_permissions).'
      );
    }
    // Unauthenticated registration flow can only insert initial permissions for a new non-admin user
    if (operation === 'delete' || operation === 'update') {
      throw new Error(
        '[RLS Policy Violation] Truy cập bị từ chối: Không được phép xoá hoặc sửa bảng phân quyền khi chưa đăng nhập Quản trị viên.'
      );
    }
    return;
  }

  // 3. Protect `ql_nguoi_dung` from unauthorized deletion or cross-user tampering
  if (tableName === 'ql_nguoi_dung') {
    if (operation === 'delete') {
      throw new Error(
        '[RLS Policy Violation] Truy cập bị từ chối: Chỉ Quản trị viên mới có quyền xoá tài khoản người dùng.'
      );
    }
    if ((operation === 'update' || operation === 'upsert') && ctx.isAuthenticated && payload) {
      const items = Array.isArray(payload) ? payload : [payload];
      for (const item of items) {
        if (item?.username && String(item.username).trim() !== ctx.username) {
          throw new Error(
            '[RLS Policy Violation] Truy cập bị từ chối: Không được phép chỉnh sửa thông tin tài khoản của người dùng khác.'
          );
        }
      }
    }
    return;
  }

  // 4. For guest share links or unauthenticated login/register bootstrap, allow core bootstrap reads
  if (!ctx.isAuthenticated) {
    return;
  }

  // 5. Special case for account 7611 (dedicated TNB Leader account)
  if (ctx.username === '7611' && (tableName === 'tnb_dm_7611_data' || tableName === 'tnb_data')) {
    return;
  }

  // 6. Check table-to-page permission mapping (`TABLE_REQUIRED_PAGES_MAP`)
  const requiredPages = TABLE_REQUIRED_PAGES_MAP[tableName];
  if (requiredPages && requiredPages.length > 0) {
    const hasPermission = requiredPages.some((pageId) => ctx.allowedPages.includes(pageId));
    if (!hasPermission) {
      throw new Error(
        `[RLS Policy Violation] Tài khoản "${ctx.username}" không có quyền truy cập dữ liệu bảng "${tableName}" (Yêu cầu quyền trang: ${requiredPages.join(' hoặc ')}).`
      );
    }
  }
}

/**
 * Enforces mandatory SuperAdmin invariants on any write/update payload targeting
 * user 43751 in `ql_nguoi_dung` or `user_permissions`.
 * - Never allows 43751 to be locked (`rejected`, `inactive`, `pending`, `expired`)
 * - Never allows policy/subscription syncs to downgrade 43751's active FREE state
 * - Never allows normal data syncs to overwrite 43751's full SuperAdmin permissions
 */
function enforceSuperAdminWriteGuard(
  tableName: string,
  payload: Record<string, any>,
  existingData?: Record<string, any>
): Record<string, any> {
  if (!payload || typeof payload !== 'object') return payload;

  if (tableName === 'ql_nguoi_dung') {
    const targetUsername = payload.username ?? existingData?.username;
    if (isSuperAdmin43751(targetUsername)) {
      const guarded: Record<string, any> = {
        ...payload,
        status: 'active',
        paymentConfirmed: true,
        isDemo: true,
        role: 'admin',
        requestedRenewPackage: null,
        requestedAt: null,
      };
      if ('expiredAt' in payload || !existingData?.expiredAt) {
        guarded.expiredAt = '2099-12-31T23:59:59.000Z';
      }
      if ('packageDays' in payload || !existingData?.packageDays) {
        guarded.packageDays = 9999;
      }
      if (
        'password' in guarded &&
        (!String(guarded.password || '').trim() || String(guarded.password).trim() === '---')
      ) {
        if (existingData?.password && String(existingData.password).trim() !== '---') {
          guarded.password = existingData.password;
        } else {
          delete guarded.password;
        }
      }
      return guarded;
    }
  }

  if (tableName === 'user_permissions') {
    const targetUserId = payload.user_id ?? existingData?.user_id;
    if (isSuperAdmin43751(targetUserId)) {
      return {
        ...payload,
        allowed_pages: SUPER_ADMIN_ALL_PAGES,
      };
    }
  }

  return payload;
}

// ============================================================================
// FIRESTORE QUOTA PROTECTION, TELEMETRY & IN-MEMORY DEDUPLICATION LAYER
// ============================================================================

export interface FirestoreStats {
  reads: number;
  writes: number;
  deletes: number;
  skippedDuplicateWrites: number;
  deduplicatedQueries: number;
  quotaErrors: number;
  activeListeners: number;
  quotaCircuitOpenUntil: number;
}

export const firestoreStats: FirestoreStats = {
  reads: 0,
  writes: 0,
  deletes: 0,
  skippedDuplicateWrites: 0,
  deduplicatedQueries: 0,
  quotaErrors: 0,
  activeListeners: 0,
  quotaCircuitOpenUntil: 0,
};

if (typeof window !== 'undefined') {
  (window as any).__CRM_FIRESTORE_STATS__ = firestoreStats;
}

const VOLATILE_TIMESTAMP_KEYS = new Set([
  'updated_at',
  'updatedAt',
  'created_at',
  'createdAt',
  'lastUpdated',
  'last_updated',
]);

// Cache of known document fields in Firestore: key = `${collection}/${safeDocId}`
const docFieldCache = new Map<string, Record<string, any>>();

// Cache of warehouse ma_kho -> { id, ten_kho } to avoid getDocs + setDoc on every page load
const warehouseByMaKhoCache = new Map<string, { id: string; ten_kho: string }>();

// Query cache & in-flight deduplication: key = `${tableName}::${querySignature}`
// Automatically invalidated on any local write or remote onSnapshot update
const QUERY_CACHE_TTL_MS = 60000;
const queryResultCache = new Map<string, { data: any[]; timestamp: number }>();
const inFlightQueries = new Map<string, Promise<any[]>>();

export function invalidateTableQueryCache(tableName: string) {
  const prefix = `${tableName}::`;
  for (const key of Array.from(queryResultCache.keys())) {
    if (key.startsWith(prefix)) queryResultCache.delete(key);
  }
}

function stableStringify(val: any): string {
  if (val === undefined) return '__undefined__';
  if (val === null || typeof val !== 'object') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return '[' + val.map(stableStringify).join(',') + ']';
  }
  // Ignore Firestore FieldValue sentinels (e.g. serverTimestamp())
  if (val._methodName || typeof val.isEqual === 'function') {
    return '__firestore_sentinel__';
  }
  const keys = Object.keys(val).sort();
  return '{' + keys.map(k => `${JSON.stringify(k)}:${stableStringify(val[k])}`).join(',') + '}';
}

export function seedDocCache(collectionName: string, docId: string, data: Record<string, any> | null | undefined) {
  if (!docId || !data || typeof data !== 'object') return;
  const key = `${collectionName}/${safeDocId(docId)}`;
  const existing = docFieldCache.get(key) || {};
  const merged = { ...existing, ...data, id: safeDocId(docId) };
  docFieldCache.set(key, merged);

  if (collectionName === 'user_permissions' && data.user_id !== undefined) {
    syncVerifiedSessionPermissions(
      String(data.user_id).trim(),
      Array.isArray(data.allowed_pages) ? data.allowed_pages : []
    );
  }

  if (collectionName === 'warehouses' && data.ma_kho !== undefined) {
    const mk = String(data.ma_kho).trim();
    if (mk) {
      warehouseByMaKhoCache.set(mk, {
        id: safeDocId(docId),
        ten_kho: String(data.ten_kho || ''),
      });
    }
  }
}

/**
 * Checks whether all meaningful (non-timestamp) fields in `incomingPatch`
 * already match the cached document in `docFieldCache`.
 */
export function isDocPayloadUnchanged(
  collectionName: string,
  docId: string,
  incomingPatch: Record<string, any>
): boolean {
  if (!docId || !incomingPatch || typeof incomingPatch !== 'object') return false;
  const key = `${collectionName}/${safeDocId(docId)}`;
  const cached = docFieldCache.get(key);
  if (!cached) return false;

  const keysToCompare = Object.keys(incomingPatch).filter(
    k => !VOLATILE_TIMESTAMP_KEYS.has(k) && k !== 'id'
  );
  // If payload only had timestamp/id keys, treat as unchanged if doc already exists
  if (keysToCompare.length === 0) return true;

  for (const k of keysToCompare) {
    const incomingVal = incomingPatch[k];
    if (incomingVal && typeof incomingVal === 'object' && incomingVal._methodName) {
      continue;
    }
    // Support dotted field paths in updateDoc (e.g., 'khaiThacSettings.ceBrandOrder')
    let cachedVal = cached[k];
    if (cachedVal === undefined && k.includes('.')) {
      const parts = k.split('.');
      let cur: any = cached;
      for (const p of parts) {
        cur = cur ? cur[p] : undefined;
      }
      cachedVal = cur;
    }
    if (stableStringify(incomingVal) !== stableStringify(cachedVal)) {
      return false;
    }
  }
  return true;
}

export function isQuotaExhaustedError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '').toLowerCase();
  const msg = String(err.message || '').toLowerCase();
  return (
    code.includes('resource-exhausted') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('exceeded your quota')
  );
}

function handleWriteError(err: any, context: string) {
  if (isQuotaExhaustedError(err)) {
    firestoreStats.quotaErrors++;
    // Trip circuit breaker for 60 seconds to prevent retry storms
    firestoreStats.quotaCircuitOpenUntil = Date.now() + 60_000;
    console.warn(`[FirestoreQuotaGuard] Quota exhausted during ${context}. Pausing non-critical writes for 60s.`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm-firestore-quota-warning', { detail: { context } }));
    }
  }
}

export function isWriteCircuitOpen(): boolean {
  return Date.now() < firestoreStats.quotaCircuitOpenUntil;
}

/**
 * Deduplicated wrapper around Firestore `setDoc`.
 * Skips the network write if all non-timestamp fields match `docFieldCache`.
 */
export async function safeSetDoc(
  docRef: DocumentReference,
  data: Record<string, any>,
  options?: SetOptions
): Promise<boolean> {
  const pathParts = docRef.path.split('/');
  const collectionName = pathParts[0] || '';
  const docId = pathParts[1] || docRef.id;

  if (isDocPayloadUnchanged(collectionName, docId, data)) {
    firestoreStats.skippedDuplicateWrites++;
    return false;
  }

  if (isWriteCircuitOpen()) {
    firestoreStats.skippedDuplicateWrites++;
    return false;
  }

  try {
    firestoreStats.writes++;
    if (options) {
      await setDoc(docRef, data, options);
    } else {
      await setDoc(docRef, data);
    }
    seedDocCache(collectionName, docId, data);
    invalidateTableQueryCache(collectionName);
    return true;
  } catch (err) {
    handleWriteError(err, `safeSetDoc(${docRef.path})`);
    throw err;
  }
}

/**
 * Deduplicated wrapper around Firestore `updateDoc`.
 */
export async function safeUpdateDoc(
  docRef: DocumentReference,
  data: Record<string, any>
): Promise<boolean> {
  const pathParts = docRef.path.split('/');
  const collectionName = pathParts[0] || '';
  const docId = pathParts[1] || docRef.id;

  if (isDocPayloadUnchanged(collectionName, docId, data)) {
    firestoreStats.skippedDuplicateWrites++;
    return false;
  }

  if (isWriteCircuitOpen()) {
    firestoreStats.skippedDuplicateWrites++;
    return false;
  }

  try {
    firestoreStats.writes++;
    await updateDoc(docRef, data);
    seedDocCache(collectionName, docId, data);
    invalidateTableQueryCache(collectionName);
    return true;
  } catch (err) {
    handleWriteError(err, `safeUpdateDoc(${docRef.path})`);
    throw err;
  }
}


/**
 * A lightweight adapter that mimics the Supabase fluent API
 * to minimize refactoring effort during migration.
 */
class FirebaseQueryBuilder {
  private tableName: string;
  private constraints: any[] = [];
  private sigParts: string[] = [];
  private idValue?: string;
  private orderColumn?: string;
  private orderDirection: 'asc' | 'desc' = 'asc';
  private limitCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private getQuerySignature(): string {
    return [
      this.idValue !== undefined ? `id=${safeDocId(this.idValue)}` : '',
      ...this.sigParts,
      this.orderColumn ? `ord=${this.orderColumn}:${this.orderDirection}` : '',
      this.limitCount ? `lim=${this.limitCount}` : '',
    ]
      .filter(Boolean)
      .join('&');
  }

  select(columns: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.sigParts.push(`eq:${column}:${String(value)}`);
    if (column === 'id') {
      this.idValue = value;
    } else {
      if ((this.tableName === 'ql_nguoi_dung' && column === 'username') || 
          (this.tableName === 'user_permissions' && column === 'user_id')) {
        const numVal = Number(value);
        if (typeof value === 'string' && !isNaN(numVal) && value.trim() !== '') {
           this.constraints.push(where(column, 'in', [value, numVal]));
           return this;
        } else if (typeof value === 'number') {
           this.constraints.push(where(column, 'in', [value, String(value)]));
           return this;
        }
      }
      this.constraints.push(where(column, '==', value));
    }
    return this;
  }

  ilike(column: string, value: string) {
    this.sigParts.push(`ilike:${column}:${String(value)}`);
    this.constraints.push(where(column, '==', value));
    return this;
  }

  in(column: string, values: any[]) {
    // Include both string and number versions for type-flexible matching
    const expanded: any[] = [];
    values.forEach(v => {
      expanded.push(v);
      if (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '') {
        expanded.push(Number(v));
      } else if (typeof v === 'number') {
        expanded.push(String(v));
      }
    });
    const unique = [...new Set(expanded)];
    this.sigParts.push(`in:${column}:${unique.map(String).sort().join(',')}`);
    if (column === 'id') {
      this.constraints.push(where(documentId(), 'in', unique.map(safeDocId).slice(0, 30)));
    } else {
      this.constraints.push(where(column, 'in', unique.slice(0, 30)));
    }
    return this;
  }

  // Basic .or support for the pattern: column.eq.val1,column.eq.val2...
  or(orString: string) {
    this.sigParts.push(`or:${orString}`);
    try {
      const parts = orString.split(',');
      const column = parts[0].split('.')[0];
      const values: any[] = [];
      parts.forEach(p => {
        const val = p.split('.eq.')[1];
        if (val === undefined) return;
        // Always include string version
        values.push(val);
        // Also include number version if it's a valid number (Firestore is type-strict)
        if (!isNaN(Number(val)) && val.trim() !== '') {
          values.push(Number(val));
        }
      });
      // Deduplicate
      const unique = [...new Set(values)];
      this.constraints.push(where(column, 'in', unique.slice(0, 30))); // Firestore 'in' max 30 values
    } catch (e) {
      console.warn('[FirebaseAdapter] Failed to parse .or():', orString);
    }
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderColumn = column;
    this.orderDirection = ascending ? 'asc' : 'desc';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  private async executeSelectDocs(): Promise<any[]> {
    enforceTableRlsPolicy(this.tableName, 'select');
    const cacheKey = `${this.tableName}::${this.getQuerySignature()}`;
    const now = Date.now();

    const cached = queryResultCache.get(cacheKey);
    if (cached && now - cached.timestamp < QUERY_CACHE_TTL_MS) {
      firestoreStats.deduplicatedQueries++;
      return cached.data;
    }

    const inFlight = inFlightQueries.get(cacheKey);
    if (inFlight) {
      firestoreStats.deduplicatedQueries++;
      return inFlight;
    }

    const fetchPromise = (async () => {
      try {
        if (this.idValue) {
          const sId = safeDocId(this.idValue);
          const docRef = doc(db, this.tableName, sId);
          const docSnap = await getDoc(docRef);
          firestoreStats.reads += 1;
          if (!docSnap.exists()) {
            queryResultCache.set(cacheKey, { data: [], timestamp: Date.now() });
            return [];
          }
          const item = { id: docSnap.id, ...docSnap.data() };
          seedDocCache(this.tableName, docSnap.id, item);
          const arr = [item];
          queryResultCache.set(cacheKey, { data: arr, timestamp: Date.now() });
          return arr;
        } else {
          const q = this.buildQuery();
          const querySnapshot = await getDocs(q);
          firestoreStats.reads += Math.max(1, querySnapshot.docs.length);
          const data = querySnapshot.docs.map(d => {
            const item = { id: d.id, ...d.data() };
            seedDocCache(this.tableName, d.id, item);
            return item;
          });
          queryResultCache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        }
      } finally {
        inFlightQueries.delete(cacheKey);
      }
    })();

    inFlightQueries.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  async single() {
    try {
      const docs = await this.executeSelectDocs();
      if (!docs || docs.length === 0) {
        return { data: null, error: { code: 'PGRST116', message: 'Not found' } };
      }
      return { data: docs[0], error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async maybeSingle() {
    try {
      const docs = await this.executeSelectDocs();
      if (!docs || docs.length === 0) {
        return { data: null, error: null };
      }
      return { data: docs[0], error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }

  async insert(data: any | any[]) {
    if (isWriteCircuitOpen()) {
      firestoreStats.skippedDuplicateWrites++;
      return { data: null, error: new Error('Firestore write paused due to quota protection') };
    }
    try {
      enforceTableRlsPolicy(this.tableName, 'insert', data);
      const items = Array.isArray(data) ? data : [data];
      const results = [];
      
      for (const rawItem of items) {
        const item = enforceSuperAdminWriteGuard(this.tableName, { ...rawItem });
        let docId = item.id;
        if (this.tableName === 'ql_nguoi_dung' && item.username) {
          docId = String(item.username).trim();
        }
        
        if (this.tableName === 'store') {
          if (!docId) {
            console.error(`[FirebaseAdapter.insert] REJECTED STORE DOC WITHOUT ID`);
            continue;
          }
          let strId = String(docId).trim();
          // Tự động gọt tiền tố số kho nếu có (VD "2187 - ĐML_..." -> "ĐML_...")
          strId = strId.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG|SIÊU THỊ|CH|KHO)[_\s-])/i, '').trim();
          strId = strId.replace(/^\d+\s*[-–—]\s*/, '').trim();
          strId = strId.replace(/(Đường|Đ\.|Phố)\s*-\s*(\d+)/gi, '$1 $2').trim();

          // TUYỆT ĐỐI KHÔNG TẠO DOCUMENT BẮT ĐẦU BẰNG SỐ TRÊN COLLECTION STORE
          if (/^\d/.test(strId) || !/[a-zA-ZÀ-ỹ]/.test(strId) || /(=>|!==|===|!=|==|[{}[\];$\\`"']|<[^>]*>)/.test(strId) || /[\r\n\t]/.test(strId) || strId.toUpperCase() === 'ALL' || strId.toUpperCase() === 'TỔNG') {
            console.error(`[FirebaseAdapter.insert] REJECTED INVALID/NUMERIC STORE ID: "${docId}" -> "${strId}"`);
            continue;
          }
          docId = strId.normalize('NFC').toUpperCase().replace(/\//g, '-');
          item.id = docId;
        }
        
        let docRef;
        if (docId) {
          const sId = safeDocId(docId);
          if (isDocPayloadUnchanged(this.tableName, sId, item)) {
            firestoreStats.skippedDuplicateWrites++;
            results.push({ id: sId, ...item });
            continue;
          }
          docRef = doc(db, this.tableName, sId);
          firestoreStats.writes++;
          await setDoc(docRef, {
            ...item,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          }, { merge: true });
          seedDocCache(this.tableName, sId, item);
        } else {
          if (this.tableName === 'store') {
            console.error(`[FirebaseAdapter.insert] REJECTED AUTO-GENERATED ID FOR STORE COLLECTION`);
            continue;
          }
          firestoreStats.writes++;
          docRef = await addDoc(collection(db, this.tableName), {
            ...item,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
          seedDocCache(this.tableName, docRef.id, item);
        }
        results.push({ id: docRef.id, ...item });
      }
      
      invalidateTableQueryCache(this.tableName);
      return { data: Array.isArray(data) ? results : results[0], error: null };
    } catch (error: any) {
      handleWriteError(error, `insert(${this.tableName})`);
      return { data: null, error };
    }
  }

  async upsert(data: any | any[], { onConflict = 'id' } = {}) {
    if (isWriteCircuitOpen()) {
      firestoreStats.skippedDuplicateWrites++;
      return { data: Array.isArray(data) ? data : data, error: null };
    }
    try {
      enforceTableRlsPolicy(this.tableName, 'upsert', data);
      const items = Array.isArray(data) ? data : [data];
      const results = [];

      for (const rawItem of items) {
        let existingDocData: Record<string, any> | undefined;
        let item = enforceSuperAdminWriteGuard(this.tableName, { ...rawItem });
        let id = item.id;

        // Fast-path for warehouses upserted by ma_kho
        if (!id && this.tableName === 'warehouses' && onConflict === 'ma_kho' && item.ma_kho !== undefined) {
          const mk = String(item.ma_kho).trim();
          const cachedWh = warehouseByMaKhoCache.get(mk);
          if (cachedWh) {
            if (cachedWh.ten_kho === String(item.ten_kho || '')) {
              firestoreStats.skippedDuplicateWrites++;
              results.push({ id: cachedWh.id, ...item });
              continue;
            }
            id = cachedWh.id;
          }
        }

        if (!id && onConflict) {
          const conflictFields = onConflict.split(',').map((f: string) => f.trim());
          // If multi-column conflict, we need to find the doc first
          if (conflictFields.length > 0) {
            // Try exact match first
            let q = query(collection(db, this.tableName));
            conflictFields.forEach(field => {
              if (item[field] !== undefined) q = query(q, where(field, '==', item[field]));
            });
            let snap = await getDocs(q);
            firestoreStats.reads += Math.max(1, snap.docs.length);
            
            // If not found and a field has a numeric value, try alternate type
            // Firestore is type-strict: '1841' !== 1841
            if (snap.empty) {
              const hasNumericField = conflictFields.some(field => {
                const val = item[field];
                return val !== undefined && !isNaN(Number(val));
              });
              
              if (hasNumericField) {
                // Try with alternate numeric types
                q = query(collection(db, this.tableName));
                conflictFields.forEach(field => {
                  const val = item[field];
                  if (val === undefined) return;
                  if (!isNaN(Number(val)) && String(val).trim() !== '') {
                    // If original is string, try number; if number, try string
                    const altVal = typeof val === 'string' ? Number(val) : String(val);
                    q = query(q, where(field, '==', altVal));
                  } else {
                    q = query(q, where(field, '==', val));
                  }
                });
                snap = await getDocs(q);
                firestoreStats.reads += Math.max(1, snap.docs.length);
              }
            }
            
            if (!snap.empty) {
              id = snap.docs[0].id;
              existingDocData = snap.docs[0].data();
              seedDocCache(this.tableName, id, existingDocData);
              item = enforceSuperAdminWriteGuard(this.tableName, item, existingDocData);
            } else if (this.tableName === 'warehouses' && item.ma_kho !== undefined) {
              // Deterministic ID for new warehouse docs so future lookups don't create duplicates
              id = safeDocId(String(item.ma_kho).trim());
            }
          }
        }
        
        if (this.tableName === 'store') {
          if (!id) {
            console.error(`[FirebaseAdapter.upsert] REJECTED STORE DOC WITHOUT ID`);
            continue;
          }
          let strId = String(id).trim();
          // Tự động gọt tiền tố số kho nếu có (VD "2187 - ĐML_..." -> "ĐML_...")
          strId = strId.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG|SIÊU THỊ|CH|KHO)[_\s-])/i, '').trim();
          strId = strId.replace(/^\d+\s*[-–—]\s*/, '').trim();
          strId = strId.replace(/(Đường|Đ\.|Phố)\s*-\s*(\d+)/gi, '$1 $2').trim();

          // TUYỆT ĐỐI KHÔNG TẠO DOCUMENT BẮT ĐẦU BẰNG SỐ TRÊN COLLECTION STORE
          if (/^\d/.test(strId) || !/[a-zA-ZÀ-ỹ]/.test(strId) || /(=>|!==|===|!=|==|[{}[\];$\\`"']|<[^>]*>)/.test(strId) || /[\r\n\t]/.test(strId) || strId.toUpperCase() === 'ALL' || strId.toUpperCase() === 'TỔNG') {
            console.error(`[FirebaseAdapter.upsert] REJECTED INVALID/NUMERIC STORE ID: "${id}" -> "${strId}"`);
            continue;
          }
          id = strId.normalize('NFC').toUpperCase().replace(/\//g, '-');
          item.id = id;
        }

        if (this.tableName === 'store' && !id) {
          console.error(`[FirebaseAdapter.upsert] CANNOT CREATE UNNAMED STORE DOCUMENT`);
          continue;
        }

        if (id && isDocPayloadUnchanged(this.tableName, id, item)) {
          firestoreStats.skippedDuplicateWrites++;
          results.push({ id: safeDocId(id), ...item });
          continue;
        }

        const docRef = id ? doc(db, this.tableName, safeDocId(id)) : doc(collection(db, this.tableName));
        firestoreStats.writes++;
        await setDoc(docRef, {
          ...item,
          updated_at: serverTimestamp()
        }, { merge: true });
        seedDocCache(this.tableName, docRef.id, item);
        
        results.push({ id: docRef.id, ...item });
      }

      invalidateTableQueryCache(this.tableName);
      return { data: Array.isArray(data) ? results : results[0], error: null };
    } catch (error: any) {
      handleWriteError(error, `upsert(${this.tableName})`);
      console.error('[FirebaseAdapter] upsert error:', error);
      return { data: null, error };
    }
  }

  update(data: any) {
    this.pendingUpdate = data;
    return this;
  }

  delete() {
    this.pendingDelete = true;
    return this;
  }

  private pendingUpdate: any = null;
  private pendingDelete: boolean = false;

  private async executeUpdate() {
    if (isWriteCircuitOpen()) {
      firestoreStats.skippedDuplicateWrites++;
      return { data: [], error: null };
    }
    try {
      enforceTableRlsPolicy(this.tableName, 'update', this.pendingUpdate);
      if (this.idValue) {
        const sId = safeDocId(this.idValue);
        const cachedDoc = docFieldCache.get(`${this.tableName}/${sId}`);
        const guardedUpdate = enforceSuperAdminWriteGuard(this.tableName, { ...this.pendingUpdate }, cachedDoc);
        if (isDocPayloadUnchanged(this.tableName, sId, guardedUpdate)) {
          firestoreStats.skippedDuplicateWrites++;
          return { data: [{ id: sId, ...guardedUpdate }], error: null };
        }
        const docRef = doc(db, this.tableName, sId);
        firestoreStats.writes++;
        await updateDoc(docRef, {
          ...guardedUpdate,
          updated_at: serverTimestamp()
        });
        seedDocCache(this.tableName, sId, guardedUpdate);
        invalidateTableQueryCache(this.tableName);
        return { data: [{ id: this.idValue, ...guardedUpdate }], error: null };
      }
      const q = this.buildQuery();
      const querySnapshot = await getDocs(q);
      firestoreStats.reads += Math.max(1, querySnapshot.docs.length);
      
      const results = [];
      for (const d of querySnapshot.docs) {
        const existingData = d.data();
        seedDocCache(this.tableName, d.id, existingData);
        const guardedUpdate = enforceSuperAdminWriteGuard(this.tableName, { ...this.pendingUpdate }, existingData);
        if (isDocPayloadUnchanged(this.tableName, d.id, guardedUpdate)) {
          firestoreStats.skippedDuplicateWrites++;
          results.push({ id: d.id, ...existingData, ...guardedUpdate });
          continue;
        }
        firestoreStats.writes++;
        await updateDoc(doc(db, this.tableName, d.id), {
          ...guardedUpdate,
          updated_at: serverTimestamp()
        });
        seedDocCache(this.tableName, d.id, guardedUpdate);
        results.push({ id: d.id, ...existingData, ...guardedUpdate });
      }
      
      invalidateTableQueryCache(this.tableName);
      return { data: results, error: null };
    } catch (error: any) {
      handleWriteError(error, `update(${this.tableName})`);
      return { data: null, error };
    }
  }

  private async executeDelete() {
    try {
      enforceTableRlsPolicy(this.tableName, 'delete');
      if (this.idValue) {
        const sId = safeDocId(this.idValue);
        const cachedDoc = docFieldCache.get(`${this.tableName}/${sId}`);
        if (
          this.tableName === 'ql_nguoi_dung' &&
          (isSuperAdmin43751(sId) || sId === '0Rmgk6N0qcWWW43a6bGN' || isSuperAdmin43751(cachedDoc?.username))
        ) {
          return { error: new Error('Protected SuperAdmin 43751 account cannot be deleted') };
        }
        firestoreStats.deletes++;
        await deleteDoc(doc(db, this.tableName, sId));
        docFieldCache.delete(`${this.tableName}/${sId}`);
        invalidateTableQueryCache(this.tableName);
        return { error: null };
      }
      const q = this.buildQuery();
      const querySnapshot = await getDocs(q);
      firestoreStats.reads += Math.max(1, querySnapshot.docs.length);
      
      for (const d of querySnapshot.docs) {
        const docData = d.data();
        if (
          (this.tableName === 'ql_nguoi_dung' && isSuperAdmin43751(docData?.username)) ||
          (this.tableName === 'user_permissions' && isSuperAdmin43751(docData?.user_id))
        ) {
          console.warn(`[FirebaseAdapter] Blocked deletion of protected SuperAdmin 43751 record in ${this.tableName}`);
          continue;
        }
        firestoreStats.deletes++;
        await deleteDoc(doc(db, this.tableName, d.id));
        docFieldCache.delete(`${this.tableName}/${d.id}`);
      }
      
      invalidateTableQueryCache(this.tableName);
      return { error: null };
    } catch (error: any) {
      handleWriteError(error, `delete(${this.tableName})`);
      return { error };
    }
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      let result: any;
      
      if (this.pendingUpdate) {
        result = await this.executeUpdate();
      } else if (this.pendingDelete) {
        result = await this.executeDelete();
      } else {
        const data = await this.executeSelectDocs();
        result = { data, error: null };
      }
      
      return onfulfilled ? onfulfilled(result) : result;
    } catch (error: any) {
      const result = { data: null, error };
      return onrejected ? onrejected(result) : result;
    }
  }

  catch(onrejected?: (reason: any) => any) {
    return this.then(undefined, onrejected);
  }

  finally(onfinally?: () => void) {
    return this.then(
      res => { if (onfinally) onfinally(); return res; },
      err => { if (onfinally) onfinally(); throw err; }
    );
  }

  private buildQuery() {
    let q = query(collection(db, this.tableName));
    if (this.constraints.length > 0) {
      q = query(q, ...this.constraints);
    }
    if (this.orderColumn) {
      q = query(q, orderBy(this.orderColumn, this.orderDirection));
    }
    if (this.limitCount) {
      q = query(q, limit(this.limitCount));
    }
    return q;
  }
}

// Multiplexed Realtime Channel Registry: shares 1 Firestore onSnapshot across identical table+filter subscriptions
interface SharedChannelEntry {
  unsubscribeFirestore: () => void;
  callbacks: Set<(payload: any) => void>;
  initialDocsLoaded: boolean;
  teardownTimer: ReturnType<typeof setTimeout> | null;
}

const sharedChannelRegistry = new Map<string, SharedChannelEntry>();

export const firebaseAdapter = {
  from: (tableName: string) => new FirebaseQueryBuilder(tableName),
  
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: (callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } })
  },

  channel: (name: string) => {
    return {
      on: function(type: string, filter: any, callback: any) {
        const tableName = filter.table;
        const filterStr = filter.filter || ''; // e.g. "warehouse_code=eq.123"
        const channelKey = `${tableName}::${filterStr}`;

        let entry = sharedChannelRegistry.get(channelKey);
        if (entry && entry.teardownTimer) {
          clearTimeout(entry.teardownTimer);
          entry.teardownTimer = null;
        }

        if (!entry) {
          let q = query(collection(db, tableName));
          if (filterStr) {
            try {
              const [col, valPart] = filterStr.split('=eq.');
              if (valPart !== undefined) {
                const cleanVal = valPart.trim();
                const values: any[] = [cleanVal];
                const num = Number(cleanVal);
                if (!isNaN(num) && cleanVal !== '') {
                  values.push(num);
                }
                const uniqueValues = [...new Set(values)];
                if (uniqueValues.length > 1) {
                  q = query(q, where(col, 'in', uniqueValues));
                } else {
                  q = query(q, where(col, '==', uniqueValues[0]));
                }
              }
            } catch (e) {}
          }

          const newEntry: SharedChannelEntry = {
            unsubscribeFirestore: () => {},
            callbacks: new Set([callback]),
            initialDocsLoaded: false,
            teardownTimer: null,
          };
          sharedChannelRegistry.set(channelKey, newEntry);
          firestoreStats.activeListeners++;

          newEntry.unsubscribeFirestore = onSnapshot(
            q,
            (snapshot) => {
              const isInitial = !newEntry.initialDocsLoaded;
              newEntry.initialDocsLoaded = true;

              snapshot.docChanges().forEach((change) => {
                const docData = change.doc.data();
                seedDocCache(tableName, change.doc.id, docData);
                if (!isInitial) {
                  invalidateTableQueryCache(tableName);
                }
                // Skip broadcasting initial snapshot "added" events since callers already run initial loadData()
                // Only broadcast genuine real-time INSERT / UPDATE events after subscription
                if (isInitial && change.type === 'added') {
                  return;
                }
                if (change.type === 'added' || change.type === 'modified') {
                  const payload = {
                    new: { id: change.doc.id, ...docData },
                    eventType: change.type === 'added' ? 'INSERT' : 'UPDATE',
                  };
                  newEntry.callbacks.forEach((cb) => {
                    try {
                      cb(payload);
                    } catch (err) {
                      console.error('[FirebaseAdapter.channel] Callback error:', err);
                    }
                  });
                }
              });
            },
            (err) => {
              handleWriteError(err, `onSnapshot(${channelKey})`);
            }
          );
          entry = newEntry;
        } else {
          entry.callbacks.add(callback);
        }

        const currentEntry = entry;
        this._unsubscribe = () => {
          currentEntry.callbacks.delete(callback);
          if (currentEntry.callbacks.size === 0 && !currentEntry.teardownTimer) {
            // Keep listener warm for 30s across tab switches to avoid re-subscribing reads
            currentEntry.teardownTimer = setTimeout(() => {
              if (currentEntry.callbacks.size === 0) {
                try {
                  currentEntry.unsubscribeFirestore();
                } catch {}
                sharedChannelRegistry.delete(channelKey);
                firestoreStats.activeListeners = Math.max(0, firestoreStats.activeListeners - 1);
              }
            }, 30000);
          }
        };
        return this;
      },
      subscribe: function(cb: any) { 
        if(cb) cb('SUBSCRIBED');
        return this; 
      },
      _unsubscribe: () => {}
    };
  },
  
  removeChannel: (channel: any) => {
    if (channel && channel._unsubscribe) {
      channel._unsubscribe();
    }
  }
};
