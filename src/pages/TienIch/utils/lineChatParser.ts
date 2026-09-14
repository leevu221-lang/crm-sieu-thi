/**
 * LINE Chat Parser & Analysis Utility for House 1841
 * Processes raw exported LINE chat logs into structured daily interaction metrics.
 */

export interface LineRawMessage {
  date: string; // "05/04/2026"
  dayOfWeek: string; // "CN", "Th 2", etc.
  dateIso: string; // "2026-04-05" for sorting
  time: string; // "18:08"
  senderRaw: string;
  senderId: string; // "30653"
  senderName: string; // "Trần Minh Khắc"
  senderShortName: string; // "Khắc"
  senderRole: 'Quản lý' | 'Trưởng ca' | 'Nhân viên' | 'TĐKH' | 'Hãng/Khác';
  content: string;
  type: 'image' | 'sticker' | 'video' | 'file' | 'text';
}

export interface EmployeeInteractionStats {
  id: string;
  name: string; // Exact LINE display name
  lineDisplayName: string; // Exact LINE display name
  realName: string; // Full real name
  shortName: string;
  role: 'Quản lý' | 'Trưởng ca' | 'Nhân viên' | 'TĐKH' | 'Hãng/Khác';
  avatarBg: string;
  originalNames: string[];
  totalInteractions: number;
  textCount: number;
  imageCount: number;
  stickerCount: number;
  otherCount: number;
  dailyCounts: Record<string, number>; // date "05/04/2026" -> count
  activeDaysCount: number;
  avgPerActiveDay: number;
  avgPerTotalDays: number;
  peakDay: { date: string; count: number } | null;
}

export interface LineChatDateInfo {
  date: string; // "05/04/2026"
  dateIso: string; // "2026-04-05"
  dayOfWeek: string; // "CN", "Th 2", ...
  monthStr: string; // "04/2026"
  totalInteractions: number;
}

export interface LineChatAnalysisResult {
  groupName: string;
  exportDate: string;
  totalMessages: number;
  dates: LineChatDateInfo[];
  months: string[]; // ["04/2026", "05/2026", ...]
  employees: EmployeeInteractionStats[];
  dailyStoreTotals: Record<string, number>; // date -> total messages
  peakStoreDay: { date: string; count: number } | null;
  overallTopStaff: EmployeeInteractionStats | null;
  messages: LineRawMessage[];
}

