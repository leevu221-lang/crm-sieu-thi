import { supabase } from '../supabaseClient';
import { isFirebaseConfigured } from '../firebaseConfig';

const isSupabaseConfigured = isFirebaseConfigured;

export interface InventorySchedule {
  id?: string;
  warehouse_code: string;
  calendar_image: string; // base64 string
  title: string;
  inventory_date: string; // YYYY-MM-DD
  status: 'pending' | 'completed';
  created_at?: any;
}

export interface InventoryAssignment {
  id?: string;
  schedule_id: string;
  employee_name: string;
  role: string;
  zone: string;
  created_at?: any;
}

export const inventoryService = {
  /**
   * Lấy danh sách tất cả các lịch kiểm kê của một siêu thị
   */
  async getInventorySchedules(warehouseCode: string): Promise<InventorySchedule[]> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');
    if (!warehouseCode) return [];

    const { data, error } = await supabase
      .from('inventory_schedules')
      .select('*')
      .eq('warehouse_code', warehouseCode);

    if (error) {
      console.error('[InventoryService] getInventorySchedules error:', error);
      throw error;
    }

    return (data || []) as InventorySchedule[];
  },

  /**
   * Lưu hoặc cập nhật một lịch kiểm kê (Upsert theo warehouse_code và title)
   */
  async saveInventorySchedule(schedule: Omit<InventorySchedule, 'id'> & { id?: string }): Promise<InventorySchedule> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    const { data, error } = await supabase
      .from('inventory_schedules')
      .upsert([schedule], { onConflict: 'warehouse_code,title' });

    if (error) {
      console.error('[InventoryService] saveInventorySchedule error:', error);
      throw error;
    }

    // Load the saved document to get the complete object including ID
    const { data: loaded, error: loadError } = await supabase
      .from('inventory_schedules')
      .select('*')
      .eq('warehouse_code', schedule.warehouse_code)
      .eq('title', schedule.title)
      .maybeSingle();

    if (loadError || !loaded) {
      throw new Error('Không thể tải lại lịch kiểm kê sau khi lưu');
    }

    return loaded as InventorySchedule;
  },

  /**
   * Xóa lịch kiểm kê và tất cả phân công liên quan
   */
  async deleteInventorySchedule(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    // 1. Delete all assignments first
    const { error: assignmentsError } = await supabase
      .from('inventory_assignments')
      .delete()
      .eq('schedule_id', id);

    if (assignmentsError) {
      console.error('[InventoryService] delete assignments error:', assignmentsError);
    }

    // 2. Delete schedule
    const { error } = await supabase
      .from('inventory_schedules')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[InventoryService] deleteInventorySchedule error:', error);
      throw error;
    }

    return true;
  },

  /**
   * Lấy danh sách phân công nhân viên kiểm kê của nhiều lịch trình cùng lúc
   */
  async getAssignmentsForSchedules(scheduleIds: string[]): Promise<InventoryAssignment[]> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');
    if (!scheduleIds || scheduleIds.length === 0) return [];

    const { data, error } = await supabase
      .from('inventory_assignments')
      .select('*')
      .in('schedule_id', scheduleIds);

    if (error) {
      console.error('[InventoryService] getAssignmentsForSchedules error:', error);
      throw error;
    }

    return (data || []) as InventoryAssignment[];
  },

  /**
   * Lưu hoặc cập nhật danh sách phân công nhân viên
   * Xóa toàn bộ phân công cũ của scheduleId và ghi đè danh sách mới
   */
  async saveAssignmentsForSchedule(scheduleId: string, assignments: Omit<InventoryAssignment, 'id'>[]): Promise<boolean> {
    if (!isSupabaseConfigured) throw new Error('Firebase chưa được cấu hình');

    // 1. Xóa phân công cũ
    const { error: deleteError } = await supabase
      .from('inventory_assignments')
      .delete()
      .eq('schedule_id', scheduleId);

    if (deleteError) {
      console.error('[InventoryService] clear old assignments error:', deleteError);
      throw deleteError;
    }

    // 2. Insert phân công mới
    if (assignments.length > 0) {
      const { error: insertError } = await supabase
        .from('inventory_assignments')
        .insert(assignments);

      if (insertError) {
        console.error('[InventoryService] insert new assignments error:', insertError);
        throw insertError;
      }
    }

    return true;
  }
};
