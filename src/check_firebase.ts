import { supabase } from './supabaseClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Inject environment variables
dotenv.config();

async function check() {
  console.log('[DIAGNOSTICS] Querying store ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH from Firestore...');
  try {
    const { data, error } = await supabase
      .from('store')
      .select('id, warehouse_code, ten_sieu_thi, lk_bi_tong_quan, lk_nh_sieu_thi, category_targets')
      .eq('id', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH')
      .maybeSingle();

    if (error) {
      console.error('[DIAGNOSTICS] Error:', error);
      return;
    }

    if (!data) {
      console.log('[DIAGNOSTICS] No record found in Firestore.');
      return;
    }

    console.log('[DIAGNOSTICS] Record Found!');
    console.log(' - ID:', data.id);
    console.log(' - warehouse_code:', data.warehouse_code);
    console.log(' - ten_sieu_thi:', data.ten_sieu_thi);
    console.log(' - lk_bi_tong_quan length:', data.lk_bi_tong_quan?.length || 0);
    console.log(' - lk_nh_sieu_thi length:', data.lk_nh_sieu_thi?.length || 0);
    console.log(' - lk_nh_sieu_thi snippet:', data.lk_nh_sieu_thi ? data.lk_nh_sieu_thi.substring(0, 100) : 'EMPTY');
  } catch (e) {
    console.error('[DIAGNOSTICS] Exception:', e);
  }
}

check();
