import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkData() {
  const { data, error } = await supabase.from('store_luyke').select('warehouse_code, ten_sieu_thi').limit(10);
  console.log("DB Luyke stores:", data);
  
  const { data: rtData } = await supabase.from('store_luyke').select('warehouse_code, ten_sieu_thi').limit(10);
  console.log("DB Realtime stores:", rtData);
}

checkData();
