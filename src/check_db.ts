import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Querying store inside workspace...');
  const { data, error } = await supabase
    .from('store')
    .select('id, warehouse_code, ten_sieu_thi, lk_bi_tong_quan, lk_nh_sieu_thi')
    .eq('id', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH');

  if (error) {
    console.error('Error querying store:', error);
    return;
  }

  console.log(`Found ${data?.length} records:`);
  data?.forEach(r => {
    console.log(`- ID: ${r.id}`);
    console.log(`  warehouse_code: ${r.warehouse_code}`);
    console.log(`  ten_sieu_thi: ${r.ten_sieu_thi}`);
    console.log(`  lk_bi_tong_quan length: ${r.lk_bi_tong_quan?.length || 0}`);
    console.log(`  lk_nh_sieu_thi length: ${r.lk_nh_sieu_thi?.length || 0}`);
  });
}

main().catch(console.error);
