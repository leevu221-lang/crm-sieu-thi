
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function generateJson() {
  const { data, error } = await supabase
    .from('store_luyke')
    .select('lk_td_nv')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  const raw = data.lk_td_nv;
  const lines = raw.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  // Find categories: lines between "Phòng ban" and the first line starting with "DTLK" or "SLLK"
  let categories: string[] = [];
  let headerStartIdx = -1;
  let dataStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === 'Phòng ban') {
      headerStartIdx = i;
      continue;
    }
    if (headerStartIdx !== -1 && (lines[i].startsWith('DTLK') || lines[i].startsWith('SLLK'))) {
      dataStartIdx = i + 1;
      break;
    }
    if (headerStartIdx !== -1) {
      categories.push(lines[i]);
    }
  }

  console.error('Categories:', categories);

  const results = [];
  const excludedKeywords = ['Tổng', 'BP All In One', 'BP Trưởng Ca', 'Hỗ trợ BI', 'Copyright', 'Dashboard', 'BC ', 'HD sử dụng', 'Trang chủ', 'Báo cáo', 'Khối kinh doanh', 'Logo BI', 'avatar'];

  const dataLines = lines.slice(dataStartIdx);

  for (const line of dataLines) {
    const parts = line.split('\t').map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    console.error('Line parts:', parts);
    const namePart = parts[0];
    
    if (!namePart) continue;
    if (excludedKeywords.some((ex: string) => namePart.includes(ex))) continue;

    // Check if it's a valid employee line (contains " - " and an ID)
    const nameIdParts = namePart.split(' - ').map((s: string) => s.trim());
    if (nameIdParts.length < 2) continue;
    
    const name = nameIdParts[0];
    const id = nameIdParts[1];
    
    // The values start from parts[1]
    const values = parts.slice(1).map((v: string) => {
      const clean = v.replace(/,/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    });

    const employeeData = {
      ten_nhan_vien: name,
      ma_nhan_vien: id,
      data: categories.map((cat, idx) => ({
        ten_nganh_hang: cat,
        gia_tri: values[idx] ?? 0
      }))
    };
    results.push(employeeData);
  }

  process.stdout.write(JSON.stringify(results, null, 2));
}

generateJson();
