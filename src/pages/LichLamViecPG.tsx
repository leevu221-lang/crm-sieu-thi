import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Plus, Trash2, Save, Edit3, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, ArrowLeftRight, Camera, Download, Copy, Check, Lock, Unlock, History, Search, Filter, ArrowRight, ArrowDown, Sparkles, Clock, User, Share2, Store, FileSpreadsheet, ClipboardPaste, AlertCircle, Sun, Moon, XCircle, PhoneCall, FileText, Users } from 'lucide-react';
import { doc, onSnapshot, setDoc, runTransaction, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/StoreContext';
import * as htmlToImage from 'html-to-image';
import { ensureFontsReady, EXPORT_FONT_STYLE } from '../utils/fontExportUtil';
import { buildGuestShareUrl } from '../constants/routes';
import { normalizeStoreId, isValidStoreName, removeAccents } from './RTST/utils';



// ─── Types ───────────────────────────────────────────────────────────────────
type ShiftType = string;
type CategoryType = 'ICT' | 'DTDLGD';

interface PGInfo {
  id: string;
  tenPgHang: string;
  sdtSup: string;
  note: string;
  category: CategoryType;
}

interface WeekShiftData {
  shifts: ShiftType[];   // 7 slots: Mon-Sun
}

interface PGChangeDetail {
  type: 'shift' | 'name' | 'note' | 'sdt' | 'add_pg' | 'remove_pg' | 'reorder';
  pgName: string;
  category: CategoryType;
  week?: number;
  dayIndex?: number;
  dayLabel?: string;
  oldValue: string;
  newValue: string;
  description: string;
}

interface PGHistoryRecord {
  id: string;
  timestamp: string;
  userName: string;
  changes: PGChangeDetail[];
}

// All weeks share the same roster; per-week data is just shifts
interface MonthDoc {
  ictRoster: PGInfo[];
  dtdlgdRoster: PGInfo[];
  weekData: Record<string, Record<string, WeekShiftData>>;
  historyLogs?: PGHistoryRecord[];
  updatedAt?: string;
  updatedBy?: string;
}

// ─── Shift color mapping (Chuẩn theo mẫu tham chiếu 100%) ─────────────────────
const PRESET_COLORS: { bg: string; text: string; border: string }[] = [
  { bg: '#D9F7FF', text: '#0369A1', border: '#67E8F9' },   // cyan/sky (9H-20H)
  { bg: '#EDE3FF', text: '#6D28D9', border: '#C4B5FD' },   // violet
  { bg: '#D8FBE7', text: '#15803D', border: '#86EFAC' },   // emerald
  { bg: '#FFF0B8', text: '#B45309', border: '#FCD34D' },   // amber
  { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },   // pink
  { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },   // teal
  { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },   // orange
  { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },   // indigo
  { bg: '#ecfccb', text: '#4d7c0f', border: '#bef264' },   // lime
  { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },   // purple
];

const baseShiftStyles: Record<string, { bg: string; text: string; border: string }> = {
  'Ca sáng':   { bg: '#D8FBE7', text: '#15803D', border: '#86EFAC' },
  'Ca Chiều':  { bg: '#EDE3FF', text: '#6D28D9', border: '#C4B5FD' },
  'Ca Gãy':    { bg: '#FFF0B8', text: '#B45309', border: '#FCD34D' },
  'OFF':       { bg: '#FFE1E1', text: '#DC2626', border: '#FCA5A5' },
  'ST khác':   { bg: '#D9F7FF', text: '#0369A1', border: '#67E8F9' },
  'Ca Full':   { bg: '#D9F7FF', text: '#0369A1', border: '#67E8F9' },
  '9H-20H':    { bg: '#D9F7FF', text: '#0369A1', border: '#67E8F9' },
  'KHO':       { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  'Kho':       { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  'TN':        { bg: '#EDE3FF', text: '#6D28D9', border: '#C4B5FD' },
  'HC':        { bg: '#D9F7FF', text: '#0369A1', border: '#67E8F9' },
  '':          { bg: '#f8fafc', text: '#94a3b8', border: '#D7E2EE' },
};

const BASE_SHIFTS: string[] = ['Ca sáng', 'Ca Chiều', 'Ca Gãy', 'OFF', 'ST khác'];

function getShiftStyle(name: string, customShifts: string[]): { bg: string; text: string; border: string } {
  const trimmed = (name || '').trim();
  if (baseShiftStyles[trimmed]) return baseShiftStyles[trimmed];

  const baseKey = Object.keys(baseShiftStyles).find(k => k.toLowerCase() === trimmed.toLowerCase());
  if (baseKey) return baseShiftStyles[baseKey];

  // Time range shifts like 9H-20H, 8H-18H, etc. default to the light cyan badge from reference
  if (/\d+\s*[hH]/.test(trimmed)) {
    return { bg: '#D9F7FF', text: '#0369A1', border: '#67E8F9' };
  }

  const idx = customShifts.findIndex(s => s.trim().toLowerCase() === trimmed.toLowerCase());
  if (idx >= 0) return PRESET_COLORS[idx % PRESET_COLORS.length];
  return baseShiftStyles[''];
}

const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DAY_NAMES = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// ─── Date utilities ──────────────────────────────────────────────────────────
function getWeeksOfMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const day = firstDay.getDay(); // 0: Sun, 1: Mon, ...

  let startMon = new Date(year, month, 1);
  if (day === 1) {
    startMon = new Date(year, month, 1);
  } else if (day >= 2 && day <= 4) {
    // 1st is Tue, Wed, Thu -> start on previous Monday
    startMon.setDate(firstDay.getDate() - (day - 1));
  } else {
    // 1st is Fri, Sat, Sun (day === 5, 6, 0) -> start on next Monday
    const daysToAdd = day === 0 ? 1 : (8 - day);
    startMon.setDate(firstDay.getDate() + daysToAdd);
  }

  const weeks: { dates: Date[] }[] = [];
  let cur = new Date(startMon);
  for (let w = 0; w < 5; w++) {
    const dates: Date[] = [];
    for (let d = 0; d < 7; d++) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push({ dates });
  }
  return weeks;
}

function fmtDate(d: Date) { return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; }
function dayName(d: Date) { return DAY_NAMES[d.getDay()]; }

function getPrevMonthInfo(year: number, month: number) {
  const prevM = month === 0 ? 11 : month - 1;
  const prevY = month === 0 ? year - 1 : year;
  return { year: prevY, month: prevM, monthKey: `${prevY}-${String(prevM + 1).padStart(2, '0')}` };
}

function getNextMonthInfo(year: number, month: number) {
  const nextM = month === 11 ? 0 : month + 1;
  const nextY = month === 11 ? year + 1 : year;
  return { year: nextY, month: nextM, monthKey: `${nextY}-${String(nextM + 1).padStart(2, '0')}` };
}

function areWeeksMatching(datesA?: Date[], datesB?: Date[]) {
  if (!datesA || !datesB || datesA.length !== 7 || datesB.length !== 7) return false;
  return fmtDate(datesA[0]) === fmtDate(datesB[0]) && fmtDate(datesA[6]) === fmtDate(datesB[6]);
}

const emptyShifts = (): WeekShiftData => ({ shifts: ['', '', '', '', '', '', ''] });

function isPgMatch(rosterName: string, inputName: string): boolean {
  const a = removeAccents(rosterName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = removeAccents(inputName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function parseMonthKey(key: string): { year: number; month: number } {
  if (!key || !key.includes('-')) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  }
  const [yStr, mStr] = key.split('-');
  return { year: parseInt(yStr, 10), month: parseInt(mStr, 10) - 1 };
}

function applyCopyWeekShifts({
  sourceIctRoster,
  sourceDtdlgdRoster,
  sourceWeekShifts,
  targetIctRoster,
  targetDtdlgdRoster,
  targetExistingWeekData,
  targetWeekIndex,
  syncRoster,
  overwriteExisting,
}: {
  sourceIctRoster: PGInfo[];
  sourceDtdlgdRoster: PGInfo[];
  sourceWeekShifts: { ict?: Record<string, WeekShiftData>; dtdlgd?: Record<string, WeekShiftData> };
  targetIctRoster: PGInfo[];
  targetDtdlgdRoster: PGInfo[];
  targetExistingWeekData: Record<string, { ict: Record<string, WeekShiftData>; dtdlgd: Record<string, WeekShiftData> }>;
  targetWeekIndex: number | 'ALL';
  syncRoster: boolean;
  overwriteExisting: boolean;
}) {
  let updatedIctRoster = [...targetIctRoster];
  let updatedDtdlgdRoster = [...targetDtdlgdRoster];

  const findMatch = (roster: PGInfo[], srcPg: PGInfo) => {
    const byId = roster.find(r => r.id === srcPg.id);
    if (byId) return byId;
    const srcName = (srcPg.tenPgHang || '').trim().toLowerCase();
    const byName = roster.find(r => (r.tenPgHang || '').trim().toLowerCase() === srcName);
    if (byName) return byName;
    return roster.find(r => isPgMatch(r.tenPgHang, srcPg.tenPgHang));
  };

  const ictIdMap = new Map<string, string>();
  const dtdlgdIdMap = new Map<string, string>();

  sourceIctRoster.forEach(srcPg => {
    let match = findMatch(updatedIctRoster, srcPg);
    if (!match && syncRoster) {
      match = {
        ...srcPg,
        id: genId(),
      };
      updatedIctRoster.push(match);
    }
    if (match) {
      ictIdMap.set(srcPg.id, match.id);
    }
  });

  sourceDtdlgdRoster.forEach(srcPg => {
    let match = findMatch(updatedDtdlgdRoster, srcPg);
    if (!match && syncRoster) {
      match = {
        ...srcPg,
        id: genId(),
      };
      updatedDtdlgdRoster.push(match);
    }
    if (match) {
      dtdlgdIdMap.set(srcPg.id, match.id);
    }
  });

  const updatedWeekData: Record<string, { ict: Record<string, WeekShiftData>; dtdlgd: Record<string, WeekShiftData> }> = JSON.parse(
    JSON.stringify(targetExistingWeekData || {})
  );

  const targetWeekKeys = targetWeekIndex === 'ALL'
    ? [0, 1, 2, 3, 4].map(i => `week${i + 1}`)
    : [`week${targetWeekIndex + 1}`];

  targetWeekKeys.forEach(wKey => {
    const curWk = updatedWeekData[wKey] || { ict: {}, dtdlgd: {} };
    const curIct = { ...(curWk.ict || {}) };
    const curDtdlgd = { ...(curWk.dtdlgd || {}) };

    if (sourceWeekShifts?.ict) {
      Object.entries(sourceWeekShifts.ict).forEach(([srcPgId, shiftData]) => {
        const targetPgId = ictIdMap.get(srcPgId);
        if (targetPgId && shiftData?.shifts) {
          if (overwriteExisting || !curIct[targetPgId]?.shifts?.some(Boolean)) {
            curIct[targetPgId] = {
              shifts: [...shiftData.shifts]
            };
          }
        }
      });
    }

    if (sourceWeekShifts?.dtdlgd) {
      Object.entries(sourceWeekShifts.dtdlgd).forEach(([srcPgId, shiftData]) => {
        const targetPgId = dtdlgdIdMap.get(srcPgId);
        if (targetPgId && shiftData?.shifts) {
          if (overwriteExisting || !curDtdlgd[targetPgId]?.shifts?.some(Boolean)) {
            curDtdlgd[targetPgId] = {
              shifts: [...shiftData.shifts]
            };
          }
        }
      });
    }

    updatedWeekData[wKey] = {
      ict: curIct,
      dtdlgd: curDtdlgd,
    };
  });

  return {
    updatedIctRoster,
    updatedDtdlgdRoster,
    updatedWeekData,
  };
}

function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) return null;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        cleaned[k] = sanitizeForFirestore(v);
      }
    }
    return cleaned;
  }
  return data;
}

// ─── Multi-Device Differential 3-Way Merge Utilities ────────────────────────
interface DiffResult {
  changes: PGChangeDetail[];
  modifiedShifts: Array<{
    wkKey: string;
    category: 'ict' | 'dtdlgd';
    pgId: string;
    dayIndex: number;
    newVal: string;
  }>;
  addedIctPgs: PGInfo[];
  updatedIctPgs: PGInfo[];
  removedIctPgIds: Set<string>;
  isIctOrderChanged: boolean;
  currentIctOrder: string[];
  addedDtdlgdPgs: PGInfo[];
  updatedDtdlgdPgs: PGInfo[];
  removedDtdlgdPgIds: Set<string>;
  isDtdlgdOrderChanged: boolean;
  currentDtdlgdOrder: string[];
  addedCustomShifts: string[];
  removedCustomShifts: Set<string>;
}

