const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkThuongData() {
  const { data, error } = await supabase
    .from('store')
    .select('id, ten_sieu_thi, thuong_nv_data');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Found ${data.length} stores:`);
  for (const row of data) {
    if (row.thuong_nv_data) {
      console.log(`- Store: "${row.id}" (${row.ten_sieu_thi})`);
      try {
        const parsed = typeof row.thuong_nv_data === 'string' ? JSON.parse(row.thuong_nv_data) : row.thuong_nv_data;
        const keys = Object.keys(parsed || {});
        console.log(`  Has ${keys.length} staff keys:`, keys);
        for (const k of keys.slice(0, 3)) {
          console.log(`  Staff ID: ${k}`);
          console.log(`    truoc length: ${parsed[k].truoc?.length || 0}`);
          console.log(`    hientai length: ${parsed[k].hientai?.length || 0}`);
          console.log(`    truoc preview:`, JSON.stringify(parsed[k].truoc?.substring(0, 200)));
        }
      } catch (e) {
        console.log("  Error parsing JSON:", e.message);
      }
    }
  }
}

checkThuongData();
