import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('users').insert([{
    username: 'test_user_' + Date.now(),
    ma_kho: 'TEST',
    password: '123',
    role: 'user',
    created_at: new Date().toISOString()
  }]);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
