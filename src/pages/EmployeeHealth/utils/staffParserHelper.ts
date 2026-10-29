/**
 * Staff Name & ID Parser Utility
 * Handles both "ID - NAME" and "NAME - ID" formats, multiple dashes (-, –, —),
 * and accurately isolates employee ID (4-8 digits) from full name.
 */

export const excludedKeywords = [
  'bp all in one', 'bp trưởng ca', 'bp truong ca', 'hỗ trợ bi', 'ho tro bi',
  'copyright', 'dashboard', 'bc ', 'hd sử dụng', 'hd su dung', 'trang chủ',
  'trang chu', 'báo cáo', 'bao cao', 'khối kinh doanh', 'khoi kinh doanh',
  'logo bi', 'avatar', 'phòng ban', 'phong ban',
  'copy all', 'copy', 'sao chép', 'sao chep', 'xuat excel', 'xuất excel',
  'download', 'tải về', 'tai ve', 'export', 'select all', 'copy all row', 'copy all data',
  'online - online', '18001060', '18001061', '1900232461', 'administrator',
  'hạng trong st', 'hang trong st', 'top/bottom st', 'top/bottom'
];

/**
 * Checks if a string represents an action button, command, store code, online hotline, or non-staff text
 * like "(⚡ COPY ALL)", "online - Online - 18001060", "TỔNG", etc.
 */
export const isNonStaffName = (rawStr: string): boolean => {
  if (!rawStr) return false;
  const s = rawStr.trim().toLowerCase();
  if (!s) return false;

  // Reject online virtual account / hotline rows & store codes
  if (
    s === 'online' ||
    /^online\s*[-–—/|]/i.test(s) ||
    /[-–—/|]\s*online(\s*[-–—/|]|$)/i.test(s) ||
    /\b1800\d{4}\b/.test(s) ||
    /\b1900\d{4,6}\b/.test(s) ||
    /\b(đml|dml|đmx|dmx|tgdđ|tgdd|bhx|đms|dms)_/i.test(s) ||
    /^tổng(\s|$|\t|\|)/i.test(s) ||
    /^tong(\s|$|\t|\|)/i.test(s)
  ) {
    return true;
  }

  // Clean special symbols, emojis (like ⚡), brackets, parentheses, quotes
  const clean = s.replace(/[⚡\(\)\[\]\{\}\*'"\-–—_\/\\#@!|]/g, ' ').replace(/\s+/g, ' ').trim();

  if (
    clean === 'copy all' ||
    clean === 'copy' ||
    clean === 'all' ||
    clean === 'online' ||
    clean === 'online online' ||
    clean.startsWith('online online ') ||
    clean.includes('18001060') ||
    clean.includes('copy all') ||
    clean.startsWith('copy ') ||
    clean.endsWith(' copy') ||
    clean.includes('sao chép') ||
    clean.includes('sao chep') ||
    clean.includes('xuat excel') ||
    clean.includes('xuất excel') ||
    clean.includes('download') ||
    clean.includes('tải về') ||
    clean.includes('tai ve') ||
    clean.includes('export') ||
    clean === 'tổng' ||
    clean === 'tong' ||
    clean === 'tổng cộng' ||
    clean === 'tong cong' ||
    clean === 'total' ||
    clean === 'stt' ||
    clean === 'nhan vien' ||
    clean === 'nhân viên' ||
    clean === 'doanh thu' ||
    clean === 'so luong' ||
    clean === 'số lượng' ||
    clean === 'hang trong st' ||
    clean === 'hạng trong st' ||
    clean === 'top bottom st' ||
    clean === 'top bottom' ||
    clean === 'top' ||
    clean === 'bottom' ||
    s.includes('copy all') ||
    s.includes('copy')
  ) {
    return true;
  }

  return excludedKeywords.some(ex => s.includes(ex));
};

/**
 * Checks whether a string looks like an employee name/ID cell ("191664 - Phạm Văn Đại" or "Phạm Văn Đại - 191664").
 */
export const isEmpNameStr = (str: string): boolean => {
  if (!str) return false;
  const s = str.trim();
  if (!s) return false;
  if (isNonStaffName(s)) return false;

  // Reject category headers prefixed with month/period codes like "T10 - PANASONIC", "T09 - T10 IPHONE..."
  if (/^T\d{1,2}\s*[-–—]/i.test(s)) return false;

  const lower = s.toLowerCase();
  if (excludedKeywords.some(ex => lower.includes(ex))) return false;

  // Must match "ID - Name" or "Name - ID" where ID is 3-8 digits and Name has letters
  const idFirstMatch = s.match(/^(\d{3,8})\s*[-–—]\s*(.+)$/);
  if (idFirstMatch) {
    const namePart = idFirstMatch[2].trim();
    if (isNonStaffName(namePart) || /^T\d{1,2}\b/i.test(namePart)) return false;
    const letters = namePart.match(/[a-zA-ZÀ-ỹ]/g);
    return !!letters && letters.length >= 2;
  }

  const idLastMatch = s.match(/^(.+?)\s*[-–—]\s*(\d{3,8})$/);
  if (idLastMatch) {
    const namePart = idLastMatch[1].trim();
    if (isNonStaffName(namePart) || /^T\d{1,2}\b/i.test(namePart)) return false;
    const letters = namePart.match(/[a-zA-ZÀ-ỹ]/g);
    return !!letters && letters.length >= 2;
  }

  return false;
};

/**
 * Accurately extracts { name, id, shortName } regardless of order (ID - Name vs Name - ID)
 * and regardless of dash types (-, –, —, /, |).
 */
export const extractStaffNameAndId = (rawStr: string): { name: string; id: string; shortName: string } => {
  if (!rawStr || isNonStaffName(rawStr)) return { name: '', id: '', shortName: '' };

  // Strip any accidental trailing columns separated by tab or pipe
  const firstCol = rawStr.split(/\t|\|/)[0]?.trim() || rawStr.trim();
  if (!firstCol || isNonStaffName(firstCol)) return { name: '', id: '', shortName: '' };

  const str = firstCol;

  // Find employee code: 3 to 8 consecutive digits
  const idMatch = str.match(/\b\d{3,8}\b/);
  let id = idMatch ? idMatch[0] : '';
  let name = '';

  if (id) {
    // Remove the ID and any surrounding separators
    name = str
      .replace(id, '')
      .replace(/^[-–—\s/|:;]+|[-–—\s/|:;]+$/g, '')
      .trim();
  } else {
    // Fallback: split by common delimiters
    const parts = str.split(/[-–—/|]/).map(s => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (/^\d+$/.test(parts[0])) {
        id = parts[0];
        name = parts[1];
      } else {
        name = parts[0];
        id = parts[1];
      }
    } else {
      name = str;
      id = '';
    }
  }

  // Clean any residual punctuation in the name
  name = name.replace(/^[-–—\s/|:;]+|[-–—\s/|:;]+$/g, '').trim();

  if (isNonStaffName(name)) {
    return { name: '', id: '', shortName: '' };
  }

  const nameWords = name.split(/\s+/).filter(Boolean);
  const shortName = nameWords.length > 0 ? nameWords[nameWords.length - 1].toUpperCase() : '';

  return { name, id, shortName };
};
