import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface EmployeeBirthday {
  id?: string;
  employee_name: string;
  birthday: string; // Định dạng YYYY-MM-DD
  warehouse_code: string;
  store_code?: string;
  created_at?: any;
  updated_at?: any;
}

export const normalizeStoreId = (name: string) => {
  if (!name) return '';
  return name.trim().normalize('NFC').toUpperCase();
};

export function isStoreMatch(item: { warehouse_code?: string; store_code?: string }, filter: string): boolean {
  if (!filter || filter === 'ALL') return true;
  const cleanFilter = filter.trim().normalize('NFC').toUpperCase();
  
  // Check store code e.g. "1841"
  if (item.store_code && (
    cleanFilter === item.store_code ||
    cleanFilter.startsWith(item.store_code + ' ') ||
    cleanFilter.startsWith(item.store_code + ' -') ||
    cleanFilter.includes(item.store_code)
  )) {
    return true;
  }
  
  const cleanStore = (item.warehouse_code || '').trim().normalize('NFC').toUpperCase();
  if (cleanStore === cleanFilter) return true;
  if (cleanStore.includes(cleanFilter) || cleanFilter.includes(cleanStore)) return true;
  
  const extractWords = (s: string) => 
    s.replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, ' ')
     .split(/\s+/)
     .filter(w => w.length > 2 && !['ĐML', 'TGD', 'ĐMS', 'DMX', 'CMA'].includes(w));
     
  const wordsStore = extractWords(cleanStore);
  const wordsFilter = extractWords(cleanFilter);
  const common = wordsStore.filter(w => wordsFilter.includes(w));
  return common.length >= 2;
}

// getBirthdays() has no per-store filter available (birthdays live inside each store's
// document, keyed by store name/id rather than a queryable birthday collection), so
// fetching them means reading every document in 'store'. That's fine once — but this is
// called on every RealtimePage mount, and at ~1000 concurrent users that turns into
// (number of stores) reads on every single page load. A short cache (in-memory for the
// tab's lifetime + localStorage so it survives an F5) turns "every mount" into "at most
// once every 5 minutes across the whole app", which is the single biggest read reduction
// available here. See src/services/cachedFirestore.ts for the same pattern applied to
// single-document config reads.
const BIRTHDAY_CACHE_KEY = 'crm_birthdays_all_cache_v1';
const BIRTHDAY_CACHE_TTL_MS = 5 * 60 * 1000;
let birthdaysMemCache: { data: EmployeeBirthday[]; ts: number } | null = null;
let birthdaysInFlight: Promise<EmployeeBirthday[]> | null = null;

function invalidateBirthdaysCache() {
  birthdaysMemCache = null;
  try { localStorage.removeItem(BIRTHDAY_CACHE_KEY); } catch {}
}

