const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('store')
    .select('id, warehouse_code, ten_sieu_thi, ycx_data')
    .ilike('id', '%1841%');

  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No store found matching 1841');
    const { data: allStores } = await supabase.from('store').select('id, warehouse_code, ten_sieu_thi').limit(20);
    console.log('All stores in DB:', allStores);
    return;
  }

  const store = data[0];
  console.log('ID:', store.id);
  console.log('Warehouse code:', store.warehouse_code);
  console.log('Name:', store.ten_sieu_thi);

  if (!store.ycx_data) {
    console.log('ycx_data is empty!');
    return;
  }

  const lines = store.ycx_data.split('\n').filter(l => l.trim());
  console.log('Total lines in ycx_data:', lines.length);

  const headers = lines[0].split('\t');
  console.log('Headers:');
  headers.forEach((h, i) => {
    console.log(`  Col ${i}: "${h}"`);
  });

  console.log('\nMatching rows for 4150:');
  lines.forEach((line, idx) => {
    if (line.includes('4150')) {
      const cells = line.split('\t');
      console.log(`Row ${idx}:`);
      cells.forEach((cell, i) => {
        console.log(`  Col ${i} (${headers[i] || '?'}) : "${cell}"`);
      });
    }
  });
}

check();
