import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
  const { data, error } = await supabase
    .from('store')
    .select('id, ten_sieu_thi, ycx_data')
    .eq('id', '1841')
    .maybeSingle();
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (!data) {
    console.log("No store found with ID 1841");
    return;
  }
  
  console.log("Store found:", data.ten_sieu_thi);
  const lines = data.ycx_data.split('\n');
  const headers = lines[0].split('\t');
  console.log("Headers:", headers.map((h, i) => `${i}: ${h}`).join(', '));
  
  console.log("--- Rows matching GN-05 ---");
  lines.forEach((line, index) => {
    if (line.includes('GN-05')) {
      console.log(`Line ${index}:`, line.split('\t').map((c, i) => `${headers[i] || i}: ${c}`).join(' | '));
    }
  });
}

checkData();
