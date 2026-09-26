/**
 * Service trích xuất và đồng bộ dữ liệu Phiếu Mua Hàng (PMH) từ Google Sheet "PMH2"
 * Hỗ trợ lọc tự động theo danh sách MSNV / User (mặc định: 43751, 7721)
 */

export interface PMHRecord {
  id: string;
  userId: string;
  userRaw: string;
  pmhType: string;
  pmhCode: string;
  isError: boolean;
  statusText: string;
  rawText: string;
}

export const DEFAULT_PMH_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/17rloLx_U9GhO_QNdpfhsMNEzKnMzCVli9sieVRlmKDU/edit?usp=sharing';

/**
 * Trích xuất Sheet ID từ URL Google Sheets
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Lấy và phân tích dữ liệu sheet "PMH2" từ Google Sheets theo User
 * @param sheetUrl Link Google Sheet (mặc định link sheet PMH2)
 * @param targetUsers Mảng các user/MSNV cần lấy (mặc định: ['43751', '7721'])
 */
export async function fetchPMH2ByUsers(
  sheetUrl: string = DEFAULT_PMH_SHEET_URL,
  targetUsers: string[] = ['43751', '7721']
): Promise<PMHRecord[]> {
  const sheetId = extractSpreadsheetId(sheetUrl);
  if (!sheetId) {
    throw new Error('Link Google Sheet không hợp lệ hoặc không tìm thấy Sheet ID.');
  }

  // URL xuất CSV từ Google Sheets GVIZ API
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    'PMH2'
  )}`;

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Không thể kết nối đến Google Sheets (Mã lỗi: ${response.status}). Vui lòng kiểm tra quyền chia sẻ.`);
  }

  const csvText = await response.text();
  const rawLines = csvText
    .split('\n')
    .map(line => {
      let cleaned = line.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1).replace(/""/g, '"');
      }
      return cleaned.trim();
    })
    .filter(line => line.length > 0 && !line.startsWith('/*') && !line.startsWith('Title:'));

  const records: PMHRecord[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const currentLine = rawLines[i];
    
    // Kiểm tra dòng hiện tại có chứa MSNV/User mục tiêu hay không
    const matchedUser = targetUsers.find(u => currentLine.includes(u));
    if (matchedUser) {
      let pmhLine = '';
      
      // Quét tìm dòng kết quả PMH kế tiếp (thường bắt đầu bằng ➜ hoặc chứa PMH)
      for (let j = 1; j <= 2 && i + j < rawLines.length; j++) {
        const next = rawLines[i + j];
        if (next.includes('PMH') || next.includes('➜') || next.includes('❌')) {
          pmhLine = next;
          break;
        }
      }

      const isError =
        pmhLine.includes('❌') ||
        pmhLine.toLowerCase().includes('đã hết') ||
        pmhLine.toLowerCase().includes('không tồn tại') ||
        pmhLine.toLowerCase().includes('sai');

      let pmhType = '';
      let pmhCode = '';
      let statusText = isError ? 'Thất bại' : 'Thành công';

      // Tìm loại PMH và Mã code (Ví dụ: "➜ PMH MM200 : OXIL5VY5SA")
      const match = pmhLine.match(/(?:➜\s*)?(PMH\s*[^:]+)\s*:\s*([A-Za-z0-9]+)/i);
      if (match) {
        pmhType = match[1].trim();
        pmhCode = match[2].trim();
      } else if (isError) {
        statusText = pmhLine.replace(/^➜\s*/, '').trim();
      }

      records.push({
        id: `${matchedUser}_${i}`,
        userId: matchedUser,
        userRaw: currentLine,
        pmhType,
        pmhCode,
        isError,
        statusText,
        rawText: pmhLine
      });
    }
  }

  return records;
}
