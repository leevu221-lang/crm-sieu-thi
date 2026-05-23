const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('store')
    .select('*')
    .eq('id', 'ĐML_CMA_CMA - 155A NGUYỄN TẤT THÀNH')
    .maybeSingle();
    
  if (error) console.error(error);
  else {
    console.log("rt_nh_cum length:", data.rt_nh_cum?.length);
    console.log("lk_bi_tong_quan length:", data.lk_bi_tong_quan?.length);
    if (data.lk_bi_tong_quan) {
      console.log("Preview lk_bi_tong_quan:");
      console.log(data.lk_bi_tong_quan.substring(0, 500));
    }
  }
}
check();