function computeDiff(
  orig: {
    ictRoster: PGInfo[];
    dtdlgdRoster: PGInfo[];
    weekData: any;
    customShifts: string[];
  },
  current: {
    ictRoster: PGInfo[];
    dtdlgdRoster: PGInfo[];
    weekData: any;
    customShifts: string[];
  },
  weeks: Array<{ dates: Date[] }>
): DiffResult {
  const changes: PGChangeDetail[] = [];
  const modifiedShifts: DiffResult['modifiedShifts'] = [];

  // 1. Compare ICT Roster
  const origIctMap = new Map(orig.ictRoster.map(r => [r.id, r]));
  const curIctMap = new Map(current.ictRoster.map(r => [r.id, r]));
  const addedIctPgs: PGInfo[] = [];
  const updatedIctPgs: PGInfo[] = [];
  const removedIctPgIds = new Set<string>();

  current.ictRoster.forEach(pg => {
    const oldPg = origIctMap.get(pg.id);
    if (!oldPg) {
      addedIctPgs.push(pg);
      changes.push({
        type: 'add_pg',
        pgName: pg.tenPgHang || 'PG mới',
        category: 'ICT',
        oldValue: '',
        newValue: pg.tenPgHang,
        description: `Thêm mới PG: ${pg.tenPgHang}`
      });
    } else if (
      oldPg.tenPgHang !== pg.tenPgHang ||
      oldPg.note !== pg.note ||
      oldPg.sdtSup !== pg.sdtSup ||
      oldPg.category !== pg.category
    ) {
      updatedIctPgs.push(pg);
      if (oldPg.tenPgHang !== pg.tenPgHang) {
        changes.push({
          type: 'name',
          pgName: pg.tenPgHang,
          category: 'ICT',
          oldValue: oldPg.tenPgHang,
          newValue: pg.tenPgHang,
          description: `Đổi tên PG từ "${oldPg.tenPgHang}" sang "${pg.tenPgHang}"`
        });
      }
      if (oldPg.note !== pg.note) {
        changes.push({
          type: 'note',
          pgName: pg.tenPgHang,
          category: 'ICT',
          oldValue: oldPg.note,
          newValue: pg.note,
          description: `Đổi Note: "${oldPg.note}" → "${pg.note}"`
        });
      }
      if (oldPg.sdtSup !== pg.sdtSup) {
        changes.push({
          type: 'sdt',
          pgName: pg.tenPgHang,
          category: 'ICT',
          oldValue: oldPg.sdtSup,
          newValue: pg.sdtSup,
          description: `Đổi SĐT/SUP: "${oldPg.sdtSup}" → "${pg.sdtSup}"`
        });
      }
    }
  });

  orig.ictRoster.forEach(oldPg => {
    if (!curIctMap.has(oldPg.id)) {
      removedIctPgIds.add(oldPg.id);
      changes.push({
        type: 'remove_pg',
        pgName: oldPg.tenPgHang,
        category: 'ICT',
        oldValue: oldPg.tenPgHang,
        newValue: '',
        description: `Xóa PG: ${oldPg.tenPgHang}`
      });
    }
  });

  const origIctOrderStr = orig.ictRoster.map(r => r.id).join(',');
  const currentIctOrder = current.ictRoster.map(r => r.id);
  const curIctOrderStr = currentIctOrder.join(',');
  const isIctOrderChanged = origIctOrderStr !== curIctOrderStr;
  if (isIctOrderChanged && addedIctPgs.length === 0 && removedIctPgIds.size === 0) {
    changes.push({
      type: 'reorder',
      pgName: 'Danh sách PG ICT',
      category: 'ICT',
      oldValue: '',
      newValue: '',
      description: 'Thay đổi thứ tự hiển thị PG (ICT)'
    });
  }

  // 2. Compare DTDLGD Roster
  const origDtdlgdMap = new Map(orig.dtdlgdRoster.map(r => [r.id, r]));
  const curDtdlgdMap = new Map(current.dtdlgdRoster.map(r => [r.id, r]));
  const addedDtdlgdPgs: PGInfo[] = [];
  const updatedDtdlgdPgs: PGInfo[] = [];
  const removedDtdlgdPgIds = new Set<string>();

  current.dtdlgdRoster.forEach(pg => {
    const oldPg = origDtdlgdMap.get(pg.id);
    if (!oldPg) {
      addedDtdlgdPgs.push(pg);
      changes.push({
        type: 'add_pg',
        pgName: pg.tenPgHang || 'PG mới',
        category: 'DTDLGD',
        oldValue: '',
        newValue: pg.tenPgHang,
        description: `Thêm mới PG: ${pg.tenPgHang}`
      });
    } else if (
      oldPg.tenPgHang !== pg.tenPgHang ||
      oldPg.note !== pg.note ||
      oldPg.sdtSup !== pg.sdtSup ||
      oldPg.category !== pg.category
    ) {
      updatedDtdlgdPgs.push(pg);
      if (oldPg.tenPgHang !== pg.tenPgHang) {
        changes.push({
          type: 'name',
          pgName: pg.tenPgHang,
          category: 'DTDLGD',
          oldValue: oldPg.tenPgHang,
          newValue: pg.tenPgHang,
          description: `Đổi tên PG từ "${oldPg.tenPgHang}" sang "${pg.tenPgHang}"`
        });
      }
      if (oldPg.note !== pg.note) {
        changes.push({
          type: 'note',
          pgName: pg.tenPgHang,
          category: 'DTDLGD',
          oldValue: oldPg.note,
          newValue: pg.note,
          description: `Đổi Note: "${oldPg.note}" → "${pg.note}"`
        });
      }
      if (oldPg.sdtSup !== pg.sdtSup) {
        changes.push({
          type: 'sdt',
          pgName: pg.tenPgHang,
          category: 'DTDLGD',
          oldValue: oldPg.sdtSup,
          newValue: pg.sdtSup,
          description: `Đổi SĐT/SUP: "${oldPg.sdtSup}" → "${pg.sdtSup}"`
        });
      }
    }
  });

  orig.dtdlgdRoster.forEach(oldPg => {
    if (!curDtdlgdMap.has(oldPg.id)) {
      removedDtdlgdPgIds.add(oldPg.id);
      changes.push({
        type: 'remove_pg',
        pgName: oldPg.tenPgHang,
        category: 'DTDLGD',
        oldValue: oldPg.tenPgHang,
        newValue: '',
        description: `Xóa PG: ${oldPg.tenPgHang}`
      });
    }
  });

  const origDtdlgdOrderStr = orig.dtdlgdRoster.map(r => r.id).join(',');
  const currentDtdlgdOrder = current.dtdlgdRoster.map(r => r.id);
  const curDtdlgdOrderStr = currentDtdlgdOrder.join(',');
  const isDtdlgdOrderChanged = origDtdlgdOrderStr !== curDtdlgdOrderStr;
  if (isDtdlgdOrderChanged && addedDtdlgdPgs.length === 0 && removedDtdlgdPgIds.size === 0) {
    changes.push({
      type: 'reorder',
      pgName: 'Danh sách PG ĐT-ĐL-GD',
      category: 'DTDLGD',
      oldValue: '',
      newValue: '',
      description: 'Thay đổi thứ tự hiển thị PG (ĐT-ĐL-GD)'
    });
  }

  // 3. Compare Shifts across all weeks
  weeks.forEach((w, wIdx) => {
    const wkKey = `week${wIdx + 1}`;
    const oldWk = orig.weekData[wkKey] || { ict: {}, dtdlgd: {} };
    const curWk = current.weekData[wkKey] || { ict: {}, dtdlgd: {} };

    // Check all ICT PGs
    const allIctPgIds = new Set([...Object.keys(oldWk.ict || {}), ...Object.keys(curWk.ict || {})]);
    allIctPgIds.forEach(pgId => {
      const oldShifts = oldWk.ict?.[pgId]?.shifts || emptyShifts().shifts;
      const newShifts = curWk.ict?.[pgId]?.shifts || emptyShifts().shifts;
      const pgObj = curIctMap.get(pgId) || origIctMap.get(pgId);
      const pgName = pgObj?.tenPgHang || 'PG';

      for (let di = 0; di < 7; di++) {
        const oldVal = (oldShifts[di] || '').trim();
        const newVal = (newShifts[di] || '').trim();
        if (oldVal !== newVal) {
          modifiedShifts.push({
            wkKey,
            category: 'ict',
            pgId,
            dayIndex: di,
            newVal,
          });
          const dayLabel = `${dayName(w.dates[di])} (${fmtDate(w.dates[di])})`;
          changes.push({
            type: 'shift',
            pgName,
            category: 'ICT',
            week: wIdx + 1,
            dayIndex: di,
            dayLabel,
            oldValue: oldVal || '—',
            newValue: newVal || '—',
            description: `Tuần ${wIdx + 1} - ${dayLabel}: [${oldVal || 'Trống'}] → [${newVal || 'Trống'}]`
          });
        }
      }
    });

    // Check all DTDLGD PGs
    const allDtdlgdPgIds = new Set([...Object.keys(oldWk.dtdlgd || {}), ...Object.keys(curWk.dtdlgd || {})]);
    allDtdlgdPgIds.forEach(pgId => {
      const oldShifts = oldWk.dtdlgd?.[pgId]?.shifts || emptyShifts().shifts;
      const newShifts = curWk.dtdlgd?.[pgId]?.shifts || emptyShifts().shifts;
      const pgObj = curDtdlgdMap.get(pgId) || origDtdlgdMap.get(pgId);
      const pgName = pgObj?.tenPgHang || 'PG';

      for (let di = 0; di < 7; di++) {
        const oldVal = (oldShifts[di] || '').trim();
        const newVal = (newShifts[di] || '').trim();
        if (oldVal !== newVal) {
          modifiedShifts.push({
            wkKey,
            category: 'dtdlgd',
            pgId,
            dayIndex: di,
            newVal,
          });
          const dayLabel = `${dayName(w.dates[di])} (${fmtDate(w.dates[di])})`;
          changes.push({
            type: 'shift',
            pgName,
            category: 'DTDLGD',
            week: wIdx + 1,
            dayIndex: di,
            dayLabel,
            oldValue: oldVal || '—',
            newValue: newVal || '—',
            description: `Tuần ${wIdx + 1} - ${dayLabel}: [${oldVal || 'Trống'}] → [${newVal || 'Trống'}]`
          });
        }
      }
    });
  });

  // 4. Custom shifts diff
  const addedCustomShifts = (current.customShifts || []).filter(s => !(orig.customShifts || []).includes(s));
  const removedCustomShifts = new Set((orig.customShifts || []).filter(s => !(current.customShifts || []).includes(s)));

  return {
    changes,
    modifiedShifts,
    addedIctPgs,
    updatedIctPgs,
    removedIctPgIds,
    isIctOrderChanged,
    currentIctOrder,
    addedDtdlgdPgs,
    updatedDtdlgdPgs,
    removedDtdlgdPgIds,
    isDtdlgdOrderChanged,
    currentDtdlgdOrder,
    addedCustomShifts,
    removedCustomShifts,
  };
}

function applyDiffToServerData(serverData: any, diff: DiffResult) {
  // 1. Merge ICT Roster
  let serverIct: PGInfo[] = Array.isArray(serverData.ictRoster) ? [...serverData.ictRoster] : [];
  if (diff.removedIctPgIds.size > 0) {
    serverIct = serverIct.filter(p => !diff.removedIctPgIds.has(p.id));
  }
  diff.updatedIctPgs.forEach(upd => {
    const idx = serverIct.findIndex(p => p.id === upd.id);
    if (idx >= 0) {
      serverIct[idx] = { ...serverIct[idx], ...upd };
    } else {
      serverIct.push(upd);
    }
  });
  diff.addedIctPgs.forEach(add => {
    if (!serverIct.some(p => p.id === add.id)) {
      serverIct.push(add);
    }
  });

  // Reorder ICT roster if client changed order
  if (diff.isIctOrderChanged && diff.currentIctOrder.length > 0) {
    const orderMap = new Map(diff.currentIctOrder.map((id, idx) => [id, idx]));
    serverIct.sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
      return idxA - idxB;
    });
  }

  // 2. Merge DTDLGD Roster
  let serverDtdlgd: PGInfo[] = Array.isArray(serverData.dtdlgdRoster) ? [...serverData.dtdlgdRoster] : [];
  if (diff.removedDtdlgdPgIds.size > 0) {
    serverDtdlgd = serverDtdlgd.filter(p => !diff.removedDtdlgdPgIds.has(p.id));
  }
  diff.updatedDtdlgdPgs.forEach(upd => {
    const idx = serverDtdlgd.findIndex(p => p.id === upd.id);
    if (idx >= 0) {
      serverDtdlgd[idx] = { ...serverDtdlgd[idx], ...upd };
    } else {
      serverDtdlgd.push(upd);
    }
  });
  diff.addedDtdlgdPgs.forEach(add => {
    if (!serverDtdlgd.some(p => p.id === add.id)) {
      serverDtdlgd.push(add);
    }
  });

  // Reorder DTDLGD roster if client changed order
  if (diff.isDtdlgdOrderChanged && diff.currentDtdlgdOrder.length > 0) {
    const orderMap = new Map(diff.currentDtdlgdOrder.map((id, idx) => [id, idx]));
    serverDtdlgd.sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
      return idxA - idxB;
    });
  }

  // 3. Merge Week Shifts
  const serverWeekData = JSON.parse(JSON.stringify(serverData.weekData || {}));
  diff.modifiedShifts.forEach(({ wkKey, category, pgId, dayIndex, newVal }) => {
    if (!serverWeekData[wkKey]) serverWeekData[wkKey] = { ict: {}, dtdlgd: {} };
    if (!serverWeekData[wkKey][category]) serverWeekData[wkKey][category] = {};
    if (!serverWeekData[wkKey][category][pgId]) {
      serverWeekData[wkKey][category][pgId] = { shifts: emptyShifts().shifts };
    }
    const currentArray = [...(serverWeekData[wkKey][category][pgId].shifts || emptyShifts().shifts)];
    while (currentArray.length < 7) currentArray.push('');
    currentArray[dayIndex] = newVal;
    serverWeekData[wkKey][category][pgId].shifts = currentArray;
  });

  // 4. Merge Custom Shifts
  let serverCustomShifts: string[] = Array.isArray(serverData.customShifts) ? [...serverData.customShifts] : [];
  if (diff.removedCustomShifts.size > 0) {
    serverCustomShifts = serverCustomShifts.filter(s => !diff.removedCustomShifts.has(s));
  }
  diff.addedCustomShifts.forEach(s => {
    if (!serverCustomShifts.includes(s)) {
      serverCustomShifts.push(s);
    }
  });

  return {
    ictRoster: serverIct,
    dtdlgdRoster: serverDtdlgd,
    weekData: serverWeekData,
    customShifts: serverCustomShifts,
  };
}

// ─── Brand Badge & Shift Icon Helpers (Chuẩn mẫu tham chiếu 100%) ────────────
function renderShiftIcon(value: string, textColor: string): React.ReactNode {
  const trimmed = (value || '').trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed === 'ca sáng' || trimmed.includes('sáng')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="12" cy="12" r="5" fill="#16A34A" />
        <g stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round">
          <line x1="12" y1="2" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="22" />
          <line x1="4.22" y1="4.22" x2="5.98" y2="5.98" />
          <line x1="18.02" y1="18.02" x2="19.78" y2="19.78" />
          <line x1="2" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="22" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.98" y2="18.02" />
          <line x1="18.02" y1="5.98" x2="19.78" y2="4.22" />
        </g>
      </svg>
    );
  }

  if (trimmed === 'ca chiều' || trimmed.includes('chiều') || trimmed === 'tn') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#7C3AED" className="shrink-0">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }

  if (trimmed === 'off' || trimmed.includes('nghỉ')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
        <circle cx="12" cy="12" r="9.5" fill="#EF4444" />
        <path d="M15 9L9 15M9 9l6 6" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    );
  }

  if (trimmed === 'ca gãy' || trimmed.includes('gãy')) {
    return <Clock size={13} style={{ color: '#D97706' }} className="shrink-0" strokeWidth={2.5} />;
  }

  return <Clock size={13} style={{ color: textColor }} className="shrink-0" strokeWidth={2.5} />;
}

function formatSdtSupDisplay(raw: string): React.ReactNode {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return '—';
  if (trimmed.includes('\n')) return trimmed;

  // If name comes before phone number (e.g. "Lý Tấn Được 0946676440" or "Ngô Thị Thùy Dung 0939 301 337"),
  // display Name on line 1 and Phone on line 2 to match reference layout without altering underlying data.
  const nameThenPhone = trimmed.match(/^([^\d]+?)\s+(0\d[\d\s.\-]{7,13})$/);
  if (nameThenPhone) {
    return (
      <>
        <span className="block">{nameThenPhone[1].trim()}</span>
        <span className="block">{nameThenPhone[2].trim()}</span>
      </>
    );
  }
  return trimmed;
}

function renderPgBrandBadge(tenPgHang: string): React.ReactNode {
  const raw = (tenPgHang || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (lower.includes('realme')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '7px',
          backgroundColor: '#FFC915',
          color: '#141414',
          fontWeight: 900,
          fontSize: '15px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        R
      </span>
    );
  }

  if (lower.includes('xiaomi') || lower.includes('redmi')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          backgroundColor: '#FF6900',
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: '12px',
          letterSpacing: '-0.5px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        mi
      </span>
    );
  }

  if (lower.includes('oppo')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '9999px',
          backgroundColor: '#046A38',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '9.5px',
          letterSpacing: '-0.3px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        oppo
      </span>
    );
  }

  if (lower.includes('vivo')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '9999px',
          backgroundColor: '#415FFF',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '10px',
          letterSpacing: '-0.2px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        vivo
      </span>
    );
  }

  if (lower.includes('tcl')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none"
        style={{
          width: '36px',
          height: '24px',
          borderRadius: '5px',
          backgroundColor: '#E60012',
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: '11px',
          letterSpacing: '0.4px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        TCL
      </span>
    );
  }

  if (/\blg\b/.test(lower) || lower.endsWith('- lg') || lower.endsWith('-lg')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '9999px',
          backgroundColor: '#A50034',
          color: '#FFFFFF',
          fontWeight: 800,
          fontSize: '10.5px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          border: '1.5px solid #A50034',
          boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.65)',
        }}
      >
        LG
      </span>
    );
  }

  if (lower.includes('toshiba')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#E60012',
          fontWeight: 900,
          fontSize: '11.5px',
          letterSpacing: '-0.3px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          minWidth: '54px',
        }}
      >
        TOSHIBA
      </span>
    );
  }

  if (lower.includes('aqua')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#005197',
          fontWeight: 900,
          fontSize: '13px',
          letterSpacing: '0.5px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          minWidth: '46px',
        }}
      >
        AQUA
      </span>
    );
  }

  if (lower.includes('karofi')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#0082C8',
          fontWeight: 900,
          fontSize: '12px',
          letterSpacing: '-0.2px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          minWidth: '50px',
        }}
      >
        KAR<span style={{ color: '#00A859' }}>O</span>FI
      </span>
    );
  }

  if (lower.includes('samsung')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          padding: '2px 6px',
          borderRadius: '9999px',
          backgroundColor: '#1428A0',
          color: '#FFFFFF',
          fontWeight: 900,
          fontSize: '9px',
          letterSpacing: '0.4px',
        }}
      >
        SAMSUNG
      </span>
    );
  }

  if (lower.includes('sony')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#0F172A',
          fontWeight: 900,
          fontSize: '12px',
          letterSpacing: '0.8px',
          minWidth: '42px',
        }}
      >
        SONY
      </span>
    );
  }

  if (lower.includes('panasonic')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#0041C0',
          fontWeight: 900,
          fontSize: '10.5px',
          letterSpacing: '-0.3px',
        }}
      >
        PANASONIC
      </span>
    );
  }

  if (lower.includes('casper')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#0284C7',
          fontWeight: 900,
          fontSize: '11.5px',
          letterSpacing: '0.2px',
        }}
      >
        CASPER
      </span>
    );
  }

  if (lower.includes('sunhouse')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#DC2626',
          fontWeight: 900,
          fontSize: '10.5px',
          letterSpacing: '-0.3px',
        }}
      >
        SUNHOUSE
      </span>
    );
  }

  if (lower.includes('kangaroo')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#16A34A',
          fontWeight: 900,
          fontSize: '10.5px',
          letterSpacing: '-0.3px',
        }}
      >
        KANGAROO
      </span>
    );
  }

  if (lower.includes('sharp')) {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 select-none uppercase"
        style={{
          color: '#E60012',
          fontWeight: 900,
          fontSize: '11.5px',
          letterSpacing: '0.3px',
        }}
      >
        SHARP
      </span>
    );
  }

  return null;
}

