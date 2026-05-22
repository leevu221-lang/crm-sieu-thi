import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
  const { data, error } = await supabase
    .from('store')
    .select('id, ten_sieu_thi, lk_nh_sieu_thi, category_targets')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error("Error fetching stores:", error);
    return;
  }

  console.log(`Found ${data.length} stores in DB:`);
  for (const row of data) {
    const targetsLen = Array.isArray(row.category_targets) ? row.category_targets.length : 0;
    const lkNhLen = row.lk_nh_sieu_thi ? row.lk_nh_sieu_thi.length : 0;
    console.log(`- ID: "${row.id}", Name: "${row.ten_sieu_thi}", lk_nh_sieu_thi length: ${lkNhLen}, category_targets: ${targetsLen} items`);
    if (targetsLen > 0) {
      console.log("  First 3 targets:", row.category_targets.slice(0, 3));
    }
  }
}

checkData();
