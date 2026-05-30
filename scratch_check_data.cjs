const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('store')
    .select('id, lk_dt_nv, lk_td_nv, tragop_matran, ten_sieu_thi')
    .ilike('ten_sieu_thi', '%155A%')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No store found matching 155A');
    return;
  }

  const store = data[0];
  console.log('=== ID ===');
  console.log(store.id);
  console.log('=== TEN SIEU THI ===');
  console.log(store.ten_sieu_thi);
  console.log('=== TRAGOP_MATRAN (length: ' + (store.tragop_matran || '').length + ') ===');
  console.log((store.tragop_matran || '').substring(0, 1000));
  console.log('=== LK_TD_NV (length: ' + (store.lk_td_nv || '').length + ') ===');
  console.log((store.lk_td_nv || '').substring(0, 1000));
}

check();
