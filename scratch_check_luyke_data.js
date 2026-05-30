import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('store').select('id, warehouse_code, lk_bi_tong_quan, lk_bi_nganh_hang').limit(10);
  if (error) {
    console.error('Error fetching stores:', error);
    return;
  }
  for (const store of data) {
    if (store.lk_bi_nganh_hang || store.lk_bi_tong_quan) {
      console.log('--- Store:', store.id, 'Code:', store.warehouse_code);
      if (store.lk_bi_nganh_hang) {
        console.log('lk_bi_nganh_hang (first 500 chars):');
        console.log(store.lk_bi_nganh_hang.substring(0, 500));
      }
      if (store.lk_bi_tong_quan) {
        console.log('lk_bi_tong_quan (first 500 chars):');
        console.log(store.lk_bi_tong_quan.substring(0, 500));
      }
      console.log('====================================\n');
    }
  }
}
run();
