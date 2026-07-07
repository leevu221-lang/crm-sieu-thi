import { supabase, isSupabaseConfigured } from '../supabaseClient';

export interface EmployeeBirthday {
  id?: string;
  employee_name: string;
  birthday: string; // Định dạng YYYY-MM-DD
  warehouse_code: string;
  created_at?: any;
  updated_at?: any;
}

export const birthdayService = {
  /**
   * Lấy danh sách ngày sinh nhật nhân viên
   */
  async getBirthdays(warehouseCode?: string): Promise<EmployeeBirthday[]> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    let query = supabase.from('employee_birthdays').select('*');
    if (warehouseCode && warehouseCode !== 'ALL') {
      query = query.eq('warehouse_code', warehouseCode);
    }
    
    const { data, error } = await query;
    if (error) {
      console.error('[BirthdayService] getBirthdays error:', error);
      throw error;
    }
    
    return (data || []) as EmployeeBirthday[];
  },

  /**
   * Thêm mới hoặc cập nhật sinh nhật nhân viên (Upsert)
   */
  async addBirthday(payload: Omit<EmployeeBirthday, 'id'>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const { data, error } = await supabase
      .from('employee_birthdays')
      .upsert([payload], { onConflict: 'employee_name,warehouse_code' });
      
    if (error) {
      console.error('[BirthdayService] addBirthday error:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Thêm mới hoặc cập nhật danh sách sinh nhật nhân viên (Batch upsert)
   */
  async addBirthdays(payloads: Omit<EmployeeBirthday, 'id'>[]): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const { data, error } = await supabase
      .from('employee_birthdays')
      .upsert(payloads, { onConflict: 'employee_name,warehouse_code' });
      
    if (error) {
      console.error('[BirthdayService] addBirthdays error:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Cập nhật thông tin sinh nhật nhân viên
   */
  async updateBirthday(id: string, payload: Partial<EmployeeBirthday>): Promise<any> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const { data, error } = await supabase
      .from('employee_birthdays')
      .update(payload)
      .eq('id', id);
      
    if (error) {
      console.error('[BirthdayService] updateBirthday error:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Xóa thông tin sinh nhật nhân viên
   */
  async deleteBirthday(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const { error } = await supabase
      .from('employee_birthdays')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('[BirthdayService] deleteBirthday error:', error);
      throw error;
    }
    
    return true;
  },

  /**
   * Xóa toàn bộ sinh nhật của một siêu thị
   */
  async deleteBirthdaysByWarehouse(warehouseCode: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');
    if (!warehouseCode || warehouseCode === 'ALL') throw new Error('Mã siêu thị không hợp lệ');

    const { error } = await supabase
      .from('employee_birthdays')
      .delete()
      .eq('warehouse_code', warehouseCode);
      
    if (error) {
      console.error('[BirthdayService] deleteBirthdaysByWarehouse error:', error);
      throw error;
    }
    
    return true;
  }
};
