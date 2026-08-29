const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('store')
    .select('*')
    .eq('id', 'TNB_LEADER_DATA')
    .single();

  if (error) {
    console.error('Supabase Error:', error);
    process.exit(1);
  }

  const sheetUrl = data.sticker_lk_price_data;
  console.log('Sheet URL:', sheetUrl);

  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    console.error('Could not extract sheet ID from:', sheetUrl);
    process.exit(1);
  }
  const sheetId = match[1];
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('data SIÊU THỊ')}`;
  
  const response = await fetch(csvUrl);
  if (!response.ok) {
    console.error('Failed to fetch CSV:', response.statusText);
    process.exit(1);
  }

  const csvText = await response.text();
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const parsed = csvText.split('\n').filter(l => l.trim()).map(line => parseCSVLine(line).map(cell => cell.trim()));
  const headers = parsed[0];
  const allData = parsed.slice(1);

  // Column letters to indices:
  // B = 1 (Tỉnh)
  // C = 2 (Siêu thị)
  // D = 3 (Luỹ Kế)
  // E = 4 (Target)
  // F = 5 (Kênh)
  // G = 6 (BOSS)
  // H = 7 (%HT)
  // K = 10 (Siêu thị)
  // L = 11 (Kênh)
  // M = 12 (BOSS)
  // R = 17 (Ngành Hàng)

  const rows = allData.filter(row => {
    const boss = (row[12] || '').trim();
    const nganhHang = (row[17] || '').trim().toUpperCase();
    return (boss.includes('Nam_15651') || boss.includes('Hà_24473')) && nganhHang.includes('TRẢ CHẬM');
  });

  console.log('\nMatching Rows in CSV:');
  rows.forEach(row => {
    console.log({
      Tinh: row[1],
      SieuThi: row[10],
      LuyKe: row[3],
      Target: row[4],
      Kenh: row[11],
      Boss: row[12],
      NganhHang: row[17]
    });
  });
}

run().catch(console.error);