export const birthdayService = {
  /**
   * Lấy danh sách ngày sinh nhật nhân viên từ tất cả các siêu thị trong collection 'store'.
   * Cached — pass force=true to bypass (e.g. right after an admin edits birthdays).
   */
  async getBirthdays(warehouseCode?: string, force = false): Promise<EmployeeBirthday[]> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const now = Date.now();
    let allBirthdays: EmployeeBirthday[] | null = null;

    if (!force) {
      if (birthdaysMemCache && now - birthdaysMemCache.ts < BIRTHDAY_CACHE_TTL_MS) {
        allBirthdays = birthdaysMemCache.data;
      } else if (!birthdaysMemCache) {
        try {
          const raw = localStorage.getItem(BIRTHDAY_CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (now - parsed.ts < BIRTHDAY_CACHE_TTL_MS) {
              birthdaysMemCache = parsed;
              allBirthdays = parsed.data;
            }
          }
        } catch {}
      }
    }

    if (allBirthdays === null) {
      if (!force && birthdaysInFlight) {
        allBirthdays = await birthdaysInFlight;
      } else {
        const fetchPromise = (async () => {
          // Query all store documents to fetch birthdays globally
          const { data: stores, error } = await supabase
            .from('store')
            .select('birthday_data, ten_sieu_thi, id, warehouse_code');

          if (error) {
            console.error('[BirthdayService] getBirthdays error:', error);
            throw error;
          }

          const result: EmployeeBirthday[] = [];
          if (stores) {
            stores.forEach((store: any) => {
              if (store.birthday_data) {
                try {
                  const parsed = typeof store.birthday_data === 'string'
                    ? JSON.parse(store.birthday_data)
                    : store.birthday_data;

                  if (Array.isArray(parsed)) {
                    parsed.forEach((b: any) => {
                      result.push({
                        id: b.id,
                        employee_name: b.employee_name,
                        birthday: b.birthday,
                        warehouse_code: store.ten_sieu_thi || store.id,
                        store_code: store.warehouse_code ? String(store.warehouse_code).trim() : ''
                      });
                    });
                  }
                } catch (e) {
                  console.error('Error parsing birthday_data for store:', store.id, e);
                }
              }
            });
          }

          const entry = { data: result, ts: Date.now() };
          birthdaysMemCache = entry;
          try { localStorage.setItem(BIRTHDAY_CACHE_KEY, JSON.stringify(entry)); } catch {}
          return result;
        })();
        birthdaysInFlight = fetchPromise;
        try {
          allBirthdays = await fetchPromise;
        } finally {
          birthdaysInFlight = null;
        }
      }
    }

    // Filter by specific supermarket if requested
    if (warehouseCode && warehouseCode !== 'ALL') {
      return allBirthdays.filter(b => b.warehouse_code === warehouseCode);
    }

    return allBirthdays;
  },

  async resolveStoreInfo(rawStore: string): Promise<{ docId: string; storeName: string; warehouse_code: string }> {
    const clean = (rawStore || '').trim().normalize('NFC').toUpperCase();
    if (!clean) {
      return { docId: '', storeName: '', warehouse_code: '' };
    }

    try {
      const { data: stores } = await supabase
        .from('store')
        .select('id, ten_sieu_thi, warehouse_code');

      if (stores && stores.length > 0) {
        // 1. Exact ID match (normalized NFC)
        let match = stores.find(s => s.id.trim().normalize('NFC').toUpperCase() === clean);
        if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

        // 2. Exact ten_sieu_thi match
        match = stores.find(s => (s.ten_sieu_thi || '').trim().normalize('NFC').toUpperCase() === clean);
        if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

        // 3. Warehouse code match (e.g., "1841")
        match = stores.find(s => String(s.warehouse_code).trim() === clean);
        if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

        // 4. Substring inclusion
        match = stores.find(s => {
          const sClean = s.id.trim().normalize('NFC').toUpperCase();
          return sClean.includes(clean) || clean.includes(sClean);
        });
        if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };
      }
    } catch (e) {
      console.warn('[BirthdayService] resolveStoreInfo fetch error:', e);
    }

    return { docId: normalizeStoreId(rawStore), storeName: rawStore.trim(), warehouse_code: '' };
  },

  /**
   * Thêm mới hoặc cập nhật sinh nhật nhân viên vào document tương ứng với tên siêu thị
   */
  async addBirthday(payload: Omit<EmployeeBirthday, 'id'>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const resolved = await this.resolveStoreInfo(payload.warehouse_code);
    const docId = resolved.docId;
    const storeName = resolved.storeName;

    const { data: storeDoc } = await supabase
      .from('store')
      .select('birthday_data, warehouse_code')
      .eq('id', docId)
      .maybeSingle();

    let list: any[] = [];
    if (storeDoc && storeDoc.birthday_data) {
      try {
        const parsed = typeof storeDoc.birthday_data === 'string'
          ? JSON.parse(storeDoc.birthday_data)
          : storeDoc.birthday_data;
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        console.error('Error parsing existing birthday_data:', e);
      }
    }

    const newId = Math.random().toString(36).substring(2, 9);
    const existingIdx = list.findIndex(e => e.employee_name.toLowerCase() === payload.employee_name.toLowerCase());
    
    if (existingIdx >= 0) {
      list[existingIdx] = {
        id: list[existingIdx].id || newId,
        employee_name: payload.employee_name,
        birthday: payload.birthday
      };
    } else {
      list.push({
        id: newId,
        employee_name: payload.employee_name,
        birthday: payload.birthday
      });
    }

    const { error } = await supabase
      .from('store')
      .upsert({
        id: docId,
        ten_sieu_thi: storeName,
        warehouse_code: storeDoc?.warehouse_code || resolved.warehouse_code || '',
        birthday_data: JSON.stringify(list),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[BirthdayService] addBirthday error:', error);
      throw error;
    }

    invalidateBirthdaysCache();
    return { id: newId };
  },

  /**
   * Thêm mới hoặc cập nhật danh sách sinh nhật nhân viên theo lô
   */
  async addBirthdays(payloads: Omit<EmployeeBirthday, 'id'>[]): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');
    if (!payloads || payloads.length === 0) return { success: true };

    // Fetch all stores once for fast matching
    let storesList: any[] = [];
    try {
      const { data: stores } = await supabase
        .from('store')
        .select('id, ten_sieu_thi, warehouse_code');
      storesList = stores || [];
    } catch (e) {
      console.warn('[BirthdayService] addBirthdays store list fetch failed:', e);
    }

    const resolveFromList = (rawStore: string) => {
      const clean = (rawStore || '').trim().normalize('NFC').toUpperCase();
      if (!clean) return { docId: 'DEFAULT_STORE', storeName: 'DEFAULT', warehouse_code: '' };

      let match = storesList.find(s => s.id.trim().normalize('NFC').toUpperCase() === clean);
      if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

      match = storesList.find(s => (s.ten_sieu_thi || '').trim().normalize('NFC').toUpperCase() === clean);
      if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

      match = storesList.find(s => String(s.warehouse_code).trim() === clean);
      if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

      match = storesList.find(s => {
        const sClean = s.id.trim().normalize('NFC').toUpperCase();
        return sClean.includes(clean) || clean.includes(sClean);
      });
      if (match) return { docId: match.id, storeName: match.ten_sieu_thi || match.id, warehouse_code: match.warehouse_code || '' };

      return { docId: normalizeStoreId(rawStore), storeName: rawStore.trim(), warehouse_code: '' };
    };

    // Group items by resolved docId
    const groups: { [docId: string]: { storeName: string; warehouse_code: string; items: Omit<EmployeeBirthday, 'id'>[] } } = {};
    
    payloads.forEach(p => {
      const resolved = resolveFromList(p.warehouse_code);
      if (!groups[resolved.docId]) {
        groups[resolved.docId] = {
          storeName: resolved.storeName,
          warehouse_code: resolved.warehouse_code,
          items: []
        };
      }
      groups[resolved.docId].items.push(p);
    });

    for (const docId of Object.keys(groups)) {
      const { storeName, warehouse_code, items } = groups[docId];

      const { data: storeDoc } = await supabase
        .from('store')
        .select('birthday_data, warehouse_code, ten_sieu_thi')
        .eq('id', docId)
        .maybeSingle();

      let list: any[] = [];
      if (storeDoc && storeDoc.birthday_data) {
        try {
          const parsed = typeof storeDoc.birthday_data === 'string'
            ? JSON.parse(storeDoc.birthday_data)
            : storeDoc.birthday_data;
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {
          console.error(e);
        }
      }

      items.forEach(item => {
        const newId = Math.random().toString(36).substring(2, 9);
        const existingIdx = list.findIndex(e => e.employee_name.toLowerCase().trim() === item.employee_name.toLowerCase().trim());
        if (existingIdx >= 0) {
          list[existingIdx] = {
            id: list[existingIdx].id || newId,
            employee_name: item.employee_name.trim(),
            birthday: item.birthday
          };
        } else {
          list.push({
            id: newId,
            employee_name: item.employee_name.trim(),
            birthday: item.birthday
          });
        }
      });

      await supabase
        .from('store')
        .upsert({
          id: docId,
          ten_sieu_thi: storeDoc?.ten_sieu_thi || storeName,
          warehouse_code: storeDoc?.warehouse_code || warehouse_code || '',
          birthday_data: JSON.stringify(list),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    }

    invalidateBirthdaysCache();
    return { success: true };
  },

  /**
   * Cập nhật thông tin sinh nhật nhân viên
   */
  async updateBirthday(id: string, payload: Partial<EmployeeBirthday>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const storeName = payload.warehouse_code;
    if (!storeName) throw new Error('Yêu cầu cung cấp tên siêu thị (warehouse_code) để cập nhật');

    const resolved = await this.resolveStoreInfo(storeName);
    const docId = resolved.docId;

    const { data: storeDoc } = await supabase
      .from('store')
      .select('birthday_data, warehouse_code, ten_sieu_thi')
      .eq('id', docId)
      .maybeSingle();

    let list: any[] = [];
    if (storeDoc && storeDoc.birthday_data) {
      try {
        const parsed = typeof storeDoc.birthday_data === 'string'
          ? JSON.parse(storeDoc.birthday_data)
          : storeDoc.birthday_data;
        if (Array.isArray(parsed)) list = parsed;
      } catch (e) {
        console.error(e);
      }
    }

    const idx = list.findIndex(e => e.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        employee_name: payload.employee_name || list[idx].employee_name,
        birthday: payload.birthday || list[idx].birthday
      };
    }

    const { error } = await supabase
      .from('store')
      .upsert({
        id: docId,
        ten_sieu_thi: storeDoc?.ten_sieu_thi || resolved.storeName,
        warehouse_code: storeDoc?.warehouse_code || resolved.warehouse_code || '',
        birthday_data: JSON.stringify(list),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[BirthdayService] updateBirthday error:', error);
      throw error;
    }

    invalidateBirthdaysCache();
    return { success: true };
  },

  /**
   * Xóa thông tin sinh nhật nhân viên
   */
  async deleteBirthday(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const { data: stores } = await supabase
      .from('store')
      .select('id, birthday_data, warehouse_code, ten_sieu_thi');

    if (stores) {
      for (const store of stores) {
        if (store.birthday_data) {
          try {
            let list = typeof store.birthday_data === 'string'
              ? JSON.parse(store.birthday_data)
              : store.birthday_data;
            if (Array.isArray(list)) {
              const idx = list.findIndex((e: any) => e.id === id);
              if (idx >= 0) {
                list.splice(idx, 1);
                await supabase
                  .from('store')
                  .upsert({
                    id: store.id,
                    ten_sieu_thi: store.ten_sieu_thi,
                    warehouse_code: store.warehouse_code || '',
                    birthday_data: JSON.stringify(list),
                    updated_at: new Date().toISOString()
                  }, { onConflict: 'id' });
                break;
              }
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    }

    invalidateBirthdaysCache();
    return true;
  },

  /**
   * Xóa toàn bộ sinh nhật của một siêu thị
   */
  async deleteBirthdaysByWarehouse(warehouseCode: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');
    if (!warehouseCode || warehouseCode === 'ALL') throw new Error('Mã siêu thị không hợp lệ');

    const resolved = await this.resolveStoreInfo(warehouseCode);
    const docId = resolved.docId;
    const { data: storeDoc } = await supabase
      .from('store')
      .select('warehouse_code, ten_sieu_thi')
      .eq('id', docId)
      .maybeSingle();

    const { error } = await supabase
      .from('store')
      .upsert({
        id: docId,
        ten_sieu_thi: storeDoc?.ten_sieu_thi || resolved.storeName,
        warehouse_code: storeDoc?.warehouse_code || resolved.warehouse_code || '',
        birthday_data: '[]',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[BirthdayService] deleteBirthdaysByWarehouse error:', error);
      throw error;
    }

    invalidateBirthdaysCache();
    return true;
  }
};
