const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('store')
    .select('id, ten_sieu_thi, warehouse_code, tragop_nv')
    .ilike('id', '%155A%');
    
  if (error) {
    console.error(error);
  } else {
    console.log("Found records matching '%155A%':", data.length);
    data.forEach(r => {
      console.log(`ID: "${r.id}"`);
      console.log(`ten_sieu_thi: "${r.ten_sieu_thi}"`);
      console.log(`warehouse_code: "${r.warehouse_code}"`);
      console.log(`tragop_nv (length): ${r.tragop_nv ? r.tragop_nv.length : 'null'}`);
      if (r.tragop_nv) {
        console.log("tragop_nv preview:\n", r.tragop_nv.substring(0, 300));
      }
      console.log("-----------------------------------------");
    });
  }
}
check();
