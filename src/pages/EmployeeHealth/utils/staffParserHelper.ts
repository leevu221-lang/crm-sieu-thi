/**
 * Staff Name & ID Parser Utility
 * Handles both "ID - NAME" and "NAME - ID" formats, multiple dashes (-, –, —),
 * and accurately isolates employee ID (4-8 digits) from full name.
 */

export const excludedKeywords = [
  'bp all in one', 'bp trưởng ca', 'bp truong ca', 'hỗ trợ bi', 'ho tro bi',
  'copyright', 'dashboard', 'bc ', 'hd sử dụng', 'hd su dung', 'trang chủ',
  'trang chu', 'báo cáo', 'bao cao', 'khối kinh doanh', 'khoi kinh doanh',
  'logo bi', 'avatar', 'phòng ban', 'phong ban'
];

/**
 * Checks whether a string looks like an employee name/ID column or row.
 */
export const isEmpNameStr = (str: string): boolean => {
  if (!str) return false;
  const lower = str.toLowerCase();
  if (excludedKeywords.some(ex => lower.includes(ex))) return false;
  return /[-–—]\s*\d{4,8}\b/.test(str) || /\b\d{4,8}\s*[-–—]/.test(str) || (str.includes(' - ') && /\d/.test(str));
};

/**
 * Accurately extracts { name, id, shortName } regardless of order (ID - Name vs Name - ID)
 * and regardless of dash types (-, –, —, /, |).
 */
export const extractStaffNameAndId = (rawStr: string): { name: string; id: string; shortName: string } => {
  if (!rawStr) return { name: '', id: '', shortName: '' };

  const str = rawStr.trim();

  // Find employee code: 4 to 8 consecutive digits
  const idMatch = str.match(/\b\d{4,8}\b/);
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

  const nameWords = name.split(/\s+/).filter(Boolean);
  const shortName = nameWords.length > 0 ? nameWords[nameWords.length - 1].toUpperCase() : '';

  return { name, id, shortName };
};