// ─── Shift cell ────────────────────────────────────────────────────────────────
const ShiftCell: React.FC<{
  value: ShiftType; onChange: (v: ShiftType) => void; editable: boolean;
  options: string[]; customShifts: string[];
}> = ({ value, onChange, editable, options, customShifts }) => {
  const s = getShiftStyle(value, customShifts);
  if (!editable) {
    return (
      <td
        className="px-1 py-2 text-center border whitespace-nowrap align-middle"
        style={{ borderColor: '#D7E2EE', height: '56px', width: '95px', minWidth: '92px', whiteSpace: 'nowrap' }}
      >
        {value ? (
          <span
            style={{
              backgroundColor: s.bg,
              color: s.text,
              border: `1px solid ${s.border || s.bg}`,
              borderRadius: '8px',
              padding: '0 8px',
              height: '31px',
              minWidth: '80px',
              fontSize: '11.5px',
              fontWeight: 800,
              fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4.5px',
              letterSpacing: '0.1px',
              lineHeight: '1',
              whiteSpace: 'nowrap',
            }}
          >
            {renderShiftIcon(value, s.text)}
            <span>{value}</span>
          </span>
        ) : (
          <span
            style={{
              color: '#94a3b8',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            —
          </span>
        )}
      </td>
    );
  }
  return (
    <td
      className="p-1 border whitespace-nowrap align-middle"
      style={{ borderColor: '#D7E2EE', height: '56px', width: '95px', minWidth: '92px', whiteSpace: 'nowrap' }}
    >
      <select
        value={value}
        onChange={e => onChange(e.target.value as ShiftType)}
        onDragStart={e => e.stopPropagation()}
        className="w-full px-1 py-1 text-[11.5px] font-extrabold text-center rounded-lg outline-none cursor-pointer whitespace-nowrap"
        style={{
          backgroundColor: s.bg,
          color: s.text,
          border: `1px solid ${s.border || '#cbd5e1'}`,
          height: '32px',
          whiteSpace: 'nowrap',
          fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
        }}
      >
        {options.map(o => <option key={o} value={o}>{o || '(trống)'}</option>)}
      </select>
    </td>
  );
};

// ─── Table component ─────────────────────────────────────────────────────────
const ScheduleTable: React.FC<{
  title: string;
  storeName?: string;
  roster: PGInfo[];
  weekShifts: Record<string, WeekShiftData>;
  onRosterChange: (roster: PGInfo[]) => void;
  onShiftsChange: (data: Record<string, WeekShiftData>) => void;
  editing: boolean;
  weekDates: Date[];
  currentMonth: number;
  category: CategoryType;
  shiftOpts: string[];
  customShifts: string[];
  is43751Admin?: boolean;
  onViewPgHistory?: (pgName: string) => void;
  onMoveToOtherCategory?: (pg: PGInfo) => void;
}> = ({ title, storeName, roster, weekShifts, onRosterChange, onShiftsChange, editing, weekDates, category, shiftOpts, customShifts, is43751Admin, onViewPgHistory, onMoveToOtherCategory }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const movePG = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= roster.length || fromIndex === toIndex) return;
    const updated = [...roster];
    const [movedItem] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, movedItem);
    onRosterChange(updated);
  };

  const updateName = (id: string, val: string) => {
    onRosterChange(roster.map(r => r.id === id ? { ...r, tenPgHang: val } : r));
  };

  const updateSdt = (id: string, val: string) => {
    onRosterChange(roster.map(r => r.id === id ? { ...r, sdtSup: val } : r));
  };

  const updateShift = (pgId: string, dayIdx: number, val: ShiftType) => {
    const cur = weekShifts[pgId] || emptyShifts();
    const newShifts = [...cur.shifts]; newShifts[dayIdx] = val;
    onShiftsChange({ ...weekShifts, [pgId]: { ...cur, shifts: newShifts } });
  };

  const updateNote = (pgId: string, val: string) => {
    onRosterChange(roster.map(r => r.id === pgId ? { ...r, note: val } : r));
  };

  const addPG = () => {
    const newPG: PGInfo = { id: genId(), tenPgHang: '', sdtSup: '', note: '', category };
    onRosterChange([...roster, newPG]);
  };

  const removePG = (id: string) => {
    onRosterChange(roster.filter(r => r.id !== id));
  };

  const dayNotes: Record<number, string> = { 3: '(ưu tiên ca chiều)', 6: '(ưu tiên ca chiều)' };
  const isICT = category === 'ICT';
  // Balanced total width: 48 (STT) + 178 (PG) + 7*95 (Days=665) + 274 (Note) + 175 (SDT) = 1340px
  const totalMinWidth = editing ? 1515 : 1340;

  return (
    <div className="w-full overflow-x-auto no-scrollbar max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div
        style={{
          minWidth: totalMinWidth,
          width: '100%',
          maxWidth: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #D7E2EE',
          boxShadow: '0 4px 16px rgba(20, 40, 75, 0.05)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* ─── Top Banner (ICT vs DTDLGD) ─── */}
        <div
          className="relative flex items-center justify-between px-5 overflow-hidden select-none"
          style={{
            height: '102px',
            minHeight: '102px',
            background: isICT
              ? 'linear-gradient(95deg, #FDE282 0%, #FCEB9B 38%, #FCD66D 74%, #F8C246 100%)'
              : 'linear-gradient(95deg, #BDF6CE 0%, #A7F3D0 38%, #99F6E4 72%, #7DD3FC 100%)',
            borderBottom: '1px solid #D7E2EE',
          }}
        >
          {/* Subtle decorative wave background */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1340 102"
            preserveAspectRatio="none"
            fill="none"
          >
            <path
              d="M0 76 C 300 108, 560 20, 860 64 C 1060 96, 1220 28, 1340 52 L 1340 102 L 0 102 Z"
              fill={isICT ? 'rgba(245, 158, 11, 0.16)' : 'rgba(20, 184, 166, 0.14)'}
            />
            <path
              d="M490 0 C 690 44, 900 92, 1140 20 L 1340 0 L 1340 102 L 490 102 Z"
              fill={isICT ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.25)'}
            />
          </svg>

          {/* Left Section: Icon/Illustration + Title + Store Name */}
          <div className="relative z-10 flex items-center gap-3.5 min-w-0">
            {isICT ? (
              /* ICT Left 3-person group emblem */
              <div className="relative flex items-center justify-center w-[72px] h-[68px] shrink-0">
                <div
                  className="absolute inset-1 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.32) 0%, rgba(245,158,11,0) 72%)' }}
                />
                <svg width="64" height="58" viewBox="0 0 68 62" fill="none" className="relative z-10 object-contain">
                  {/* Pedestal base */}
                  <ellipse cx="34" cy="54" rx="26" ry="5" fill="#D97706" fillOpacity="0.35" />
                  {/* Left person */}
                  <circle cx="17" cy="22" r="6.5" fill="#78350F" />
                  <path d="M6 43c0-6.2 4.9-11 11-11s11 4.8 11 11v3H6v-3z" fill="#92400E" />
                  {/* Right person */}
                  <circle cx="51" cy="22" r="6.5" fill="#78350F" />
                  <path d="M40 43c0-6.2 4.9-11 11-11s11 4.8 11 11v3H40v-3z" fill="#92400E" />
                  {/* Center person (prominent) */}
                  <circle cx="34" cy="17" r="8" fill="#5C280B" />
                  <path d="M19 47c0-8 6.7-14.5 15-14.5S49 39 49 47v3H19v-3z" fill="#6B2F0E" />
                </svg>
              </div>
            ) : (
              /* DTDLGD Left TV + Washing Machine Illustration */
              <div className="relative flex items-center justify-center w-[86px] h-[70px] shrink-0">
                <svg width="86" height="68" viewBox="0 0 92 72" fill="none" className="object-contain">
                  {/* Flat-screen TV */}
                  <rect x="4" y="10" width="54" height="36" rx="3" fill="#0F2942" stroke="#38BDF8" strokeWidth="1.5" />
                  <rect x="7" y="13" width="48" height="30" rx="1.5" fill="url(#tvGradLeft)" />
                  <path d="M24 46h14l3 6H21l3-6z" fill="#334155" />
                  <rect x="17" y="52" width="28" height="2.5" rx="1" fill="#1E293B" />
                  {/* Front-load Washing Machine */}
                  <rect x="54" y="20" width="32" height="42" rx="4" fill="#0F766E" stroke="#CCFBF1" strokeWidth="1.5" />
                  <rect x="57" y="23" width="26" height="6" rx="1.5" fill="#115E59" />
                  <circle cx="62" cy="26" r="1.5" fill="#5EEAD4" />
                  <circle cx="67" cy="26" r="1.5" fill="#5EEAD4" />
                  <circle cx="70" cy="44" r="10.5" fill="#E2E8F0" stroke="#0D9488" strokeWidth="2" />
                  <circle cx="70" cy="44" r="7" fill="#0F2942" />
                  <path d="M64 44c2-2 5-2 7 0s5 2 6 0" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="tvGradLeft" x1="7" y1="13" x2="55" y2="43" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0284C7" />
                      <stop offset="0.5" stopColor="#0D9488" />
                      <stop offset="1" stopColor="#0F2942" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}

            <div className="min-w-0">
              <div
                className="font-black uppercase leading-tight whitespace-nowrap"
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'UTM Avo', sans-serif",
                  fontSize: isICT ? '26px' : '24.5px',
                  fontWeight: 900,
                  color: isICT ? '#2C1810' : '#0F2942',
                  letterSpacing: '0.3px',
                }}
              >
                {title.replace(/\s+\(/g, ' (')}
              </div>
              {storeName && (
                <div
                  className="mt-1 font-bold whitespace-nowrap"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    fontSize: '13.5px',
                    color: isICT ? '#3D2516' : '#1E3A5F',
                  }}
                >
                  Siêu thị: <span className="font-extrabold uppercase">{storeName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: NOTE Box + Right Tech/Appliance Illustration */}
          <div className="relative z-10 flex items-center gap-4 shrink-0">
            {/* NOTE Shift Hours Box */}
            <div
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl shrink-0"
              style={{
                backgroundColor: isICT ? 'rgba(255, 251, 235, 0.78)' : 'rgba(240, 253, 250, 0.78)',
                border: isICT ? '1px solid rgba(217, 155, 38, 0.35)' : '1px solid rgba(20, 184, 166, 0.32)',
                minWidth: '232px',
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{
                  backgroundColor: isICT ? '#F59E0B' : '#0D9488',
                  color: '#FFFFFF',
                }}
              >
                <CalendarDays size={18} strokeWidth={2.3} />
              </div>
              <div
                className="text-[11px] leading-[1.35] whitespace-nowrap"
                style={{
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  color: isICT ? '#292524' : '#0F2942',
                }}
              >
                <div className="font-black text-[11.5px] tracking-wide uppercase">NOTE</div>
                <div className="font-bold">Ca Sáng: <span className="font-extrabold">8h - 16h</span></div>
                <div className="font-bold">Ca Chiều: <span className="font-extrabold">13h - 21h</span></div>
                <div className="font-bold">Ca Gãy: <span className="font-extrabold">8h - 12h + 16h - 21h</span></div>
              </div>
            </div>

            {/* Far Right Illustration */}
            {isICT ? (
              /* ICT Right Golden Laptop Illustration */
              <div className="w-[116px] h-[76px] flex items-center justify-end shrink-0">
                <svg width="114" height="74" viewBox="0 0 124 80" fill="none" className="object-contain">
                  {/* Decorative floating cube */}
                  <polygon points="18,22 32,14 46,22 32,30" fill="#FDE68A" fillOpacity="0.7" />
                  <polygon points="18,22 32,30 32,46 18,38" fill="#F59E0B" fillOpacity="0.45" />
                  <polygon points="46,22 32,30 32,46 46,38" fill="#D97706" fillOpacity="0.35" />
                  {/* Laptop screen */}
                  <path d="M52 14h54a4 4 0 0 1 4 4v34H48V18a4 4 0 0 1 4-4z" fill="#D97706" stroke="#FEF3C7" strokeWidth="1.5" />
                  <rect x="52" y="18" width="54" height="29" rx="1.5" fill="url(#ictLaptopScreen)" />
                  {/* Laptop keyboard deck */}
                  <path d="M36 52h74l8 9a2 2 0 0 1-1.6 3.2H30.6A2 2 0 0 1 29 61l7-9z" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.2" />
                  <path d="M45 55h54l4 4H41l4-4z" fill="#B45309" fillOpacity="0.55" />
                  <defs>
                    <linearGradient id="ictLaptopScreen" x1="52" y1="18" x2="106" y2="47" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FEF08A" />
                      <stop offset="0.5" stopColor="#FBBF24" />
                      <stop offset="1" stopColor="#D97706" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            ) : (
              /* DTDLGD Right TV + Fridge + Washer Illustration */
              <div className="w-[136px] h-[78px] flex items-center justify-end shrink-0">
                <svg width="134" height="76" viewBox="0 0 144 82" fill="none" className="object-contain">
                  {/* Scenic TV on left */}
                  <rect x="4" y="22" width="56" height="36" rx="2.5" fill="#1E293B" stroke="#E2E8F0" strokeWidth="1.2" />
                  <rect x="6.5" y="24.5" width="51" height="31" rx="1" fill="url(#dtdlgdTvRight)" />
                  <path d="M26 58h12l3 5H23l3-5z" fill="#475569" />
                  <rect x="20" y="63" width="24" height="2" rx="1" fill="#334155" />
                  {/* Tall Silver Side-by-Side Refrigerator in center */}
                  <rect x="66" y="8" width="36" height="64" rx="3" fill="url(#fridgeSilver)" stroke="#94A3B8" strokeWidth="1.2" />
                  <line x1="84" y1="9" x2="84" y2="71" stroke="#64748B" strokeWidth="1.2" />
                  <rect x="70" y="22" width="4" height="8" rx="1" fill="#334155" />
                  <rect x="81" y="20" width="1.5" height="22" rx="0.75" fill="#475569" />
                  <rect x="86" y="20" width="1.5" height="22" rx="0.75" fill="#475569" />
                  {/* White Front-Load Washing Machine on right */}
                  <rect x="104" y="26" width="34" height="46" rx="3.5" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
                  <rect x="106" y="29" width="30" height="7" rx="1" fill="#E2E8F0" />
                  <circle cx="121" cy="32.5" r="2" fill="#475569" />
                  <circle cx="131" cy="32.5" r="1.2" fill="#0EA5E9" />
                  <circle cx="121" cy="52" r="11" fill="#334155" stroke="#CBD5E1" strokeWidth="2.2" />
                  <circle cx="121" cy="52" r="7.5" fill="#0F172A" />
                  <path d="M116 52c2-2 4-2 6 0s4 2 5 0" stroke="#38BDF8" strokeWidth="1.4" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="dtdlgdTvRight" x1="6" y1="24" x2="57" y2="55" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0284C7" />
                      <stop offset="0.55" stopColor="#38BDF8" />
                      <stop offset="1" stopColor="#1E3A8A" />
                    </linearGradient>
                    <linearGradient id="fridgeSilver" x1="66" y1="8" x2="102" y2="72" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#F1F5F9" />
                      <stop offset="0.5" stopColor="#CBD5E1" />
                      <stop offset="1" stopColor="#94A3B8" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* ─── Schedule Data Table (11 Fixed Columns, Balanced 1340px Proportion) ─── */}
        <div className="w-full">
          <table
            className="w-full border-collapse"
            style={{
              width: '100%',
              minWidth: totalMinWidth,
              tableLayout: 'fixed',
              fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
            }}
          >
            <colgroup>
              {editing && <col style={{ width: '70px' }} />}
              <col style={{ width: '48px' }} />
              <col style={{ width: '178px' }} />
              {weekDates.map((_, i) => (
                <col key={i} style={{ width: '95px' }} />
              ))}
              <col style={{ width: '274px' }} />
              <col style={{ width: '175px' }} />
              {editing && <col style={{ width: '105px' }} />}
            </colgroup>
            <thead>
              <tr style={{ height: '66px' }}>
                {editing && (
                  <th
                    className="px-1 py-2 border text-[11px] font-extrabold text-center uppercase tracking-wider whitespace-nowrap"
                    style={{ backgroundColor: '#DDF1FF', color: '#14284B', borderColor: '#D7E2EE' }}
                  >
                    VỊ TRÍ
                  </th>
                )}
                <th
                  className="px-1.5 py-2 border text-[12px] font-extrabold text-center uppercase tracking-wider whitespace-nowrap"
                  style={{ backgroundColor: '#DDF1FF', color: '#14284B', borderColor: '#D7E2EE' }}
                >
                  STT
                </th>
                <th
                  className="px-3 py-2 border text-[12px] font-extrabold text-left uppercase tracking-wider whitespace-nowrap"
                  style={{ backgroundColor: '#DDF1FF', color: '#14284B', borderColor: '#D7E2EE' }}
                >
                  TÊN PG HÃNG
                </th>
                {weekDates.map((d, i) => {
                  const isSunday = d.getDay() === 0;
                  return (
                    <th
                      key={i}
                      className="px-1 py-1.5 border text-center whitespace-nowrap align-middle"
                      style={{
                        borderColor: isSunday ? '#F3B8C2' : '#D7E2EE',
                        backgroundColor: isSunday ? '#FFD9DF' : '#DDF1FF',
                        color: isSunday ? '#9F1239' : '#14284B',
                      }}
                    >
                      <div
                        className="text-[12.5px] font-extrabold leading-tight whitespace-nowrap"
                        style={{ color: isSunday ? '#9F1239' : '#14284B' }}
                      >
                        {dayName(d)}
                      </div>
                      <div
                        className="text-[12px] font-extrabold leading-tight mt-0.5 whitespace-nowrap"
                        style={{ color: isSunday ? '#9F1239' : '#14284B' }}
                      >
                        {fmtDate(d)}
                      </div>
                      {dayNotes[i] && (
                        <div
                          className="text-[10px] font-semibold leading-tight mt-0.5 whitespace-nowrap"
                          style={{ color: isSunday ? '#9F1239' : '#334E7B' }}
                        >
                          {dayNotes[i]}
                        </div>
                      )}
                    </th>
                  );
                })}
                <th
                  className="px-3 py-2 border text-[12px] font-extrabold text-left uppercase tracking-wider whitespace-nowrap"
                  style={{ backgroundColor: '#DDF1FF', color: '#14284B', borderColor: '#D7E2EE' }}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <FileText size={15} className="text-[#1D4ED8] shrink-0" strokeWidth={2.3} />
                    <span>GHI CHÚ / NOTE</span>
                  </div>
                </th>
                <th
                  className="px-3 py-2 border text-[12px] font-extrabold text-left uppercase tracking-wider whitespace-nowrap"
                  style={{ backgroundColor: '#DDF1FF', color: '#14284B', borderColor: '#D7E2EE' }}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <PhoneCall size={14} className="text-[#1D4ED8] shrink-0" strokeWidth={2.3} />
                    <span>SĐT SUP + TÊN</span>
                  </div>
                </th>
                {editing && (
                  <th
                    className="px-1 py-2 border text-[11px] font-extrabold text-center uppercase tracking-wider whitespace-nowrap"
                    style={{ backgroundColor: '#DDF1FF', color: '#14284B', borderColor: '#D7E2EE' }}
                  >
                    THAO TÁC
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 && !editing ? (
                <tr>
                  <td colSpan={12} className="text-center py-6 text-xs text-slate-400 italic">
                    Chưa có dữ liệu. Nhấn "Chỉnh sửa" để thêm PG.
                  </td>
                </tr>
              ) : (
                roster.map((pg, idx) => {
                  const ws = weekShifts[pg.id] || emptyShifts();
                  const isDragging = draggedIndex === idx;
                  const isDragOver = dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;
                  const brandBadge = renderPgBrandBadge(pg.tenPgHang);

                  return (
                    <tr
                      key={pg.id}
                      draggable={editing}
                      onDragStart={(e) => {
                        if (!editing) return;
                        setDraggedIndex(idx);
                        e.dataTransfer.setData('text/plain', String(idx));
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        if (!editing) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== idx) setDragOverIndex(idx);
                      }}
                      onDragLeave={() => {
                        if (dragOverIndex === idx) setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        if (!editing) return;
                        e.preventDefault();
                        const fromIdx = draggedIndex !== null ? draggedIndex : Number(e.dataTransfer.getData('text/plain'));
                        if (!isNaN(fromIdx) && fromIdx !== idx) {
                          movePG(fromIdx, idx);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      style={{
                        backgroundColor: isDragging
                          ? '#fef3c7'
                          : isDragOver
                          ? '#ecfdf5'
                          : idx % 2 === 0
                          ? '#FFFFFF'
                          : '#F8FAFD',
                        borderBottom: isDragOver ? '2px solid #10b981' : '1px solid #D7E2EE',
                        opacity: isDragging ? 0.4 : 1,
                        height: '56px',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      {editing && (
                        <td className="px-1 py-2 border text-center align-middle" style={{ borderColor: '#D7E2EE' }}>
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => movePG(idx, idx - 1)}
                              disabled={idx === 0}
                              title="Di chuyển lên trên"
                              className="p-1 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 disabled:opacity-20 disabled:hover:bg-slate-100 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePG(idx, idx + 1)}
                              disabled={idx === roster.length - 1}
                              title="Di chuyển xuống dưới"
                              className="p-1 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 disabled:opacity-20 disabled:hover:bg-slate-100 disabled:cursor-not-allowed transition-all cursor-pointer"
                            >
                              <ChevronDown size={13} />
                            </button>
                            <div
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing"
                              title="Kéo thả hàng này để đổi thứ tự PG"
                            >
                              <GripVertical size={13} />
                            </div>
                          </div>
                        </td>
                      )}
                      <td
                        className="px-1.5 py-2 border text-center text-[13px] font-extrabold whitespace-nowrap align-middle"
                        style={{ borderColor: '#D7E2EE', color: '#14284B' }}
                      >
                        {idx + 1}
                      </td>
                      <td
                        className="group relative px-2.5 py-1.5 border text-[13px] font-extrabold align-middle overflow-hidden"
                        style={{ borderColor: '#D7E2EE', color: '#14284B' }}
                        title={pg.tenPgHang || ''}
                      >
                        {editing ? (
                          <input
                            value={pg.tenPgHang}
                            onChange={e => updateName(pg.id, e.target.value)}
                            onDragStart={e => e.stopPropagation()}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[12.5px] focus:ring-1 focus:ring-green-400 outline-none font-bold"
                            placeholder="VD: Ngọc Trâm - Realme"
                          />
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            {brandBadge}
                            <span
                              className="font-extrabold leading-[1.28] break-words"
                              style={{ color: '#14284B', overflowWrap: 'break-word' }}
                            >
                              {pg.tenPgHang || '—'}
                            </span>
                            {is43751Admin && pg.tenPgHang && (
                              <button
                                data-export-hide="true"
                                onClick={() => onViewPgHistory?.(pg.tenPgHang)}
                                title={`Xem lịch sử thay đổi của ${pg.tenPgHang}`}
                                className="opacity-0 group-hover:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded bg-white/95 shadow-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                              >
                                <History size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      {ws.shifts.map((shift, di) => (
                        <ShiftCell
                          key={di}
                          value={shift}
                          onChange={v => updateShift(pg.id, di, v)}
                          editable={editing}
                          options={shiftOpts}
                          customShifts={customShifts}
                        />
                      ))}
                      <td
                        className="px-3 py-1.5 border text-[12px] align-middle overflow-hidden"
                        style={{ borderColor: '#D7E2EE', color: '#1E293B', overflowWrap: 'anywhere' }}
                      >
                        {editing ? (
                          <textarea
                            value={pg.note}
                            onChange={e => updateNote(pg.id, e.target.value)}
                            onDragStart={e => e.stopPropagation()}
                            className="w-full px-2 py-1 border border-slate-300 rounded-lg text-[12px] focus:ring-1 focus:ring-green-400 outline-none resize-none"
                            rows={2}
                            placeholder="Ca sáng 9h-15h..."
                          />
                        ) : (
                          <span className="whitespace-pre-line text-[12px] font-medium leading-[1.38] block break-words">
                            {pg.note || '—'}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-3 py-1.5 border text-[12px] align-middle overflow-hidden"
                        style={{ borderColor: '#D7E2EE', color: '#1E293B', overflowWrap: 'anywhere' }}
                      >
                        {editing ? (
                          <input
                            value={pg.sdtSup}
                            onChange={e => updateSdt(pg.id, e.target.value)}
                            onDragStart={e => e.stopPropagation()}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-[12px] focus:ring-1 focus:ring-green-400 outline-none"
                            placeholder="0901234567 (Tên)"
                          />
                        ) : pg.sdtSup && pg.sdtSup.trim() !== '—' && pg.sdtSup.trim() !== '-' ? (
                          <div className="flex items-center gap-2 min-w-0">
                            {isICT && (
                              <Clock size={13.5} className="text-[#64748B] shrink-0" strokeWidth={2} />
                            )}
                            <span className="text-[12px] leading-[1.36] font-medium whitespace-pre-line break-words">
                              {formatSdtSupDisplay(pg.sdtSup)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[12.5px] text-slate-500 font-medium">—</span>
                        )}
                      </td>
                      {editing && (
                        <td className="px-1 py-2 border text-center align-middle" style={{ borderColor: '#D7E2EE' }}>
                          <div className="flex items-center justify-center gap-1">
                            {onMoveToOtherCategory && (
                              <button
                                type="button"
                                onClick={() => onMoveToOtherCategory(pg)}
                                title={
                                  category === 'ICT'
                                    ? 'Chuyển sang nhóm ĐIỆN TỬ - ĐIỆN LẠNH - GIA DỤNG'
                                    : 'Chuyển sang nhóm ICT'
                                }
                                className="px-1.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10.5px] font-black flex items-center gap-0.5 transition-colors cursor-pointer"
                              >
                                <ArrowLeftRight size={11} /> {category === 'ICT' ? 'ĐỔI ĐTĐLGD' : 'ĐỔI ICT'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removePG(pg.id)}
                              title="Xóa PG này"
                              className="p-1 rounded hover:bg-rose-50 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={addPG}
            className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={13} /> Thêm PG ({category})
          </button>
          <span className="text-[11.5px] font-medium text-slate-400 italic">
            💡 Mẹo: Nhấn nút mũi tên ↑/↓ hoặc kéo thả dòng để thay đổi vị trí PG trong nhóm.
          </span>
        </div>
      )}
    </div>
  );
};

// ─── History Modal ─────────────────────────────────────────────────────────
const PGHistoryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  logs: PGHistoryRecord[];
  allPgNames: string[];
  initialFilterPg?: string;
  customShifts: string[];
}> = ({ isOpen, onClose, logs, allPgNames, initialFilterPg = 'ALL', customShifts }) => {
  const [filterPg, setFilterPg] = useState(initialFilterPg);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWeek, setFilterWeek] = useState('ALL');

  useEffect(() => {
    setFilterPg(initialFilterPg);
  }, [initialFilterPg]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchSearch = searchTerm.trim() === '' || 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.changes.some(c => c.pgName.toLowerCase().includes(searchTerm.toLowerCase()) || c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchPg = filterPg === 'ALL' || log.changes.some(c => c.pgName === filterPg);
    const matchWeek = filterWeek === 'ALL' || log.changes.some(c => c.week === Number(filterWeek));

    return matchSearch && matchPg && matchWeek;
  });

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 border border-indigo-500/30">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                Lịch Sử Chỉnh Sửa Lịch PG
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-400/30">Admin 43751</span>
              </h2>
              <p className="text-xs text-slate-400">Theo dõi toàn bộ lịch sử phân ca & thay đổi thông tin theo từng PG</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên PG, người sửa..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400" />
            <select
              value={filterPg}
              onChange={e => setFilterPg(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="ALL">Tất cả PG Hãng</option>
              {allPgNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            <select
              value={filterWeek}
              onChange={e => setFilterWeek(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="ALL">Tất cả các tuần</option>
              <option value="1">Tuần 1</option>
              <option value="2">Tuần 2</option>
              <option value="3">Tuần 3</option>
              <option value="4">Tuần 4</option>
              <option value="5">Tuần 5</option>
            </select>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <History size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-500">Không có dữ liệu lịch sử nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Các chỉnh sửa mới sẽ tự động được ghi nhận tại đây khi bấm "Lưu tất cả".</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const dateObj = new Date(log.timestamp);
              const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const dateStr = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
              
              const relevantChanges = log.changes.filter(c => {
                const matchPg = filterPg === 'ALL' || c.pgName === filterPg;
                const matchWeek = filterWeek === 'ALL' || c.week === Number(filterWeek);
                return matchPg && matchWeek;
              });

              if (relevantChanges.length === 0) return null;

              return (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-indigo-200 transition-all">
                  {/* Log meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <User size={12} /> {log.userName}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Clock size={12} /> {timeStr} · {dateStr}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {relevantChanges.length} thay đổi
                    </span>
                  </div>

                  {/* Changes List */}
                  <div className="mt-3 space-y-2">
                    {relevantChanges.map((c, cIdx) => {
                      const oldStyle = getShiftStyle(c.oldValue, customShifts);
                      const newStyle = getShiftStyle(c.newValue, customShifts);

                      return (
                        <div key={cIdx} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                              {c.pgName}
                            </span>
                            {c.week && (
                              <span className="font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded text-[11px]">
                                Tuần {c.week}
                              </span>
                            )}
                            {c.dayLabel && (
                              <span className="text-slate-500 font-medium">
                                {c.dayLabel}
                              </span>
                            )}
                          </div>

                          {c.type === 'shift' ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                style={{
                                  backgroundColor: oldStyle.bg,
                                  color: oldStyle.text,
                                  border: `1px solid ${oldStyle.border || oldStyle.bg}`,
                                  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                                }}
                                className="px-2 py-0.5 rounded-md text-[11px] font-extrabold shadow-2xs"
                              >
                                {c.oldValue}
                              </span>
                              <ArrowRight size={12} className="text-slate-400" />
                              <span
                                style={{
                                  backgroundColor: newStyle.bg,
                                  color: newStyle.text,
                                  border: `1px solid ${newStyle.border || newStyle.bg}`,
                                  fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                                }}
                                className="px-2 py-0.5 rounded-md text-[11px] font-extrabold shadow-2xs"
                              >
                                {c.newValue}
                              </span>
                            </div>
                          ) : (
                            <div className="text-slate-600 font-medium">
                              {c.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-100/70 flex justify-between items-center text-xs text-slate-500">
          <span>Tổng số lượt ghi nhận: <strong className="text-slate-700">{logs.length}</strong></span>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

// ─── Import Excel Modal ───────────────────────────────────────────────────────
interface ParsedImportRow {
  pgId: string;
  isExisting: boolean;
  tenPgHang: string;
  category: CategoryType;
  sdtSup: string;
  note: string;
  shifts: ShiftType[];
}

const ImportExcelShiftModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeWeekIndex: number;
  weeks: { dates: Date[] }[];
  ictRoster: PGInfo[];
  dtdlgdRoster: PGInfo[];
  customShifts: string[];
  onApply: (params: {
    targetWeek: number | 'ALL';
    updatedIctRoster: PGInfo[];
    updatedDtdlgdRoster: PGInfo[];
    parsedRows: ParsedImportRow[];
  }) => void;
}> = ({ isOpen, onClose, activeWeekIndex, weeks, ictRoster, dtdlgdRoster, customShifts, onApply }) => {
  const [targetWeek, setTargetWeek] = useState<number | 'ALL'>(activeWeekIndex);
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTargetWeek(activeWeekIndex);
      setRawText('');
      setParsedRows([]);
    }
  }, [isOpen, activeWeekIndex]);

  const detectCategoryByBrand = (name: string): CategoryType => {
    const norm = removeAccents(name).toLowerCase();
    const ictKeywords = ['realme', 'vivo', 'xiaomi', 'oppo', 'apple', 'iphone', 'samsung', 'honor', 'tecno', 'infinix', 'bphone', 'laptop', 'ict'];
    for (const kw of ictKeywords) {
      if (norm.includes(kw)) return 'ICT';
    }
    return 'DTDLGD';
  };

  const isPgMatch = (rosterName: string, inputName: string): boolean => {
    const a = removeAccents(rosterName).toLowerCase().replace(/[^a-z0-9]/g, '');
    const b = removeAccents(inputName).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
  };

  const normalizeShift = (raw: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    const lower = removeAccents(trimmed).toLowerCase();
    
    // Check customShifts exact match first
    const customMatch = customShifts.find(cs => cs.toLowerCase() === trimmed.toLowerCase());
    if (customMatch) return customMatch;

    if (lower === 'off' || lower === 'o' || lower === 'nghi' || lower === 'nghỉ') return 'OFF';
    if (lower.includes('sang') || lower === 'cs' || lower === 's' || lower === '8-16' || lower === '8h-16h') return 'Ca sáng';
    if (lower.includes('chieu') || lower === 'cc' || lower === 'c' || lower === '13-21' || lower === '13h-21h' || lower === '12-20' || lower === '12h-20h') return 'Ca Chiều';
    if (lower.includes('gay') || lower === 'cg' || lower === 'g') return 'Ca Gãy';
    if (lower.includes('full') || lower === 'cf' || lower === 'f' || lower === '8-20' || lower === '8h-20h' || lower === 'ca ca' || lower === 'all') return 'Ca Full';
    if (lower.includes('khac') || lower === 'stk') return 'ST khác';
    if (lower === '8h-20h' || lower === '8-20') return '8h-20h';
    if (lower === '10h-20h' || lower === '10-20') return '10h-20h';
    if (lower === '9h-20h' || lower === '9-20') return '9H-20H';
    if (lower === '8h-16h' || lower === '8-16') return '8H-16H';
    if (lower === '12h-20h' || lower === '12-20') return '12H-20H';
    if (lower === '9h-19h' || lower === '9-19') return '9H-19H';

    return trimmed;
  };

  const handleParse = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: ParsedImportRow[] = [];

    for (const line of lines) {
      let cells = line.split('\t').map(c => c.trim());
      if (cells.length === 1 && line.includes(',')) {
        cells = line.split(',').map(c => c.trim());
      }

      const lineNorm = removeAccents(line).toLowerCase();
      if (lineNorm.includes('ten pg') || (lineNorm.includes('stt') && lineNorm.includes('thu 2'))) {
        continue;
      }

      let name = '';
      let shiftCells: string[] = [];
      let note = '';
      let sdt = '';

      // Pattern 1: cells[0] is index (1, 2, 3...)
      if (/^\d+$/.test(cells[0]) && cells.length >= 8) {
        name = cells[1];
        shiftCells = cells.slice(2, 9);
        if (cells[9]) note = cells[9];
        if (cells[10]) sdt = cells[10];
      } else if (cells.length >= 7) {
        // Pattern 2: cells[0] is PG name
        name = cells[0];
        shiftCells = cells.slice(1, 8);
        if (cells[8]) note = cells[8];
        if (cells[9]) sdt = cells[9];
      } else {
        continue;
      }

      if (!name) continue;

      const normalizedShifts: ShiftType[] = [];
      for (let i = 0; i < 7; i++) {
        normalizedShifts.push(normalizeShift(shiftCells[i] || ''));
      }

      // Match existing PG
      let matchedPg = ictRoster.find(p => isPgMatch(p.tenPgHang, name));
      let cat: CategoryType = 'ICT';
      if (matchedPg) {
        cat = 'ICT';
      } else {
        matchedPg = dtdlgdRoster.find(p => isPgMatch(p.tenPgHang, name));
        if (matchedPg) {
          cat = 'DTDLGD';
        } else {
          cat = detectCategoryByBrand(name);
        }
      }

      rows.push({
        pgId: matchedPg?.id || genId(),
        isExisting: !!matchedPg,
        tenPgHang: matchedPg?.tenPgHang || name,
        category: matchedPg?.category || cat,
        sdtSup: matchedPg?.sdtSup || sdt,
        note: matchedPg?.note || note,
        shifts: normalizedShifts
      });
    }

    setParsedRows(rows);
  };

  const handleToggleCategory = (index: number) => {
    setParsedRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      return {
        ...row,
        category: row.category === 'ICT' ? 'DTDLGD' : 'ICT'
      };
    }));
  };

  const handleApply = () => {
    if (parsedRows.length === 0) {
      alert('Vui lòng dán dữ liệu bảng phân ca từ Excel trước khi áp dụng.');
      return;
    }

    const newIct = [...ictRoster];
    const newDtdlgd = [...dtdlgdRoster];

    parsedRows.forEach(row => {
      if (!row.isExisting) {
        const newPg: PGInfo = {
          id: row.pgId,
          tenPgHang: row.tenPgHang,
          sdtSup: row.sdtSup,
          note: row.note,
          category: row.category
        };
        if (row.category === 'ICT') newIct.push(newPg);
        else newDtdlgd.push(newPg);
      }
    });

    onApply({
      targetWeek,
      updatedIctRoster: newIct,
      updatedDtdlgdRoster: newDtdlgd,
      parsedRows
    });

    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 md:p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-800 via-teal-800 to-cyan-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-300 border border-emerald-400/30">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black uppercase tracking-wider flex items-center gap-2">
                Dán Dữ Liệu Phân Ca Từ Excel / Quản Lý Phân Ca
              </h2>
              <p className="text-xs text-emerald-100/80">Copy trực tiếp bảng từ file Office 365 / Excel rồi dán (Ctrl + V) vào đây</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Settings Row: Target week selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wide">Áp dụng cho:</span>
              <select
                value={targetWeek}
                onChange={e => setTargetWeek(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-emerald-800 shadow-xs cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {weeks.map((w, idx) => (
                  <option key={idx} value={idx}>
                    Tuần {idx + 1} ({fmtDate(w.dates[0])} → {fmtDate(w.dates[6])}) {idx === activeWeekIndex ? '★ (Đang xem)' : ''}
                  </option>
                ))}
                <option value="ALL">Áp dụng cho TẤT CẢ các tuần trong tháng</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Định dạng nhận diện: <span className="font-bold text-slate-700">Tên PG + 7 cột Thứ 2 → CN (+ Ghi chú + SĐT)</span>
            </div>
          </div>

          {/* Paste Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <ClipboardPaste size={14} className="text-emerald-600" />
                Ô dán dữ liệu Excel / Trang tính:
              </label>
              {rawText && (
                <button
                  type="button"
                  onClick={() => handleParse('')}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                >
                  Xóa nội dung
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={rawText}
              onChange={e => handleParse(e.target.value)}
              placeholder={`Bấm Ctrl + V để dán bảng phân ca từ Excel hoặc Office 365 vào đây...\nVí dụ:\nNgọc Trâm - Realme\tCa Chiều\tCa sáng\tCa Full\tOFF\tCa Gãy\tCa Full\tCa Gãy\nThanh - Xiaomi\tCa sáng\tCa Chiều\tCa Full\tCa sáng\tCa Chiều\tCa Full\tCa Chiều\nTrung Tín - TCL\tOFF\tCa sáng\tCa Full\tCa Chiều\tCa Chiều\tCa Full\tCa sáng`}
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-y bg-slate-50/50"
            />
          </div>

          {/* Live Preview of parsed rows */}
          {parsedRows.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase">
                    Xem trước kết quả nhận diện ({parsedRows.length} PG)
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                    {parsedRows.filter(r => r.category === 'ICT').length} ICT
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-full">
                    {parsedRows.filter(r => r.category === 'DTDLGD').length} ĐT-ĐL-GD
                  </span>
                </div>
                <span className="text-[11.5px] text-slate-500 italic">
                  💡 Bấm vào nút nhóm (ICT / ĐT-ĐL-GD) để đổi nhóm phân loại nếu cần.
                </span>
              </div>

              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '950px' }}>
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-2 py-2 text-center font-black text-slate-600 w-10">STT</th>
                      <th className="px-3 py-2 text-left font-black text-slate-700 min-w-[170px]">TÊN PG HÃNG</th>
                      <th className="px-2 py-2 text-center font-black text-slate-700 w-24">NHÓM</th>
                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                        <th key={i} className="px-1 py-2 text-center font-black text-slate-700 min-w-[85px]">{d}</th>
                      ))}
                      <th className="px-3 py-2 text-left font-black text-slate-600 min-w-[140px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-2 py-2 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span>{row.tenPgHang}</span>
                            {row.isExisting ? (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">Khớp sẵn</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">+ Mới</span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(idx)}
                            className={`px-2 py-0.5 rounded text-[11px] font-black border transition-all cursor-pointer ${
                              row.category === 'ICT'
                                ? 'bg-yellow-100 text-yellow-900 border-yellow-300 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-900 border-green-300 hover:bg-green-200'
                            }`}
                            title="Nhấn để đổi giữa ICT và ĐT-ĐL-GD"
                          >
                            {row.category}
                          </button>
                        </td>
                        {row.shifts.map((sVal, sIdx) => {
                          const sStyle = getShiftStyle(sVal, customShifts);
                          return (
                            <td key={sIdx} className="px-1 py-1 text-center">
                              {sVal ? (
                                <span
                                  style={{
                                    backgroundColor: sStyle.bg,
                                    color: sStyle.text,
                                    border: `1px solid ${sStyle.border || sStyle.bg}`,
                                    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                                  }}
                                  className="inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-extrabold whitespace-nowrap shadow-2xs"
                                >
                                  {sVal}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" }}>-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-slate-500 text-[11px] truncate max-w-[200px]" title={row.note}>
                          {row.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : rawText.trim() ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 font-medium">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              Chưa nhận diện được hàng nào hợp lệ. Vui lòng kiểm tra lại bảng dữ liệu copy từ Excel (cần ít nhất cột Tên PG và các cột ca).
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              disabled={parsedRows.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
            >
              <Check size={15} />
              Áp dụng {parsedRows.length > 0 ? `(${parsedRows.length} PG)` : ''} vào{' '}
              {targetWeek === 'ALL' ? 'Tất cả các tuần' : `Tuần ${Number(targetWeek) + 1}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

// ─── Copy Week Shifts Modal ──────────────────────────────────────────────────
const CopyWeekShiftModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentYear: number;
  currentMonth: number;
  currentWeekIndex: number;
  allMonthsData: Record<string, any>;
  currentIctRoster: PGInfo[];
  currentDtdlgdRoster: PGInfo[];
  currentAllWeekData: Record<string, { ict: Record<string, WeekShiftData>; dtdlgd: Record<string, WeekShiftData> }>;
  customShifts: string[];
  activeStoreName: string;
  onApplyCopy: (params: {
    sourceMonthKey: string;
    sourceMonthLabel: string;
    sourceWeekIndex: number;
    targetMonthKey: string;
    targetMonthLabel: string;
    targetWeekIndex: number | 'ALL';
    updatedIctRoster: PGInfo[];
    updatedDtdlgdRoster: PGInfo[];
    updatedWeekData: Record<string, { ict: Record<string, WeekShiftData>; dtdlgd: Record<string, WeekShiftData> }>;
    targetCustomShifts: string[];
    targetYear: number;
    targetMonth: number;
  }) => Promise<void> | void;
}> = ({
  isOpen,
  onClose,
  currentYear,
  currentMonth,
  currentWeekIndex,
  allMonthsData,
  currentIctRoster,
  currentDtdlgdRoster,
  currentAllWeekData,
  customShifts,
  activeStoreName,
  onApplyCopy,
}) => {
  const [sourceMonthKey, setSourceMonthKey] = useState<string>('');
  const [sourceWeekIndex, setSourceWeekIndex] = useState<number>(0);
  const [targetMonthKey, setTargetMonthKey] = useState<string>('');
  const [targetWeekIndex, setTargetWeekIndex] = useState<number | 'ALL'>(0);

  const [syncRoster, setSyncRoster] = useState(true);
  const [replaceRoster, setReplaceRoster] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(true);
  const [copying, setCopying] = useState(false);

  // Available months options
  const availableMonthOptions = useMemo(() => {
    const list: { key: string; label: string; year: number; month: number }[] = [];
    const start = new Date(currentYear, currentMonth - 4, 1);
    for (let i = 0; i <= 10; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      list.push({
        key,
        label: `Tháng ${m + 1} / ${y}`,
        year: y,
        month: m,
      });
    }
    if (allMonthsData) {
      Object.keys(allMonthsData).forEach(k => {
        if (!list.find(x => x.key === k) && /^\d{4}-\d{2}$/.test(k)) {
          const { year: y, month: m } = parseMonthKey(k);
          list.push({
            key: k,
            label: `Tháng ${m + 1} / ${y}`,
            year: y,
            month: m,
          });
        }
      });
    }
    list.sort((a, b) => a.key.localeCompare(b.key));
    return list;
  }, [currentYear, currentMonth, allMonthsData]);

  // Reset and auto-select on open
  useEffect(() => {
    if (isOpen) {
      const curMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      setTargetMonthKey(curMonthKey);
      setTargetWeekIndex(currentWeekIndex);

      // Smart default for source:
      // If currently on Week 1 (index 0), default to Previous Month, Week 5 (index 4)
      if (currentWeekIndex === 0) {
        const prev = getPrevMonthInfo(currentYear, currentMonth);
        setSourceMonthKey(prev.monthKey);
        setSourceWeekIndex(4);
      } else {
        setSourceMonthKey(curMonthKey);
        setSourceWeekIndex(currentWeekIndex - 1);
      }

      // Check if target month has saved data
      const targetSaved = allMonthsData?.[curMonthKey];
      const hasSavedRoster = targetSaved && (
        (Array.isArray(targetSaved.ictRoster) && targetSaved.ictRoster.length > 0) ||
        (Array.isArray(targetSaved.dtdlgdRoster) && targetSaved.dtdlgdRoster.length > 0)
      );
      setReplaceRoster(!hasSavedRoster);
      setSyncRoster(true);
      setOverwriteExisting(true);
      setCopying(false);
    }
  }, [isOpen, currentYear, currentMonth, currentWeekIndex, allMonthsData]);

  // Weeks for source and target
  const srcWeeks = useMemo(() => {
    if (!sourceMonthKey) return [];
    const { year, month } = parseMonthKey(sourceMonthKey);
    return getWeeksOfMonth(year, month);
  }, [sourceMonthKey]);

  const tgtWeeks = useMemo(() => {
    if (!targetMonthKey) return [];
    const { year, month } = parseMonthKey(targetMonthKey);
    return getWeeksOfMonth(year, month);
  }, [targetMonthKey]);

  // Source week shift summary & stats
  const sourceWeekSummary = useMemo(() => {
    if (!sourceMonthKey) return { totalPgs: 0, countShifts: 0, hasData: false, srcData: null, samplePgs: [] };

    let srcData: any = null;
    const curMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    if (sourceMonthKey === curMonthKey) {
      srcData = {
        ictRoster: currentIctRoster,
        dtdlgdRoster: currentDtdlgdRoster,
        weekData: currentAllWeekData,
        customShifts: customShifts,
      };
    } else {
      srcData = allMonthsData[sourceMonthKey] || {};
    }

    const ict: PGInfo[] = srcData.ictRoster || [];
    const dtdlgd: PGInfo[] = srcData.dtdlgdRoster || [];
    const totalPgs = ict.length + dtdlgd.length;

    const wKey = `week${sourceWeekIndex + 1}`;
    const weekShifts = srcData.weekData?.[wKey] || { ict: {}, dtdlgd: {} };

    let countShifts = 0;
    const samplePgs: string[] = [];

    if (weekShifts.ict) {
      Object.entries(weekShifts.ict).forEach(([pgId, s]: [string, any]) => {
        if (s?.shifts && Array.isArray(s.shifts) && s.shifts.some((x: string) => Boolean(x && x.trim()))) {
          countShifts++;
          const found = ict.find(p => p.id === pgId);
          if (found && samplePgs.length < 4) samplePgs.push(found.tenPgHang);
        }
      });
    }
    if (weekShifts.dtdlgd) {
      Object.entries(weekShifts.dtdlgd).forEach(([pgId, s]: [string, any]) => {
        if (s?.shifts && Array.isArray(s.shifts) && s.shifts.some((x: string) => Boolean(x && x.trim()))) {
          countShifts++;
          const found = dtdlgd.find(p => p.id === pgId);
          if (found && samplePgs.length < 4) samplePgs.push(found.tenPgHang);
        }
      });
    }

    return {
      totalPgs,
      countShifts,
      hasData: countShifts > 0,
      srcData,
      samplePgs,
    };
  }, [sourceMonthKey, sourceWeekIndex, currentYear, currentMonth, currentIctRoster, currentDtdlgdRoster, currentAllWeekData, customShifts, allMonthsData]);

  const handleConfirm = async () => {
    if (sourceWeekSummary.countShifts === 0) {
      const ok = window.confirm('Tuần nguồn hiện chưa có ca làm việc nào được phân công. Bạn có chắc chắn muốn sao chép tuần này không?');
      if (!ok) return;
    }

    setCopying(true);
    try {
      const srcData = sourceWeekSummary.srcData || {};
      const srcIctRoster: PGInfo[] = srcData.ictRoster || [];
      const srcDtdlgdRoster: PGInfo[] = srcData.dtdlgdRoster || [];
      const srcWeekShifts = srcData.weekData?.[`week${sourceWeekIndex + 1}`] || { ict: {}, dtdlgd: {} };

      const curMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      let targetIct: PGInfo[] = [];
      let targetDtdlgd: PGInfo[] = [];
      let targetWeekData: any = {};
      let targetCustomShifts: string[] = [];

      if (targetMonthKey === curMonthKey) {
        targetIct = [...currentIctRoster];
        targetDtdlgd = [...currentDtdlgdRoster];
        targetWeekData = JSON.parse(JSON.stringify(currentAllWeekData));
        targetCustomShifts = [...customShifts];
      } else {
        const tgtData = allMonthsData[targetMonthKey] || {};
        targetIct = Array.isArray(tgtData.ictRoster) ? [...tgtData.ictRoster] : [];
        targetDtdlgd = Array.isArray(tgtData.dtdlgdRoster) ? [...tgtData.dtdlgdRoster] : [];
        targetWeekData = JSON.parse(JSON.stringify(tgtData.weekData || {}));
        targetCustomShifts = Array.isArray(tgtData.customShifts) ? [...tgtData.customShifts] : [...customShifts];
      }

      if (replaceRoster) {
        targetIct = JSON.parse(JSON.stringify(srcIctRoster));
        targetDtdlgd = JSON.parse(JSON.stringify(srcDtdlgdRoster));
      }

      const { updatedIctRoster, updatedDtdlgdRoster, updatedWeekData } = applyCopyWeekShifts({
        sourceIctRoster: srcIctRoster,
        sourceDtdlgdRoster: srcDtdlgdRoster,
        sourceWeekShifts: srcWeekShifts,
        targetIctRoster: targetIct,
        targetDtdlgdRoster: targetDtdlgd,
        targetExistingWeekData: targetWeekData,
        targetWeekIndex: targetWeekIndex,
        syncRoster: syncRoster || replaceRoster,
        overwriteExisting: overwriteExisting,
      });

      const combinedCustomShifts = Array.from(new Set([
        ...targetCustomShifts,
        ...(srcData.customShifts || []),
      ])).filter(Boolean);

      const { year: tgtY, month: tgtM } = parseMonthKey(targetMonthKey);
      const { year: srcY, month: srcM } = parseMonthKey(sourceMonthKey);

      await onApplyCopy({
        sourceMonthKey,
        sourceMonthLabel: `Tháng ${srcM + 1}/${srcY}`,
        sourceWeekIndex,
        targetMonthKey,
        targetMonthLabel: `Tháng ${tgtM + 1}/${tgtY}`,
        targetWeekIndex,
        updatedIctRoster,
        updatedDtdlgdRoster,
        updatedWeekData,
        targetCustomShifts: combinedCustomShifts,
        targetYear: tgtY,
        targetMonth: tgtM,
      });

      onClose();
    } catch (err: any) {
      console.error('Lỗi khi sao chép ca tuần:', err);
      alert('Không thể sao chép ca: ' + (err?.message || 'Có lỗi xảy ra'));
    } finally {
      setCopying(false);
    }
  };

  if (!isOpen) return null;

  const { year: srcY, month: srcM } = parseMonthKey(sourceMonthKey);
  const { year: tgtY, month: tgtM } = parseMonthKey(targetMonthKey);
  const targetWeekLabel = targetWeekIndex === 'ALL' ? 'Tất cả các tuần (Tuần 1 → 5)' : `Tuần ${Number(targetWeekIndex) + 1}`;

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shadow-xs border border-indigo-200">
              <Copy size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Sao Chép Ca Làm Việc Của Tuần</h3>
              <p className="text-[12px] text-slate-500 font-medium">
                Sao chép phân ca giữa các tuần trong tháng hoặc khác tháng (VD: Tuần 5 Tháng 9 → Tuần 1 Tháng 10)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(90vh-130px)] space-y-4">
          {/* Dual Column Box */}
          <div className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
              {/* Nguồn */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                    Tuần Nguồn (Lấy ca từ)
                  </span>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">Chọn Tháng:</label>
                  <select
                    value={sourceMonthKey}
                    onChange={e => setSourceMonthKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {availableMonthOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">Chọn Tuần:</label>
                  <select
                    value={sourceWeekIndex}
                    onChange={e => setSourceWeekIndex(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {srcWeeks.map((w, idx) => (
                      <option key={idx} value={idx}>
                        Tuần {idx + 1} ({fmtDate(w.dates[0])} → {fmtDate(w.dates[6])})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status pill */}
                <div className="pt-1">
                  {sourceWeekSummary.countShifts > 0 ? (
                    <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <Check size={13} className="text-emerald-600 shrink-0" />
                      <span>
                        Có <strong>{sourceWeekSummary.countShifts}</strong> PG đã được xếp ca
                        {sourceWeekSummary.samplePgs.length > 0 && (
                          <span className="block text-[10px] text-emerald-600/80 font-normal truncate">
                            ({sourceWeekSummary.samplePgs.join(', ')}...)
                          </span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-amber-600 shrink-0" />
                      <span>Chưa có dữ liệu ca trong tuần này</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center items-center py-1 md:py-0">
                <div className="p-2 rounded-full bg-indigo-100 text-indigo-700 shadow-xs border border-indigo-200">
                  <ArrowRight size={18} className="hidden md:block" />
                  <ArrowDown size={18} className="md:hidden" />
                </div>
              </div>

              {/* Đích */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Tuần Đích (Áp dụng vào)
                  </span>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">Chọn Tháng:</label>
                  <select
                    value={targetMonthKey}
                    onChange={e => setTargetMonthKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {availableMonthOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">Chọn Tuần:</label>
                  <select
                    value={targetWeekIndex}
                    onChange={e => setTargetWeekIndex(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    {tgtWeeks.map((w, idx) => (
                      <option key={idx} value={idx}>
                        Tuần {idx + 1} ({fmtDate(w.dates[0])} → {fmtDate(w.dates[6])})
                      </option>
                    ))}
                    <option value="ALL">★ Tất cả các tuần trong tháng (Tuần 1 → 5)</option>
                  </select>
                </div>

                <div className="pt-1">
                  <div className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 truncate">
                    <Store size={13} className="text-indigo-600 shrink-0" />
                    <span className="truncate">
                      Siêu thị: <strong className="uppercase">{activeStoreName || 'Hiện tại'}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs space-y-2.5">
            <h4 className="text-[12px] font-black text-slate-700 uppercase tracking-wide">Tùy chọn sao chép</h4>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-700 transition-colors">
              <input
                type="checkbox"
                checked={replaceRoster}
                onChange={e => setReplaceRoster(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <span>
                Đồng bộ toàn bộ danh sách PG theo tháng nguồn
                <span className="text-[11px] font-normal text-slate-500 block">
                  Tự động sao chép tên PG, SĐT SUP và Ghi chú sang tháng đích (khuyên dùng khi sang tháng mới chưa có dữ liệu)
                </span>
              </span>
            </label>

            {!replaceRoster && (
              <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-700 transition-colors">
                <input
                  type="checkbox"
                  checked={syncRoster}
                  onChange={e => setSyncRoster(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <span>
                  Thêm PG từ tuần nguồn nếu tháng đích chưa có
                  <span className="text-[11px] font-normal text-slate-500 block">
                    Giữ nguyên PG hiện tại của tháng đích và tự động bổ sung PG mới từ tuần nguồn
                  </span>
                </span>
              </label>
            )}

            <label className="flex items-start gap-2.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-indigo-700 transition-colors">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={e => setOverwriteExisting(e.target.checked)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
              />
              <span>
                Ghi đè ca làm việc của các PG trùng tên
                <span className="text-[11px] font-normal text-slate-500 block">
                  Nếu bỏ chọn, chỉ điền ca cho các PG hiện đang để trống ở tuần đích
                </span>
              </span>
            </label>
          </div>

          {/* Action Summary Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-2.5 text-xs text-indigo-900 font-semibold shadow-xs">
            <Sparkles size={18} className="text-indigo-600 shrink-0" />
            <div>
              Sao chép ca từ{' '}
              <strong className="text-indigo-950 font-black">
                Tuần {sourceWeekIndex + 1} (Tháng {srcM + 1}/{srcY})
              </strong>{' '}
              sang{' '}
              <strong className="text-emerald-950 font-black">
                {targetWeekLabel} (Tháng {tgtM + 1}/{tgtY})
              </strong>
              . Dữ liệu sẽ được lưu trực tiếp vào hệ thống.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={copying}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
          >
            {copying ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
            ) : (
              <Check size={15} />
            )}
            {copying ? 'Đang sao chép...' : 'Xác nhận sao chép & Lưu'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
};

// ─── Main page ───────────────────────────────────────────────────────────────
const LichLamViecPG: React.FC = () => {
  const { userProfile } = useAuth();
  const { currentStoreId, setCurrentStoreId, availableStores } = useStore();
  const maKho = userProfile?.ma_kho || '';

  // Handle URL store parameter if opening via link
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stParam = params.get('st') || params.get('store') || params.get('sieuthi');
      if (stParam && stParam.trim() && stParam.trim() !== currentStoreId) {
        setCurrentStoreId(stParam.trim());
      }
    }
  }, [currentStoreId, setCurrentStoreId]);

  // Determine active supermarket name
  const activeStoreName = useMemo(() => {
    // 1. If currentStoreId is already a valid supermarket name
    if (currentStoreId && currentStoreId !== 'ALL' && isValidStoreName(currentStoreId)) {
      return currentStoreId.trim();
    }
    // 2. Try to match currentStoreId in availableStores (by id or name)
    if (currentStoreId && availableStores && availableStores.length > 0) {
      const found = availableStores.find(s => s.name === currentStoreId || (s as any).id === currentStoreId);
      if (found && isValidStoreName(found.name)) return found.name.trim();
    }
    // 3. User profile supermarket name
    if (userProfile?.ten_sieu_thi && isValidStoreName(userProfile.ten_sieu_thi)) {
      return userProfile.ten_sieu_thi.trim();
    }
    // 4. First valid store in availableStores
    if (availableStores && availableStores.length > 0) {
      const firstValid = availableStores.find(s => isValidStoreName(s.name));
      if (firstValid) return firstValid.name.trim();
    }
    // 5. If currentStoreId is not ALL and has content
    if (currentStoreId && currentStoreId !== 'ALL' && currentStoreId.trim()) {
      return currentStoreId.trim();
    }
    return '';
  }, [currentStoreId, userProfile, availableStores]);

  // Target Firestore document ID in collection 'store' (STRICTLY normalized supermarket name)
  const targetStoreDocId = useMemo(() => {
    return normalizeStoreId(activeStoreName);
  }, [activeStoreName]);

  // Safe key for image export and labels
  const safeStoreKey = useMemo(() => {
    return targetStoreDocId || 'STORE';
  }, [targetStoreDocId]);

  // Refs for image export
  const ictRef = useRef<HTMLDivElement>(null);
  const dtdlgdRef = useRef<HTMLDivElement>(null);
  const allRef = useRef<HTMLDivElement>(null);

  // Image popup state
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [capturing, setCapturing] = useState(false);

  // Helper to copy an image blob to clipboard with multiple fallback strategies
  const copyImageBlobToClipboard = async (blob: Blob): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      }
    } catch (err1) {
      console.warn('Direct ClipboardItem failed, attempting Promise resolve:', err1);
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(blob) })]);
          return true;
        }
      } catch (err2) {
        console.warn('Promise ClipboardItem failed:', err2);
      }
    }
    return false;
  };

  const handleExport = async (ref: React.RefObject<HTMLDivElement>, title: string) => {
    if (!ref.current) { alert('Không tìm thấy bảng để chụp'); return; }
    setCapturing(true);
    setCopied(false);
    try {
      const el = ref.current;
      
      // Save & expand: remove ALL scroll/overflow constraints so full table is visible
      const savedStyles: { el: HTMLElement; props: Record<string, string> }[] = [];
      
      // The container itself
      savedStyles.push({ el, props: { width: el.style.width, minWidth: el.style.minWidth, overflow: el.style.overflow, maxHeight: el.style.maxHeight } });
      el.style.width = '1340px';
      el.style.minWidth = '1340px';
      el.style.overflow = 'visible';
      el.style.maxHeight = 'none';
      
      // All child overflow containers
      const overflowEls = el.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
      overflowEls.forEach(child => {
        savedStyles.push({ el: child, props: { overflow: child.style.overflow, width: child.style.width, minWidth: child.style.minWidth, maxWidth: child.style.maxWidth, maxHeight: child.style.maxHeight } });
        child.style.overflow = 'visible';
        child.style.width = '100%';
        child.style.minWidth = '0px';
        child.style.maxWidth = 'none';
        child.style.maxHeight = 'none';
      });
      
      // Ensure tables expand fully with fixed layout
      const tables = el.querySelectorAll<HTMLTableElement>('table');
      tables.forEach(tbl => {
        savedStyles.push({ el: tbl, props: { width: tbl.style.width, minWidth: tbl.style.minWidth, tableLayout: tbl.style.tableLayout } });
        tbl.style.width = '1340px';
        tbl.style.minWidth = '1340px';
        tbl.style.tableLayout = 'fixed';
      });

      // Hide hover-only admin controls during image export
      const hideEls = el.querySelectorAll<HTMLElement>('[data-export-hide="true"]');
      hideEls.forEach(hEl => {
        savedStyles.push({ el: hEl, props: { display: hEl.style.display } });
        hEl.style.display = 'none';
      });

      // Zero-Shadow Export: Gỡ bỏ toàn bộ bóng mờ trong lúc export để ảnh phẳng, không loang lổ viền đen
      const shadowEls = el.querySelectorAll<HTMLElement>('[style*="boxShadow"], [style*="box-shadow"], [class*="shadow"]');
      shadowEls.forEach(sEl => {
        savedStyles.push({ el: sEl, props: { boxShadow: sEl.style.boxShadow, filter: sEl.style.filter } });
        sEl.style.boxShadow = 'none';
        sEl.style.filter = 'none';
      });

      // ★ Ensure fonts are fully loaded before export
      await ensureFontsReady();
      await new Promise(r => setTimeout(r, 400));
      
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const dataUrl = await htmlToImage.toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: isMobile ? 1 : 2,
        skipFonts: false,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          overflow: 'visible',
          ...EXPORT_FONT_STYLE,
        }
      });
      
      // Restore all saved styles
      savedStyles.forEach(({ el: sEl, props }) => {
        Object.entries(props).forEach(([key, val]) => { (sEl.style as any)[key] = val; });
      });
      
      // Add white padding border
      const img = new Image();
      img.onload = () => {
        const pad = 40;
        const canvas = document.createElement('canvas');
        canvas.width = img.width + pad * 2;
        canvas.height = img.height + pad * 2;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, pad, pad);
        const finalDataUrl = canvas.toDataURL('image/png');
        setPreviewImg(finalDataUrl);
        setPreviewTitle(title);
        setCapturing(false);

        // ★ Auto copy image to clipboard
        canvas.toBlob(async (blob) => {
          if (blob) {
            const success = await copyImageBlobToClipboard(blob);
            if (success) {
              setCopied(true);
            }
          }
        }, 'image/png');
      };
      img.onerror = () => {
        setPreviewImg(dataUrl);
        setPreviewTitle(title);
        setCapturing(false);
        // Fallback auto copy
        fetch(dataUrl)
          .then(r => r.blob())
          .then(async (blob) => {
            const success = await copyImageBlobToClipboard(blob);
            if (success) setCopied(true);
          })
          .catch(() => {});
      };
      img.src = dataUrl;
      return;
    } catch (err) {
      console.error('Export error:', err);
      alert('Lỗi xuất ảnh: ' + (err as Error).message);
    }
    setCapturing(false);
  };

  const handleCopy = async () => {
    if (!previewImg) return;
    try {
      const res = await fetch(previewImg);
      const blob = await res.blob();
      const success = await copyImageBlobToClipboard(blob);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        window.open(previewImg, '_blank');
      }
    } catch {
      // Fallback: open in new tab
      window.open(previewImg, '_blank');
    }
  };

  const handleDownload = () => {
    if (!previewImg) return;
    const link = document.createElement('a');
    link.download = `${previewTitle.replace(/\s/g, '_')}.png`;
    link.href = previewImg;
    link.click();
  };

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [activeWeek, setActiveWeek] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const weeks = useMemo(() => getWeeksOfMonth(selectedYear, selectedMonth), [selectedYear, selectedMonth]);
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

  // Shared roster (names + SDT) — applies across all weeks
  const [ictRoster, setIctRoster] = useState<PGInfo[]>([]);
  const [dtdlgdRoster, setDtdlgdRoster] = useState<PGInfo[]>([]);

  // Per-week shift data: weekKey -> category -> pgId -> WeekShiftData
  const [allWeekData, setAllWeekData] = useState<Record<string, { ict: Record<string, WeekShiftData>; dtdlgd: Record<string, WeekShiftData> }>>({});

  // Dynamic custom shift types (persisted to Firebase)
  const [customShifts, setCustomShifts] = useState<string[]>([]);
  const [newShiftInput, setNewShiftInput] = useState('');
  const [showAddShift, setShowAddShift] = useState(false);
  const [allowUserEdit, setAllowUserEdit] = useState<Record<string, boolean>>({});

  // History tracking state (Admin 43751 only)
  const [historyLogs, setHistoryLogs] = useState<PGHistoryRecord[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false);
  const [allMonthsLichPg, setAllMonthsLichPg] = useState<Record<string, any>>({});
  const [historyFilterPg, setHistoryFilterPg] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareLink = () => {
    const currentKho = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '1841';
    if (!currentKho) return;
    const isDefaultStore = !availableStores || availableStores.length <= 1 || 
                           (availableStores.length > 0 && availableStores[0]?.name === activeStoreName);
    const shareUrl = buildGuestShareUrl('lichpg', currentKho, '', activeStoreName, isDefaultStore);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {});
    }
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('crm_opened_via_share_lichpg', 'true');
    } catch {}
  }, []);
  const originalDataRef = useRef<{ ictRoster: PGInfo[]; dtdlgdRoster: PGInfo[]; weekData: any; customShifts: string[] } | null>(null);
  const editingRef = useRef(editing);
  editingRef.current = editing;

  // Cancel edit mode if user changes the selected store to prevent cross-store overwrite
  const prevStoreKeyRef = useRef(targetStoreDocId);
  useEffect(() => {
    if (prevStoreKeyRef.current !== targetStoreDocId) {
      prevStoreKeyRef.current = targetStoreDocId;
      if (editing) {
        setEditing(false);
        originalDataRef.current = null;
      }
    }
  }, [targetStoreDocId, editing]);

  const allShiftOptions = useMemo(() => {
    return [...BASE_SHIFTS, ...customShifts, ''];
  }, [customShifts]);

  const allPgNames = useMemo(() => {
    const names = [...ictRoster.map(r => r.tenPgHang), ...dtdlgdRoster.map(r => r.tenPgHang)]
      .filter(Boolean)
      .map(n => n.trim());
    return Array.from(new Set(names));
  }, [ictRoster, dtdlgdRoster]);

  // Auto-select current week
  useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === selectedYear && today.getMonth() === selectedMonth) {
      const idx = weeks.findIndex(w => today >= w.dates[0] && today <= w.dates[6]);
      if (idx >= 0) setActiveWeek(idx);
      else setActiveWeek(0);
    } else {
      setActiveWeek(0);
    }
  }, [weeks, selectedYear, selectedMonth]);

  // ─── Load from Firestore strictly from collection 'store' > [TÊN SIÊU THỊ] ──
  const checkedSiblingFallbackRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    setLoaded(false);
    if (!targetStoreDocId) {
      setLoaded(true);
      return;
    }

    const docRef = doc(db, 'store', targetStoreDocId);

    const unsub = onSnapshot(docRef, async snap => {
      if (snap.exists()) {
        const d = snap.data() as any;
        const allMonths = d.lich_pg || d.data_phan_ca_pg || {};
        setAllMonthsLichPg(allMonths);

        const monthData = d.lich_pg?.[monthKey] || d.data_phan_ca_pg?.[monthKey];
        const hasValidRoster = monthData && (
          (Array.isArray(monthData.ictRoster) && monthData.ictRoster.length > 0) ||
          (Array.isArray(monthData.dtdlgdRoster) && monthData.dtdlgdRoster.length > 0)
        );
        if (monthData && hasValidRoster) {
          // If this device is NOT actively editing, sync everything in real-time from Firestore
          if (!editingRef.current) {
            setIctRoster(Array.isArray(monthData.ictRoster) ? monthData.ictRoster : []);
            setDtdlgdRoster(Array.isArray(monthData.dtdlgdRoster) ? monthData.dtdlgdRoster : []);
            setAllWeekData(monthData.weekData || {});
            if (Array.isArray(monthData.customShifts)) setCustomShifts(monthData.customShifts);
          }
          if (monthData.allowUserEdit !== undefined && typeof monthData.allowUserEdit === 'object') {
            setAllowUserEdit(monthData.allowUserEdit);
          } else {
            setAllowUserEdit({});
          }
          if (monthData.historyLogs) setHistoryLogs(monthData.historyLogs);
          else setHistoryLogs([]);
          setLoaded(true);
          return;
        }

        // Inherit roster from previous month if current month is new
        const prevInfo = getPrevMonthInfo(selectedYear, selectedMonth);
        const prevMonthData = d.lich_pg?.[prevInfo.monthKey] || d.data_phan_ca_pg?.[prevInfo.monthKey];
        if (prevMonthData && (
          (Array.isArray(prevMonthData.ictRoster) && prevMonthData.ictRoster.length > 0) ||
          (Array.isArray(prevMonthData.dtdlgdRoster) && prevMonthData.dtdlgdRoster.length > 0)
        )) {
          if (!editingRef.current) {
            setIctRoster(Array.isArray(prevMonthData.ictRoster) ? prevMonthData.ictRoster : []);
            setDtdlgdRoster(Array.isArray(prevMonthData.dtdlgdRoster) ? prevMonthData.dtdlgdRoster : []);
            setAllWeekData({});
            if (Array.isArray(prevMonthData.customShifts)) setCustomShifts(prevMonthData.customShifts);
            setAllowUserEdit({});
            setHistoryLogs([]);
          }
          setLoaded(true);
          return;
        }
      }

      // If store doc has no valid PG data, fallback to sibling stores in same cluster/warehouse (only check once per store+month)
      const fallbackCheckKey = `${targetStoreDocId}_${monthKey}`;
      if (!editingRef.current && availableStores && availableStores.length > 1 && !checkedSiblingFallbackRef.current[fallbackCheckKey]) {
        checkedSiblingFallbackRef.current[fallbackCheckKey] = true;
        for (const sibling of availableStores) {
          const sibId = normalizeStoreId(sibling.name);
          if (sibId && sibId !== targetStoreDocId) {
            try {
              const sibSnap = await getDoc(doc(db, 'store', sibId));
              if (sibSnap.exists()) {
                const sD = sibSnap.data() as any;
                const sMonthData = sD.lich_pg?.[monthKey] || sD.data_phan_ca_pg?.[monthKey];
                if (sMonthData && (
                  (Array.isArray(sMonthData.ictRoster) && sMonthData.ictRoster.length > 0) ||
                  (Array.isArray(sMonthData.dtdlgdRoster) && sMonthData.dtdlgdRoster.length > 0)
                )) {
                  if (!editingRef.current) {
                    setIctRoster(Array.isArray(sMonthData.ictRoster) ? sMonthData.ictRoster : []);
                    setDtdlgdRoster(Array.isArray(sMonthData.dtdlgdRoster) ? sMonthData.dtdlgdRoster : []);
                    setAllWeekData(sMonthData.weekData || {});
                    if (Array.isArray(sMonthData.customShifts)) setCustomShifts(sMonthData.customShifts);
                  }
                  if (sMonthData.allowUserEdit !== undefined && typeof sMonthData.allowUserEdit === 'object') {
                    setAllowUserEdit(sMonthData.allowUserEdit);
                  }
                  setLoaded(true);
                  return;
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      // If store doc has no PG data for this month yet, use default sample data
      if (!editingRef.current) {
          // Default initial sample data
          setIctRoster([
            { id: genId(), tenPgHang: 'Ngọc Trâm - Realme', sdtSup: 'Lý Tấn Được 0946676440', note: 'Ca gãy (9h-12/13h-18h), t6-17-cn (9h-12h/14h-19h) sáng 9h-16h', category: 'ICT' },
            { id: genId(), tenPgHang: 'VIVO', sdtSup: '', note: '', category: 'ICT' },
            { id: genId(), tenPgHang: 'Thanh - Xiaomiii', sdtSup: 'Gia Khang 0824013017', note: 'Ca sáng: 9h-17h/8h-16h ca chiều 12h-20h/ 13h-21h', category: 'ICT' },
            { id: genId(), tenPgHang: 'Anh Thư - Oppo', sdtSup: 'Phạm Thiên Tâm 0354827949', note: 'Ca sáng: 8h-16h. Ca chiều: 12h-20h', category: 'ICT' },
          ]);
          setDtdlgdRoster([
            { id: genId(), tenPgHang: 'Trung Tín - TCL', sdtSup: 'Sơn: 0939292323', note: 'Ca sáng từ 9h-15h, ca chiều từ 14h-20h, ngày cuối tuần 8h-18h', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Oanh - LG', sdtSup: '0904955285 (A Tùng)', note: 'Ca sáng (08h-16h)(9h-17h), ca chiều (12h-20h)(13h-21h)', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Trang - Toshiba', sdtSup: '0939095555 (Anh Trung)', note: 'Ca sáng(9h-15h), ca chiều(14h-20h), T7 CN(9h-20h)', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Xuyên - Aqua', sdtSup: 'Ngô Thị Thùy Dung 0939 301 337', note: '', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Khang Hi - Mutosi', sdtSup: '0898815291 (Nhi)', note: 'Ca sáng từ 9h-17h/8h-16h. Ca chiều 12h-20h', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Trúc - Bluestone', sdtSup: '', note: 'Ca sáng (09-16h), ca chiều (13h-20h)', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Trinh - Sunhouse', sdtSup: '', note: 'Ca sáng(9h-16h), Ca Gãy 16h-20h', category: 'DTDLGD' },
            { id: genId(), tenPgHang: 'Lam - Karofi', sdtSup: 'Tiến(0356784511)', note: 'Ca sáng(8-16h), ca chiều (12-20h), full(8h-20h)', category: 'DTDLGD' },
          ]);
        setAllWeekData({});
        setHistoryLogs([]);
      }
      setLoaded(true);
    }, err => {
      console.error('Firestore snapshot error on store doc:', err);
      setLoaded(true);
    });

    return unsub;
  }, [monthKey, targetStoreDocId, availableStores]);

  const handleStartEdit = () => {
    originalDataRef.current = {
      ictRoster: JSON.parse(JSON.stringify(ictRoster)),
      dtdlgdRoster: JSON.parse(JSON.stringify(dtdlgdRoster)),
      weekData: JSON.parse(JSON.stringify(allWeekData)),
      customShifts: JSON.parse(JSON.stringify(customShifts)),
    };
    setEditing(true);
  };

  const handleCancelEdit = () => {
    if (originalDataRef.current) {
      setIctRoster(originalDataRef.current.ictRoster);
      setDtdlgdRoster(originalDataRef.current.dtdlgdRoster);
      setAllWeekData(originalDataRef.current.weekData);
      setCustomShifts(originalDataRef.current.customShifts || []);
    }
    originalDataRef.current = null;
    setEditing(false);
  };

  // ─── Save strictly into collection 'store' > [TÊN SIÊU THỊ] ───────────────
  const handleSave = useCallback(async () => {
    if (!targetStoreDocId || !isValidStoreName(targetStoreDocId)) {
      alert('Tên siêu thị không hợp lệ hoặc chưa chọn siêu thị. Vui lòng chọn siêu thị hợp lệ để lưu Lịch PG.');
      return;
    }

    setSaving(true);
    try {
      const orig = originalDataRef.current;
      const docRef = doc(db, 'store', targetStoreDocId);

      const prevInfo = getPrevMonthInfo(selectedYear, selectedMonth);
      const prevWeeks = getWeeksOfMonth(prevInfo.year, prevInfo.month);
      const isWeek1BridgingWithPrevWeek5 = areWeeksMatching(weeks[0]?.dates, prevWeeks[4]?.dates);

      const nextInfo = getNextMonthInfo(selectedYear, selectedMonth);
      const nextWeeks = getWeeksOfMonth(nextInfo.year, nextInfo.month);
      const isWeek5BridgingWithNextWeek1 = areWeeksMatching(weeks[4]?.dates, nextWeeks[0]?.dates);

      let updatedHistory = [...historyLogs];

      if (orig) {
        const diff = computeDiff(orig, {
          ictRoster,
          dtdlgdRoster,
          weekData: allWeekData,
          customShifts,
        }, weeks);

        if (diff.changes.length > 0) {
          const newRecord: PGHistoryRecord = {
            id: genId(),
            timestamp: new Date().toISOString(),
            userName: userProfile?.username || 'Ẩn danh',
            changes: diff.changes.map(c => ({
              type: c.type,
              pgName: c.pgName || '',
              category: c.category || 'ICT',
              ...(c.week !== undefined ? { week: c.week } : {}),
              ...(c.dayIndex !== undefined ? { dayIndex: c.dayIndex } : {}),
              ...(c.dayLabel ? { dayLabel: c.dayLabel } : {}),
              oldValue: c.oldValue || '',
              newValue: c.newValue || '',
              description: c.description || '',
            })),
          };
          updatedHistory = [newRecord, ...updatedHistory].slice(0, 150);
          setHistoryLogs(updatedHistory);
        }
      }

      const monthPayload = sanitizeForFirestore({
        ictRoster,
        dtdlgdRoster,
        weekData: allWeekData,
        customShifts: customShifts || [],
        historyLogs: updatedHistory,
        allowUserEdit: allowUserEdit || {},
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.username || '',
        monthKey,
      });

      const storePayload: any = {
        id: targetStoreDocId,
        ten_sieu_thi: activeStoreName,
        warehouse_code: maKho || '',
        updated_at: new Date().toISOString(),
        lich_pg: {
          [monthKey]: monthPayload
        }
      };

      // Sync bridging week to previous month if applicable
      if (isWeek1BridgingWithPrevWeek5 && allWeekData.week1) {
        storePayload.lich_pg[prevInfo.monthKey] = {
          weekData: { week5: sanitizeForFirestore(allWeekData.week1) },
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile?.username || '',
        };
      }

      // Sync bridging week to next month if applicable
      if (isWeek5BridgingWithNextWeek1 && allWeekData.week5) {
        storePayload.lich_pg[nextInfo.monthKey] = {
          weekData: { week1: sanitizeForFirestore(allWeekData.week5) },
          updatedAt: new Date().toISOString(),
          updatedBy: userProfile?.username || '',
        };
      }

      // Strictly save into collection 'store', doc: targetStoreDocId (TÊN SIÊU THỊ)
      await setDoc(docRef, storePayload, { merge: true });

      originalDataRef.current = null;
      setEditing(false);
    } catch (err: any) {
      console.error('Lỗi khi lưu Lịch PG vào store:', err);
      alert('Không thể lưu Lịch PG: ' + (err?.message || 'Vui lòng thử lại'));
    } finally {
      setSaving(false);
    }
  }, [ictRoster, dtdlgdRoster, allWeekData, customShifts, allowUserEdit, historyLogs, userProfile, monthKey, weeks, selectedYear, selectedMonth, targetStoreDocId, activeStoreName, maKho]);

  // ─── Admin Toggle Permission ───────────────────────────────────────────
  const is43751Admin = userProfile?.username === '43751' || userProfile?.ma_nhan_vien === '43751';
  
  // Rule: Lock editing if the week's end date has passed (after Sunday 23:59:59).
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const activeWeekEnd = weeks[activeWeek] ? new Date(weeks[activeWeek].dates[6]) : new Date();
  activeWeekEnd.setHours(23, 59, 59, 999);
  
  // A week is in the past only when the entire week has ended
  const isPastWeek = activeWeekEnd < todayDate;
  const weekKeyStr = `week${activeWeek + 1}`;
  const override = allowUserEdit[weekKeyStr];
  const effectiveUserEditAllowed = override !== undefined ? override : !isPastWeek;
  // Admin 43751 always has edit permissions; other users follow effectiveUserEditAllowed
  const canEdit = is43751Admin || effectiveUserEditAllowed;

  const handleToggleUserEdit = async () => {
    if (!is43751Admin || !targetStoreDocId) return;
    const nextVal = !effectiveUserEditAllowed;
    const updated = { ...allowUserEdit, [weekKeyStr]: nextVal };
    setAllowUserEdit(updated);
    try {
      await setDoc(doc(db, 'store', targetStoreDocId), {
        ten_sieu_thi: activeStoreName,
        warehouse_code: maKho || '',
        updated_at: new Date().toISOString(),
        lich_pg: {
          [monthKey]: {
            allowUserEdit: updated,
            updatedAt: new Date().toISOString(),
            updatedBy: userProfile?.username || '',
          }
        }
      }, { merge: true });
    } catch (err) {
      console.error('Toggle user edit permission error:', err);
    }
  };

  // ─── Current week accessors ─────────────────────────────────────────────
  const wk = `week${activeWeek + 1}`;
  const curWeek = allWeekData[wk] || { ict: {}, dtdlgd: {} };

  const setICTShifts = (data: Record<string, WeekShiftData>) => {
    setAllWeekData(prev => ({ ...prev, [wk]: { ...prev[wk], ict: data, dtdlgd: (prev[wk]?.dtdlgd || {}) } }));
  };
  const setDTDLGDShifts = (data: Record<string, WeekShiftData>) => {
    setAllWeekData(prev => ({ ...prev, [wk]: { ict: (prev[wk]?.ict || {}), dtdlgd: data } }));
  };

  const handleMoveIctToDtdlgd = (pg: PGInfo) => {
    setIctRoster(prev => prev.filter(r => r.id !== pg.id));
    const moved: PGInfo = { ...pg, category: 'DTDLGD' };
    setDtdlgdRoster(prev => [...prev, moved]);

    // Move weekShifts across all weeks in allWeekData
    setAllWeekData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(wKey => {
        const wData = next[wKey];
        if (wData?.ict?.[pg.id]) {
          const shiftData = wData.ict[pg.id];
          const newIct = { ...wData.ict };
          delete newIct[pg.id];
          const newDtdlgd = { ...(wData.dtdlgd || {}), [pg.id]: shiftData };
          next[wKey] = { ict: newIct, dtdlgd: newDtdlgd };
        }
      });
      return next;
    });
  };

  const handleMoveDtdlgdToIct = (pg: PGInfo) => {
    setDtdlgdRoster(prev => prev.filter(r => r.id !== pg.id));
    const moved: PGInfo = { ...pg, category: 'ICT' };
    setIctRoster(prev => [...prev, moved]);

    // Move weekShifts across all weeks in allWeekData
    setAllWeekData(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(wKey => {
        const wData = next[wKey];
        if (wData?.dtdlgd?.[pg.id]) {
          const shiftData = wData.dtdlgd[pg.id];
          const newDtdlgd = { ...wData.dtdlgd };
          delete newDtdlgd[pg.id];
          const newIct = { ...(wData.ict || {}), [pg.id]: shiftData };
          next[wKey] = { ict: newIct, dtdlgd: newDtdlgd };
        }
      });
      return next;
    });
  };

  const allMonthsDataForModal = useMemo(() => {
    return {
      ...allMonthsLichPg,
      [monthKey]: {
        ...(allMonthsLichPg[monthKey] || {}),
        ictRoster,
        dtdlgdRoster,
        weekData: allWeekData,
        customShifts,
      }
    };
  }, [allMonthsLichPg, monthKey, ictRoster, dtdlgdRoster, allWeekData, customShifts]);

  const handleApplyCopyWeek = async ({
    sourceMonthKey,
    sourceMonthLabel,
    sourceWeekIndex,
    targetMonthKey,
    targetMonthLabel,
    targetWeekIndex,
    updatedIctRoster,
    updatedDtdlgdRoster,
    updatedWeekData,
    targetCustomShifts,
    targetYear,
    targetMonth,
  }: {
    sourceMonthKey: string;
    sourceMonthLabel: string;
    sourceWeekIndex: number;
    targetMonthKey: string;
    targetMonthLabel: string;
    targetWeekIndex: number | 'ALL';
    updatedIctRoster: PGInfo[];
    updatedDtdlgdRoster: PGInfo[];
    updatedWeekData: Record<string, { ict: Record<string, WeekShiftData>; dtdlgd: Record<string, WeekShiftData> }>;
    targetCustomShifts: string[];
    targetYear: number;
    targetMonth: number;
  }) => {
    if (!targetStoreDocId) {
      alert('Chưa chọn siêu thị để lưu Lịch PG.');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'store', targetStoreDocId);
      const targetWeekStr = targetWeekIndex === 'ALL' ? 'Tất cả các tuần' : `Tuần ${targetWeekIndex + 1}`;
      const logDesc = `Sao chép phân ca từ [Tuần ${sourceWeekIndex + 1} ${sourceMonthLabel}] sang [${targetWeekStr} ${targetMonthLabel}]`;

      const newRecord: PGHistoryRecord = {
        id: genId(),
        timestamp: new Date().toISOString(),
        userName: userProfile?.username || 'Ẩn danh',
        changes: [{
          type: 'shift',
          pgName: 'Toàn bộ PG',
          category: 'ICT',
          week: targetWeekIndex === 'ALL' ? undefined : (targetWeekIndex + 1),
          oldValue: 'Ca cũ',
          newValue: 'Ca sao chép',
          description: logDesc,
        }],
      };

      const isCurrentView = targetMonthKey === monthKey;

      if (isCurrentView) {
        setIctRoster(updatedIctRoster);
        setDtdlgdRoster(updatedDtdlgdRoster);
        setAllWeekData(updatedWeekData);
        setCustomShifts(targetCustomShifts);
        if (targetWeekIndex !== 'ALL') {
          setActiveWeek(targetWeekIndex);
        }
        setHistoryLogs(prev => [newRecord, ...prev].slice(0, 150));
      }

      const targetMonthPayload = sanitizeForFirestore({
        ictRoster: updatedIctRoster,
        dtdlgdRoster: updatedDtdlgdRoster,
        weekData: updatedWeekData,
        customShifts: targetCustomShifts || [],
        historyLogs: [newRecord, ...(allMonthsLichPg[targetMonthKey]?.historyLogs || [])].slice(0, 150),
        allowUserEdit: allMonthsLichPg[targetMonthKey]?.allowUserEdit || {},
        updatedAt: new Date().toISOString(),
        updatedBy: userProfile?.username || '',
        monthKey: targetMonthKey,
      });

      const storePayload: any = {
        id: targetStoreDocId,
        ten_sieu_thi: activeStoreName,
        warehouse_code: maKho || '',
        updated_at: new Date().toISOString(),
        lich_pg: {
          [targetMonthKey]: targetMonthPayload,
        }
      };

      await setDoc(docRef, storePayload, { merge: true });

      setAllMonthsLichPg(prev => ({
        ...prev,
        [targetMonthKey]: targetMonthPayload,
      }));

      if (!isCurrentView) {
        setSelectedYear(targetYear);
        setSelectedMonth(targetMonth);
        setActiveWeek(targetWeekIndex === 'ALL' ? 0 : targetWeekIndex);
      }

      alert(`Đã sao chép thành công ca làm việc từ Tuần ${sourceWeekIndex + 1} (${sourceMonthLabel}) sang ${targetWeekStr} (${targetMonthLabel})!`);
    } catch (err: any) {
      console.error('Lỗi khi lưu sao chép ca làm việc:', err);
      alert('Không thể lưu dữ liệu ca làm việc: ' + (err?.message || 'Có lỗi xảy ra'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCurrentWeekToAll = () => {
    const curWkData = allWeekData[wk];
    if (!curWkData) return;
    if (!window.confirm(`Bạn có chắc muốn sao chép toàn bộ phân ca của Tuần ${activeWeek + 1} sang tất cả các tuần khác trong tháng này không?`)) {
      return;
    }
    const updated: typeof allWeekData = { ...allWeekData };
    weeks.forEach((_, idx) => {
      const targetWk = `week${idx + 1}`;
      updated[targetWk] = JSON.parse(JSON.stringify(curWkData));
    });
    setAllWeekData(updated);
  };

  const handleApplyImportExcel = ({
    targetWeek: applyWeek,
    updatedIctRoster,
    updatedDtdlgdRoster,
    parsedRows
  }: {
    targetWeek: number | 'ALL';
    updatedIctRoster: PGInfo[];
    updatedDtdlgdRoster: PGInfo[];
    parsedRows: ParsedImportRow[];
  }) => {
    if (!editing) setEditing(true);

    setIctRoster(updatedIctRoster);
    setDtdlgdRoster(updatedDtdlgdRoster);

    setAllWeekData(prev => {
      const next = { ...prev };
      const targetWeekKeys = applyWeek === 'ALL'
        ? weeks.map((_, i) => `week${i + 1}`)
        : [`week${Number(applyWeek) + 1}`];

      targetWeekKeys.forEach(wKey => {
        const curWk = next[wKey] || { ict: {}, dtdlgd: {} };
        const curIct = { ...(curWk.ict || {}) };
        const curDtdlgd = { ...(curWk.dtdlgd || {}) };

        parsedRows.forEach(row => {
          if (row.category === 'ICT') {
            curIct[row.pgId] = { shifts: [...row.shifts] };
          } else {
            curDtdlgd[row.pgId] = { shifts: [...row.shifts] };
          }
        });

        next[wKey] = { ict: curIct, dtdlgd: curDtdlgd };
      });

      return next;
    });
  };


  // ─── Month nav ─────────────────────────────────────────────────────────
  const prevMonth = () => { if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); } else setSelectedMonth(m => m - 1); };
  const nextMonth = () => { if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); } else setSelectedMonth(m => m + 1); };
  const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];

  if (!loaded) {
    return <div className="flex-1 flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" /></div>;
  }

  return (
    <div className="p-3 md:p-5 max-w-[1380px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg"><CalendarDays size={22} className="text-white" /></div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-slate-800">Lịch Làm Việc PG</h1>
              {availableStores && availableStores.length > 1 ? (
                <div className="relative inline-block">
                  <select
                    value={activeStoreName}
                    onChange={e => setCurrentStoreId(e.target.value)}
                    className="appearance-none bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-black text-xs px-3 py-1 pr-7 rounded-xl shadow-sm border border-emerald-400 cursor-pointer outline-none uppercase tracking-wide"
                    title="Chọn siêu thị để xem và lưu lịch PG"
                  >
                    {availableStores.map(s => (
                      <option key={s.name} value={s.name} className="bg-white text-slate-800 font-bold normal-case">
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-emerald-100 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xs border border-emerald-400">
                  <Store size={14} className="text-emerald-100" />
                  <span className="uppercase tracking-wide">{activeStoreName}</span>
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500">Quản lý lịch Promoter — Tên PG dùng chung cho tất cả tuần</p>
          </div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={16} /></button>
          <span className="px-3 py-1 text-sm font-bold text-slate-700 min-w-[130px] text-center">{MONTHS[selectedMonth]} {selectedYear}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Shift legend with add/remove */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {BASE_SHIFTS.map(o => {
          const s = getShiftStyle(o, customShifts);
          return (
            <span
              key={o}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-extrabold border shadow-2xs"
              style={{
                backgroundColor: s.bg,
                color: s.text,
                borderColor: s.border || s.bg,
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                letterSpacing: '0.2px',
              }}
            >
              {renderShiftIcon(o, s.text)}
              <span>{o}</span>
            </span>
          );
        })}
        {customShifts.map(o => {
          const s = getShiftStyle(o, customShifts);
          return (
            <span
              key={o}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11.5px] font-extrabold border shadow-2xs"
              style={{
                backgroundColor: s.bg,
                color: s.text,
                borderColor: s.border || s.bg,
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                letterSpacing: '0.2px',
              }}
            >
              {renderShiftIcon(o, s.text)}
              <span>{o}</span>
              {editing && (
                <button
                  onClick={() => { setCustomShifts(prev => prev.filter(x => x !== o)); }}
                  className="ml-0.5 hover:opacity-70 cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </span>
          );
        })}
        {editing && !showAddShift && (
          <button onClick={() => setShowAddShift(true)} className="px-2 py-0.5 rounded text-[10px] font-bold border border-dashed border-slate-400 text-slate-500 hover:bg-slate-50 transition-colors">
            <Plus size={10} className="inline" /> Thêm ca
          </button>
        )}
        {editing && showAddShift && (
          <span className="inline-flex items-center gap-1">
            <input value={newShiftInput} onChange={e => setNewShiftInput(e.target.value)}
              className="px-2 py-0.5 border border-slate-300 rounded text-[11px] w-28 outline-none focus:ring-1 focus:ring-green-400"
              placeholder="VD: 9H-18H" autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && newShiftInput.trim()) { setCustomShifts(prev => [...prev, newShiftInput.trim()]); setNewShiftInput(''); setShowAddShift(false); } }} />
            <button onClick={() => { if (newShiftInput.trim()) { setCustomShifts(prev => [...prev, newShiftInput.trim()]); setNewShiftInput(''); setShowAddShift(false); } }}
              className="px-1.5 py-0.5 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100">OK</button>
            <button onClick={() => { setShowAddShift(false); setNewShiftInput(''); }}
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100">Hủy</button>
          </span>
        )}
      </div>

      {/* Week tabs */}
      <div className="flex gap-1.5 mb-4 bg-slate-100/90 rounded-2xl p-1.5 overflow-x-auto shadow-inner">
        {weeks.map((w, i) => {
          const isActive = activeWeek === i;
          const today = new Date();
          const isCurrent = today >= w.dates[0] && today <= w.dates[6];
          return (
            <button key={i} onClick={() => setActiveWeek(i)}
              className={`flex-1 min-w-[125px] px-3.5 py-2.5 rounded-xl text-center transition-all ${isActive ? 'bg-white shadow-md text-green-700 font-black ring-1 ring-slate-200/60' : 'text-slate-600 hover:bg-white/60 font-bold'}`}>
              <div className="text-[14px] font-black flex items-center justify-center gap-1.5">
                Tuần {i + 1}
                {isCurrent && <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
              </div>
              <div className={`text-[11.5px] mt-0.5 font-bold ${isActive ? 'text-green-600/80' : 'text-slate-400'}`}>{fmtDate(w.dates[0])} → {fmtDate(w.dates[6])}</div>
            </button>
          );
        })}
      </div>

      {/* Action buttons (Export & Edit & History) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {!editing ? (
          <>
            <button onClick={() => handleExport(ictRef, `Lich_PG_ICT_${safeStoreKey}_Tuan${activeWeek+1}_${monthKey}`)} disabled={capturing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all shadow-sm disabled:opacity-50 cursor-pointer">
              <Camera size={15} /> Xuất ảnh ICT
            </button>
            <button onClick={() => handleExport(dtdlgdRef, `Lich_PG_DTDLGD_${safeStoreKey}_Tuan${activeWeek+1}_${monthKey}`)} disabled={capturing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all shadow-sm disabled:opacity-50 cursor-pointer">
              <Camera size={15} /> Xuất ảnh ĐT-ĐL-GD
            </button>
            <button onClick={() => handleExport(allRef, `Lich_PG_ALL_${safeStoreKey}_Tuan${activeWeek+1}_${monthKey}`)} disabled={capturing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 shadow-md transition-all disabled:opacity-50 cursor-pointer">
              <Camera size={15} /> Xuất ảnh ALL
            </button>
            <button
              onClick={handleShareLink}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black rounded-xl border shadow-sm transition-all cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Chia sẻ link Lịch PG cho khách xem trực tiếp"
            >
              {copiedLink ? (
                <>
                  <Check size={15} className="text-emerald-600" /> Đã chép link {activeStoreName ? `ST ${activeStoreName}` : `Kho ${userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || ''}`}!
                </>
              ) : (
                <>
                  <Share2 size={15} className="text-emerald-600" /> Chia sẻ link
                </>
              )}
            </button>
            {canEdit && (
              <>
                <button onClick={handleStartEdit}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-xl hover:bg-emerald-200 shadow-sm transition-all cursor-pointer">
                  <Edit3 size={15} /> Chỉnh sửa
                </button>
                <button onClick={() => {
                  if (!editing) handleStartEdit();
                  setShowImportExcelModal(true);
                }}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-teal-800 bg-teal-100 border border-teal-300 rounded-xl hover:bg-teal-200 shadow-sm transition-all cursor-pointer"
                  title="Dán nhanh bảng phân ca từ Excel hoặc Office 365">
                  <FileSpreadsheet size={15} /> Dán từ Excel
                </button>
                <button
                  onClick={() => setShowCopyWeekModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-indigo-800 bg-indigo-50 border border-indigo-300 rounded-xl hover:bg-indigo-100 shadow-sm transition-all cursor-pointer"
                  title="Sao chép ca làm việc của tuần (VD: từ Tuần 5 Tháng 9 qua Tuần 1 Tháng 10)"
                >
                  <Copy size={15} /> Sao chép ca tuần
                </button>
              </>
            )}
            {is43751Admin && (
              <>
                <button
                  onClick={handleToggleUserEdit}
                  title={effectiveUserEditAllowed ? "Nhấn để Ẩn nút Chỉnh sửa của User khác" : "Nhấn để Mở quyền Chỉnh sửa cho User khác"}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black rounded-xl border shadow-sm transition-all cursor-pointer ${
                    effectiveUserEditAllowed
                      ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                  }`}
                >
                  {effectiveUserEditAllowed ? (
                    <>
                      <Lock size={15} /> Khóa quyền sửa (User đang ĐƯỢC sửa)
                    </>
                  ) : (
                    <>
                      <Unlock size={15} /> Mở quyền sửa (User đang BỊ KHÓA)
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setHistoryFilterPg('ALL'); setShowHistoryModal(true); }}
                  title="Xem lịch sử chỉnh sửa theo từng PG"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer"
                >
                  <History size={15} /> Lịch sử thay đổi
                  {historyLogs.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-black bg-indigo-600 text-white rounded-full">
                      {historyLogs.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleCancelEdit} className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-slate-700 bg-slate-100 border border-slate-300 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">
              <X size={15} /> Hủy
            </button>
            <button
              onClick={() => setShowImportExcelModal(true)}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-teal-800 bg-teal-50 border border-teal-300 rounded-xl hover:bg-teal-100 shadow-sm transition-all cursor-pointer"
              title="Dán bảng phân ca từ Excel hoặc Office 365 vào tuần đang chọn"
            >
              <FileSpreadsheet size={15} /> Dán từ Excel
            </button>
            <button
              onClick={() => setShowCopyWeekModal(true)}
              type="button"
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-indigo-800 bg-indigo-50 border border-indigo-300 rounded-xl hover:bg-indigo-100 shadow-sm transition-all cursor-pointer"
              title="Sao chép ca làm việc giữa các tuần hoặc khác tháng"
            >
              <Copy size={15} /> Sao chép ca tuần
            </button>
            <button
              onClick={handleCopyCurrentWeekToAll}
              type="button"
              title="Sao chép toàn bộ phân ca của tuần hiện tại sang tất cả các tuần khác trong tháng"
              className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-black text-teal-800 bg-teal-50 border border-teal-300 rounded-xl hover:bg-teal-100 shadow-sm transition-all cursor-pointer"
            >
              <Copy size={15} /> Sao chép Tuần {activeWeek + 1} sang tất cả các tuần
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 text-[13px] font-black text-white bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl hover:from-green-700 hover:to-emerald-800 shadow-md disabled:opacity-50 transition-all cursor-pointer">
              {saving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Save size={15} />}
              {saving ? 'Đang lưu...' : 'Lưu tất cả'}
            </button>
          </div>
        )}
        {capturing && <span className="flex items-center text-[12px] font-medium text-slate-500"><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-emerald-500 mr-1.5" /> Đang chụp...</span>}
      </div>

      {/* Tables */}
      {weeks[activeWeek] && (
        <div ref={allRef} className="bg-transparent" style={{ padding: '4px 0' }}>
          <div ref={ictRef} style={{ marginBottom: '20px' }}>
            <ScheduleTable
              title="LỊCH LÀM VIỆC ( ICT )"
              storeName={activeStoreName}
              roster={ictRoster}
              weekShifts={curWeek.ict}
              onRosterChange={setIctRoster}
              onShiftsChange={setICTShifts}
              editing={editing}
              weekDates={weeks[activeWeek].dates}
              currentMonth={selectedMonth}
              category="ICT"
              shiftOpts={allShiftOptions}
              customShifts={customShifts}
              is43751Admin={is43751Admin}
              onViewPgHistory={(pgName) => { setHistoryFilterPg(pgName); setShowHistoryModal(true); }}
              onMoveToOtherCategory={handleMoveIctToDtdlgd}
            />
          </div>
          <div ref={dtdlgdRef}>
            <ScheduleTable
              title="LỊCH LÀM VIỆC ( ĐIỆN TỬ - ĐIỆN LẠNH - GIA DỤNG )"
              storeName={activeStoreName}
              roster={dtdlgdRoster}
              weekShifts={curWeek.dtdlgd}
              onRosterChange={setDtdlgdRoster}
              onShiftsChange={setDTDLGDShifts}
              editing={editing}
              weekDates={weeks[activeWeek].dates}
              currentMonth={selectedMonth}
              category="DTDLGD"
              shiftOpts={allShiftOptions}
              customShifts={customShifts}
              is43751Admin={is43751Admin}
              onViewPgHistory={(pgName) => { setHistoryFilterPg(pgName); setShowHistoryModal(true); }}
              onMoveToOtherCategory={handleMoveDtdlgdToIct}
            />
          </div>
        </div>
      )}

      {/* History Modal (43751 only) */}
      {is43751Admin && (
        <PGHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          logs={historyLogs}
          allPgNames={allPgNames}
          initialFilterPg={historyFilterPg}
          customShifts={customShifts}
        />
      )}

      {/* Import Excel Modal */}
      <ImportExcelShiftModal
        isOpen={showImportExcelModal}
        onClose={() => setShowImportExcelModal(false)}
        activeWeekIndex={activeWeek}
        weeks={weeks}
        ictRoster={ictRoster}
        dtdlgdRoster={dtdlgdRoster}
        customShifts={customShifts}
        onApply={handleApplyImportExcel}
      />

      {/* Copy Week Shifts Modal */}
      <CopyWeekShiftModal
        isOpen={showCopyWeekModal}
        onClose={() => setShowCopyWeekModal(false)}
        currentYear={selectedYear}
        currentMonth={selectedMonth}
        currentWeekIndex={activeWeek}
        allMonthsData={allMonthsDataForModal}
        currentIctRoster={ictRoster}
        currentDtdlgdRoster={dtdlgdRoster}
        currentAllWeekData={allWeekData}
        customShifts={customShifts}
        activeStoreName={activeStoreName}
        onApplyCopy={handleApplyCopyWeek}
      />

      {/* Image Preview Popup */}
      {previewImg && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4" onClick={() => setPreviewImg(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-[96vw] max-h-[95vh] flex flex-col z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-800">{previewTitle || 'Ảnh Lịch PG'}</span>
                {copied ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold shadow-sm animate-pulse">
                    <Check size={14} className="text-emerald-700" /> Đã tự động copy ảnh vào bộ nhớ tạm! (Sẵn sàng Ctrl + V để dán)
                  </span>
                ) : (
                  <span className="text-[12px] text-slate-400">📱 Nhấn vào ảnh để mở · 💻 Chuột phải hoặc bấm Sao chép để dán</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-lg transition-all shadow-sm cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                  title="Sao chép ảnh vào clipboard để dán Zalo/Facebook"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Đã sao chép!' : 'Sao chép lại'}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-lg bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition-all shadow-sm cursor-pointer"
                  title="Tải ảnh PNG về máy tính / điện thoại"
                >
                  <Download size={14} /> Tải ảnh
                </button>
                <button
                  onClick={() => setPreviewImg(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors ml-1 cursor-pointer"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-auto p-4 flex justify-center bg-slate-50" style={{ maxHeight: 'calc(95vh - 60px)' }}>
              <img
                src={previewImg}
                alt="Preview"
                className="max-w-full h-auto rounded-lg shadow-md cursor-pointer border border-slate-200"
                onClick={() => window.open(previewImg!, '_blank')}
                title="Nhấn để mở ảnh gốc trong tab mới"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LichLamViecPG;