export const HOUSE_1841_STAFF_MAP: Record<string, { fullName: string; shortName: string; role: 'Quản lý' | 'Trưởng ca' | 'Nhân viên' | 'TĐKH' | 'Hãng/Khác'; avatarBg: string }> = {
  '30653': { fullName: 'Trần Minh Khắc', shortName: 'Khắc', role: 'Quản lý', avatarBg: 'bg-emerald-100 text-emerald-800' },
  '43751': { fullName: 'Vũ Linh', shortName: 'Linh', role: 'Trưởng ca', avatarBg: 'bg-blue-100 text-blue-800' },
  '7721':  { fullName: 'Nguyễn Thị Hoa', shortName: 'Hoa', role: 'Quản lý', avatarBg: 'bg-teal-100 text-teal-800' },
  '100544': { fullName: 'Trần Văn Duy', shortName: 'Duy', role: 'Nhân viên', avatarBg: 'bg-purple-100 text-purple-800' },
  '46944':  { fullName: 'Nguyễn Diễm My', shortName: 'Diễm My', role: 'Nhân viên', avatarBg: 'bg-rose-100 text-rose-800' },
  '191664': { fullName: 'Phạm Văn Đại', shortName: 'Đại', role: 'Nhân viên', avatarBg: 'bg-amber-100 text-amber-800' },
  '38847':  { fullName: 'Nguyễn Hùng Mạnh', shortName: 'Mạnh', role: 'Nhân viên', avatarBg: 'bg-indigo-100 text-indigo-800' },
  '58638':  { fullName: 'Phạm Ngọc Anh', shortName: 'Ngọc Anh', role: 'Nhân viên', avatarBg: 'bg-pink-100 text-pink-800' },
  '21964':  { fullName: 'Lâm Thị Như Ý', shortName: 'Như Ý', role: 'Nhân viên', avatarBg: 'bg-violet-100 text-violet-800' },
  '38834':  { fullName: 'Ngô Thị Bé Thắm', shortName: 'Bé Thắm', role: 'Nhân viên', avatarBg: 'bg-sky-100 text-sky-800' },
  '12803':  { fullName: 'Nguyễn Thị Nhạn', shortName: 'Nhạn', role: 'Nhân viên', avatarBg: 'bg-lime-100 text-lime-800' },
  '157597': { fullName: 'Nguyễn Tuấn Mi', shortName: 'Mi', role: 'Nhân viên', avatarBg: 'bg-fuchsia-100 text-fuchsia-800' },
  '59442':  { fullName: 'Lê Kim Mỹ', shortName: 'Kim Mỹ', role: 'Nhân viên', avatarBg: 'bg-orange-100 text-orange-800' },
  '97734':  { fullName: 'Huỳnh Hoàng Phúc', shortName: 'Hoàng Phúc', role: 'Nhân viên', avatarBg: 'bg-cyan-100 text-cyan-800' },
  '38849':  { fullName: 'Lê Văn Kỳ', shortName: 'Kỳ', role: 'Nhân viên', avatarBg: 'bg-emerald-100 text-emerald-800' },
  '58302':  { fullName: 'Nghĩa', shortName: 'Nghĩa', role: 'Nhân viên', avatarBg: 'bg-slate-100 text-slate-800' },
  '172130': { fullName: 'Hạnh', shortName: 'Hạnh', role: 'Nhân viên', avatarBg: 'bg-indigo-100 text-indigo-800' },
  '51909':  { fullName: 'Thanh Nhi', shortName: 'Nhi', role: 'Nhân viên', avatarBg: 'bg-rose-100 text-rose-800' },
  '71132':  { fullName: 'Thạch Vũ', shortName: 'Vũ', role: 'Nhân viên', avatarBg: 'bg-amber-100 text-amber-800' },
  '183611': { fullName: 'Linh (TĐKH)', shortName: 'Linh TĐKH', role: 'TĐKH', avatarBg: 'bg-slate-100 text-slate-800' },
  '187910': { fullName: 'Lên (TĐKH)', shortName: 'Lên TĐKH', role: 'TĐKH', avatarBg: 'bg-slate-100 text-slate-800' },
  '266798': { fullName: 'Ý ND', shortName: 'Ý ND', role: 'Hãng/Khác', avatarBg: 'bg-zinc-100 text-zinc-800' },
  'mutosi_pg': { fullName: 'Hi (Mutosi PG)', shortName: 'Hi Mutosi', role: 'Hãng/Khác', avatarBg: 'bg-yellow-100 text-yellow-800' },
  'duoc_user': { fullName: 'Được (User)', shortName: 'Được', role: 'Hãng/Khác', avatarBg: 'bg-zinc-100 text-zinc-800' }
};

export const SENDER_ALIASES: Record<string, string> = {
  '.': '97734',
  'ĐMNTT_Phúc-97734': '97734',
  'ĐMNTT_Hi_Mutosi': 'mutosi_pg',
  'ĐMNTT_Được_User': 'duoc_user'
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'
};

/**
 * Normalizes raw sender string to clean Employee ID and Profile
 */
export function resolveSenderProfile(rawSender: string): {
  id: string;
  name: string;
  shortName: string;
  role: 'Quản lý' | 'Trưởng ca' | 'Nhân viên' | 'TĐKH' | 'Hãng/Khác';
  avatarBg: string;
} {
  const clean = rawSender.replace(/[\u200B-\u200D\u2060-\u206F\uFEFF\u200E\u200F]/g, '').trim();

  // Alias lookup
  if (SENDER_ALIASES[clean]) {
    const aliasedId = SENDER_ALIASES[clean];
    if (HOUSE_1841_STAFF_MAP[aliasedId]) {
      return {
        id: aliasedId,
        ...HOUSE_1841_STAFF_MAP[aliasedId]
      };
    }
  }

  // Convert superscripts (e.g., ¹⁷²¹³⁰ -> 172130)
  const normalDigits = clean.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, d => SUPERSCRIPT_MAP[d] || d);

  // Extract ID (4-8 consecutive digits)
  const idMatch = normalDigits.match(/(\d{4,8})/);
  const id = idMatch ? idMatch[1] : '';

  if (id && HOUSE_1841_STAFF_MAP[id]) {
    return {
      id,
      ...HOUSE_1841_STAFF_MAP[id]
    };
  }

  // Fallback for unknown senders
  let name = normalDigits;
  name = name.replace(/^(CMA|ĐMNTT|ĐMTV|ĐMNQ|ĐMTL|BL|ND|ĐML)[_-]/i, '');
  if (id) name = name.replace(id, '');
  name = name.replace(/[-_–—/|]/g, ' ');
  name = name.replace(/(TC|BOSS|TĐKH|TDKH|AIO|Mutosi|User|🌤️|✈️|💤|⚽️|Ⓢ|🅢|𝘽)/gi, '');
  name = name.replace(/\s+/g, ' ').trim();

  const shortName = name.split(/\s+/).pop()?.toUpperCase() || clean;
  const role: 'Quản lý' | 'Trưởng ca' | 'Nhân viên' | 'TĐKH' | 'Hãng/Khác' = 
    clean.toUpperCase().includes('BOSS') || clean.toUpperCase().includes('QL') ? 'Quản lý' :
    clean.toUpperCase().includes('TC') ? 'Trưởng ca' :
    clean.toUpperCase().includes('TĐKH') || clean.toUpperCase().includes('TDKH') ? 'TĐKH' : 'Nhân viên';

  const avatarBg = 
    role === 'Quản lý' ? 'bg-emerald-100 text-emerald-800' :
    role === 'Trưởng ca' ? 'bg-blue-100 text-blue-800' :
    'bg-purple-100 text-purple-800';

  return {
    id: id || clean,
    name: name || clean,
    shortName,
    role,
    avatarBg
  };
}

