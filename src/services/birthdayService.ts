import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface EmployeeBirthday {
  id?: string;
  employee_name: string;
  birthday: string; // Định dạng YYYY-MM-DD
  warehouse_code: string;
  created_at?: any;
  updated_at?: any;
}

const normalizeStoreId = (name: string) => {
  if (!name) return '';
  return name.trim().normalize('NFC').toUpperCase();
};

export const birthdayService = {
  /**
   * Lấy danh sách ngày sinh nhật nhân viên từ tất cả các siêu thị trong collection 'store'
   */
  async getBirthdays(warehouseCode?: string): Promise<EmployeeBirthday[]> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    // Query all store documents to fetch birthdays globally
    const { data: stores, error } = await supabase
      .from('store')
      .select('birthday_data, ten_sieu_thi, id, warehouse_code');

    if (error) {
      console.error('[BirthdayService] getBirthdays error:', error);
      throw error;
    }

    const allBirthdays: EmployeeBirthday[] = [];
    
    if (stores) {
      stores.forEach((store: any) => {
        if (store.birthday_data) {
          try {
            const parsed = typeof store.birthday_data === 'string'
              ? JSON.parse(store.birthday_data)
              : store.birthday_data;
              
            if (Array.isArray(parsed)) {
              parsed.forEach((b: any) => {
                allBirthdays.push({
                  id: b.id,
                  employee_name: b.employee_name,
                  birthday: b.birthday,
                  warehouse_code: store.ten_sieu_thi || store.id
                });
              });
            }
          } catch (e) {
            console.error('Error parsing birthday_data for store:', store.id, e);
          }
        }
      });
    }

    // Filter by specific supermarket if requested
    if (warehouseCode && warehouseCode !== 'ALL') {
      return allBirthdays.filter(b => b.warehouse_code === warehouseCode);
    }
    
    return allBirthdays;
  },

  /**
   * Thêm mới hoặc cập nhật sinh nhật nhân viên vào document tương ứng với tên siêu thị
   */
  async addBirthday(payload: Omit<EmployeeBirthday, 'id'>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const storeName = payload.warehouse_code;
    const docId = normalizeStoreId(storeName);

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
        warehouse_code: storeDoc?.warehouse_code || '',
        birthday_data: JSON.stringify(list),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[BirthdayService] addBirthday error:', error);
      throw error;
    }

    return { id: newId };
  },

  /**
   * Thêm mới hoặc cập nhật danh sách sinh nhật nhân viên theo lô
   */
  async addBirthdays(payloads: Omit<EmployeeBirthday, 'id'>[]): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const groups: { [key: string]: Omit<EmployeeBirthday, 'id'>[] } = {};
    const uniqueStoreIds = new Set<string>();
    
    payloads.forEach(p => {
      const store = p.warehouse_code;
      if (!groups[store]) groups[store] = [];
      groups[store].push(p);
      uniqueStoreIds.add(normalizeStoreId(store));
    });

    // --- Validate Store Names against Firebase ---
    if (uniqueStoreIds.size > 0) {
      const { data: existingStores, error: checkError } = await supabase
        .from('store')
        .select('id, ten_sieu_thi')
        .in('id', Array.from(uniqueStoreIds));
        
      if (checkError) {
        throw new Error('Lỗi khi kiểm tra siêu thị trên Firebase: ' + checkError.message);
      }
      
      const foundIds = new Set(existingStores?.map((s: any) => s.id) || []);
      const invalidStoreNames: string[] = [];
      
      Object.keys(groups).forEach(storeName => {
        const id = normalizeStoreId(storeName);
        if (!foundIds.has(id)) {
          invalidStoreNames.push(storeName);
        }
      });
      
      if (invalidStoreNames.length > 0) {
        throw new Error(`SAI_TEN_SIEU_THI:Lỗi: Có ${invalidStoreNames.length} siêu thị sai tên (${invalidStoreNames.slice(0, 3).join(', ')}${invalidStoreNames.length > 3 ? '...' : ''}). Hãy copy đúng tên trên Bi!`);
      }
    }
    // ---------------------------------------------

    for (const storeName of Object.keys(groups)) {
      const docId = normalizeStoreId(storeName);
      const items = groups[storeName];

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
          console.error(e);
        }
      }

      items.forEach(item => {
        const newId = Math.random().toString(36).substring(2, 9);
        const existingIdx = list.findIndex(e => e.employee_name.toLowerCase() === item.employee_name.toLowerCase());
        if (existingIdx >= 0) {
          list[existingIdx] = {
            id: list[existingIdx].id || newId,
            employee_name: item.employee_name,
            birthday: item.birthday
          };
        } else {
          list.push({
            id: newId,
            employee_name: item.employee_name,
            birthday: item.birthday
          });
        }
      });

      await supabase
        .from('store')
        .upsert({
          id: docId,
          ten_sieu_thi: storeName,
          warehouse_code: storeDoc?.warehouse_code || '',
          birthday_data: JSON.stringify(list),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
    }

    return { success: true };
  },

  /**
   * Cập nhật thông tin sinh nhật nhân viên
   */
  async updateBirthday(id: string, payload: Partial<EmployeeBirthday>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const storeName = payload.warehouse_code;
    if (!storeName) throw new Error('Yêu cầu cung cấp tên siêu thị (warehouse_code) để cập nhật');

    const docId = normalizeStoreId(storeName);

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
        ten_sieu_thi: storeName,
        warehouse_code: storeDoc?.warehouse_code || '',
        birthday_data: JSON.stringify(list),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[BirthdayService] updateBirthday error:', error);
      throw error;
    }

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

    return true;
  },

  /**
   * Xóa toàn bộ sinh nhật của một siêu thị
   */
  async deleteBirthdaysByWarehouse(warehouseCode: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');
    if (!warehouseCode || warehouseCode === 'ALL') throw new Error('Mã siêu thị không hợp lệ');

    const docId = normalizeStoreId(warehouseCode);
    const { data: storeDoc } = await supabase
      .from('store')
      .select('warehouse_code')
      .eq('id', docId)
      .maybeSingle();

    const { error } = await supabase
      .from('store')
      .upsert({
        id: docId,
        ten_sieu_thi: warehouseCode,
        warehouse_code: storeDoc?.warehouse_code || '',
        birthday_data: '[]',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('[BirthdayService] deleteBirthdaysByWarehouse error:', error);
      throw error;
    }

    return true;
  }
};
