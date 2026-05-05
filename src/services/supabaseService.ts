import { supabase, isSupabaseConfigured } from '../supabaseClient';

/**
 * Service xử lý các thao tác gọi Supabase
 * Được thiết kế theo nguyên tắc chia nhỏ để trị và xử lý lỗi tập trung
 */

export const SupabaseService = {
  /**
   * Lấy danh sách người dùng (Tối ưu hóa: Giới hạn 200 dòng, chỉ lấy các cột cần thiết)
   */
  async getUsers() {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');
    
    const { data, error } = await supabase
      .from('ql_nguoi_dung')
      .select('username, storeCode, password') 
      .limit(200);
      
    if (error) {
      console.error('[SupabaseService] getUsers error:', error);
      throw error;
    }
    
    // Map lại để đồng bộ với UI
    return (data || []).map(u => ({
      username: u.username,
      ma_kho: u.storeCode,
      role: 'user'
    }));
  },

  /**
   * Lấy danh sách kho hàng
   */
  async getWarehouses() {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');
    
    const { data, error } = await supabase
      .from('warehouses')
      .select('ma_kho, ten_kho')
      .order('ten_kho', { ascending: true });
      
    if (error) {
      console.error('[SupabaseService] getWarehouses error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Lấy thông tin lũy kế của một kho
   */
  async getStoreLuyKe(warehouseCode: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');

    const { data, error } = await supabase
      .from('store_luyke')
      .select('warehouse_code, revenue, target, updated_at')
      .eq('warehouse_code', warehouseCode)
      .single();
      
    if (error && error.code !== 'PGRST116') { // PGRST116 là lỗi không tìm thấy record
      console.error('[SupabaseService] getStoreLuyKe error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Cập nhật hoặc tạo mới thông tin lũy kế
   */
  async upsertStoreLuyKe(payload: any) {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');

    const { data, error } = await supabase
      .from('store_luyke')
      .upsert({
        ...payload,
        updated_at: new Error().stack?.includes('upsert') ? new Date().toISOString() : undefined
      })
      .select()
      .single();
      
    if (error) {
      console.error('[SupabaseService] upsertStoreLuyKe error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Lấy danh sách sức khỏe nhân viên theo kho
   */
  async getEmployeeHealth(warehouseCode: string, date?: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');

    let query = supabase
      .from('employee_health')
      .select('id, warehouse_code, employee_name, status, note, check_date, created_at')
      .eq('warehouse_code', warehouseCode);
      
    if (date) {
      query = query.eq('check_date', date);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
      
    if (error) {
      console.error('[SupabaseService] getEmployeeHealth error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Thêm bản ghi sức khỏe nhân viên
   */
  async addEmployeeHealth(payload: {
    warehouse_code: string;
    employee_name: string;
    status: string;
    note?: string;
    check_date?: string;
  }) {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');

    const { data, error } = await supabase
      .from('employee_health')
      .insert([payload])
      .select()
      .single();
      
    if (error) {
      console.error('[SupabaseService] addEmployeeHealth error:', error);
      throw error;
    }
    return data;
  },

  /**
   * Xóa bản ghi sức khỏe
   */
  async deleteEmployeeHealth(id: string) {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');

    const { error } = await supabase
      .from('employee_health')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('[SupabaseService] deleteEmployeeHealth error:', error);
      throw error;
    }
    return true;
  },

  /**
   * Hàm gọi generic cho bất kỳ bảng nào (Dùng cho các trường hợp linh hoạt)
   */
  async fetchTableData(tableName: string, options: { 
    select?: string, 
    filter?: Record<string, any>,
    order?: { column: string, ascending?: boolean }
  } = {}) {
    if (!isSupabaseConfigured) throw new Error('Supabase chưa được cấu hình');

    let query = supabase.from(tableName).select(options.select || '*');
    
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error(`[SupabaseService] fetchTableData (${tableName}) error:`, error);
      throw error;
    }
    return data;
  }
};