/**
 * Converts date string "DD/MM/YYYY" to ISO "YYYY-MM-DD"
 */
export function toIsoDate(dmy: string): string {
  const parts = dmy.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dmy;
}

/**
 * Main parser function: converts raw LINE chat text into analysis result
 */
export function parseLineChatData(rawText: string): LineChatAnalysisResult {
  if (!rawText || !rawText.trim()) {
    return {
      groupName: '',
      exportDate: '',
      totalMessages: 0,
      dates: [],
      months: [],
      employees: [],
      dailyStoreTotals: {},
      peakStoreDay: null,
      overallTopStaff: null,
      messages: []
    };
  }

  const lines = rawText.split(/\r?\n/);
  let groupName = '1.House 1841 ĐML_CMA_CMA - 155A Nguyễn Tất Thành';
  let exportDate = '';

  let currentDate = '';
  let currentDayOfWeek = '';
  const messages: LineRawMessage[] = [];

  const dateRegex = /^(CN|Th\s*\d+),\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
  const msgRegex = /^(\d{1,2}:\d{2})\t([^\t\n]*)\t(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('[LINE] Lịch sử trò chuyện với nhóm')) {
      groupName = line.replace('[LINE] Lịch sử trò chuyện với nhóm', '').trim();
      continue;
    }
    if (line.startsWith('Ngày lưu:')) {
      exportDate = line.replace('Ngày lưu:', '').trim();
      continue;
    }

    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      currentDayOfWeek = dateMatch[1].trim();
      // Ensure date is formatted with 2-digit day and month: DD/MM/YYYY
      const rawDateStr = dateMatch[2].trim();
      const p = rawDateStr.split('/');
      currentDate = `${p[0].padStart(2, '0')}/${p[1].padStart(2, '0')}/${p[2]}`;
      continue;
    }

    const msgMatch = line.match(msgRegex);
    if (msgMatch && currentDate) {
      const time = msgMatch[1];
      let sender = msgMatch[2].trim();
      const content = msgMatch[3];

      sender = sender.replace(/[\u200B-\u200D\u2060-\u206F\uFEFF\u200E\u200F]/g, '').trim();

      // Skip system notifications without sender
      if (!sender) continue;

      let msgType: 'image' | 'sticker' | 'video' | 'file' | 'text' = 'text';
      if (content.includes('[Ảnh]')) msgType = 'image';
      else if (content.includes('[Sticker]')) msgType = 'sticker';
      else if (content.includes('[Video]')) msgType = 'video';
      else if (content.includes('[File]')) msgType = 'file';

      const profile = resolveSenderProfile(sender);

      messages.push({
        date: currentDate,
        dayOfWeek: currentDayOfWeek,
        dateIso: toIsoDate(currentDate),
        time,
        senderRaw: sender,
        senderId: profile.id,
        senderName: profile.name,
        senderShortName: profile.shortName,
        senderRole: profile.role,
        content,
        type: msgType
      });
    }
  }

  // Aggregate by Employee and by Date
  const employeeMap = new Map<string, EmployeeInteractionStats>();
  const dailyStoreTotals: Record<string, number> = {};
  const dateInfoMap = new Map<string, LineChatDateInfo>();
  const monthsSet = new Set<string>();

  for (const msg of messages) {
    const { date, dateIso, dayOfWeek, senderId, senderName, senderShortName, senderRole, senderRaw, type } = msg;

    // Daily totals
    dailyStoreTotals[date] = (dailyStoreTotals[date] || 0) + 1;

    // Date metadata
    if (!dateInfoMap.has(date)) {
      const parts = date.split('/');
      const monthStr = parts.length === 3 ? `${parts[1]}/${parts[2]}` : '';
      if (monthStr) monthsSet.add(monthStr);

      dateInfoMap.set(date, {
        date,
        dateIso,
        dayOfWeek,
        monthStr,
        totalInteractions: 0
      });
    }
    dateInfoMap.get(date)!.totalInteractions += 1;

    // Employee stats
    if (!employeeMap.has(senderId)) {
      const knownProfile = HOUSE_1841_STAFF_MAP[senderId];
      employeeMap.set(senderId, {
        id: senderId,
        name: senderRaw, // Exact LINE display name
        lineDisplayName: senderRaw,
        realName: knownProfile ? knownProfile.fullName : senderName,
        shortName: knownProfile ? knownProfile.shortName : senderShortName,
        role: knownProfile ? knownProfile.role : senderRole,
        avatarBg: knownProfile ? knownProfile.avatarBg : 'bg-purple-100 text-purple-800',
        originalNames: [senderRaw],
        totalInteractions: 0,
        textCount: 0,
        imageCount: 0,
        stickerCount: 0,
        otherCount: 0,
        dailyCounts: {},
        activeDaysCount: 0,
        avgPerActiveDay: 0,
        avgPerTotalDays: 0,
        peakDay: null
      });
    }

    const emp = employeeMap.get(senderId)!;
    if (!emp.originalNames.includes(senderRaw)) {
      emp.originalNames.push(senderRaw);
    }
    // Prefer longer / more descriptive LINE nickname (e.g. 'ĐMNTT_Phúc-97734' over '.')
    if (senderRaw !== '.' && (emp.lineDisplayName === '.' || senderRaw.length > emp.lineDisplayName.length)) {
      emp.lineDisplayName = senderRaw;
      emp.name = senderRaw;
    }
    emp.totalInteractions += 1;
    if (type === 'image') emp.imageCount += 1;
    else if (type === 'sticker') emp.stickerCount += 1;
    else if (type === 'video' || type === 'file') emp.otherCount += 1;
    else emp.textCount += 1;

    emp.dailyCounts[date] = (emp.dailyCounts[date] || 0) + 1;
  }

  // Sort dates chronologically
  const dates = Array.from(dateInfoMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  const totalDaysCount = dates.length || 1;

  // Calculate averages, peaks, and active days for each employee
  const employees = Array.from(employeeMap.values()).map(emp => {
    const activeDays = Object.keys(emp.dailyCounts).length;
    emp.activeDaysCount = activeDays;
    emp.avgPerActiveDay = activeDays > 0 ? Math.round((emp.totalInteractions / activeDays) * 10) / 10 : 0;
    emp.avgPerTotalDays = Math.round((emp.totalInteractions / totalDaysCount) * 10) / 10;

    let peakDay: { date: string; count: number } | null = null;
    for (const [d, count] of Object.entries(emp.dailyCounts)) {
      if (!peakDay || count > peakDay.count) {
        peakDay = { date: d, count };
      }
    }
    emp.peakDay = peakDay;
    return emp;
  });

  // Sort employees by total interactions descending by default
  employees.sort((a, b) => b.totalInteractions - a.totalInteractions);

  // Determine store peak day
  let peakStoreDay: { date: string; count: number } | null = null;
  for (const d of dates) {
    if (!peakStoreDay || d.totalInteractions > peakStoreDay.count) {
      peakStoreDay = { date: d.date, count: d.totalInteractions };
    }
  }

  const months = Array.from(monthsSet).sort((a, b) => {
    const [m1, y1] = a.split('/').map(Number);
    const [m2, y2] = b.split('/').map(Number);
    return y1 === y2 ? m1 - m2 : y1 - y2;
  });

  return {
    groupName,
    exportDate,
    totalMessages: messages.length,
    dates,
    months,
    employees,
    dailyStoreTotals,
    peakStoreDay,
    overallTopStaff: employees.length > 0 ? employees[0] : null,
    messages
  };
}
