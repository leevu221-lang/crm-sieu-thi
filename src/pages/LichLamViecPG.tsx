import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Plus, Trash2, Save, Edit3, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, ArrowLeftRight, Camera, Download, Copy, Check, Lock, Unlock, History, Search, Filter, ArrowRight, Clock, User, Share2, Store, FileSpreadsheet, ClipboardPaste, AlertCircle } from 'lucide-react';
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

// ─── Shift color mapping (Pastel Soft UI / Tinted Pills: Tone 300 nền / Tone 900 chữ) ─
const PRESET_COLORS = [
  { bg: '#93c5fd', text: '#1e3a8a', border: '#60a5fa' },   // blue (blue-300 / blue-900)
  { bg: '#c4b5fd', text: '#4c1d95', border: '#a78bfa' },   // violet (violet-300 / violet-900)
  { bg: '#67e8f9', text: '#164e63', border: '#22d3ee' },   // cyan (cyan-300 / cyan-900)
  { bg: '#fcd34d', text: '#78350f', border: '#fbbf24' },   // amber (amber-300 / amber-900)
  { bg: '#f9a8d4', text: '#831843', border: '#f472b6' },   // pink (pink-300 / pink-900)
  { bg: '#5eead4', text: '#134e4a', border: '#2dd4bf' },   // teal (teal-300 / teal-900)
  { bg: '#fdba74', text: '#7c2d12', border: '#fb923c' },   // orange (orange-300 / orange-900)
  { bg: '#a5b4fc', text: '#312e81', border: '#818cf8' },   // indigo (indigo-300 / indigo-900)
  { bg: '#bef264', text: '#365314', border: '#a3e635' },   // lime (lime-300 / lime-900)
  { bg: '#d8b4fe', text: '#581c87', border: '#c084fc' },   // purple (purple-300 / purple-900)
];

const baseShiftStyles: Record<string, { bg: string; text: string; border: string }> = {
  'Ca sáng':   { bg: '#86efac', text: '#14532d', border: '#4ade80' }, // green-300 / green-900
  'Ca Chiều':  { bg: '#c4b5fd', text: '#4c1d95', border: '#a78bfa' }, // violet-300 / violet-900
  'Ca Gãy':    { bg: '#fde047', text: '#713f12', border: '#facc15' }, // yellow-300 / yellow-900
  'OFF':       { bg: '#fca5a5', text: '#7f1d1d', border: '#f87171' }, // red-300 / red-900
  'ST khác':   { bg: '#93c5fd', text: '#1e3a8a', border: '#60a5fa' }, // blue-300 / blue-900
  '':          { bg: '#f8fafc', text: '#94a3b8', border: '#cbd5e1' },
};

const BASE_SHIFTS: string[] = ['Ca sáng', 'Ca Chiều', 'Ca Gãy', 'OFF', 'ST khác'];

function getShiftStyle(name: string, customShifts: string[]): { bg: string; text: string; border: string } {
  if (baseShiftStyles[name]) return baseShiftStyles[name];
  const idx = customShifts.indexOf(name);
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

// ─── Shift cell ────────────────────────────────────────────────────────────────
const ShiftCell: React.FC<{
  value: ShiftType; onChange: (v: ShiftType) => void; editable: boolean;
  options: string[]; customShifts: string[];
}> = ({ value, onChange, editable, options, customShifts }) => {
  const s = getShiftStyle(value, customShifts);
  if (!editable) {
    return (
      <td className="px-1 py-2.5 text-center border whitespace-nowrap" style={{ borderColor: '#cbd5e1', height: '46px', minWidth: 95, whiteSpace: 'nowrap' }}>
        {value ? (
          <span style={{ backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border || s.bg}`, borderRadius: '6px', padding: '4px 8.5px', fontSize: '12px', fontWeight: 800, display: 'inline-block', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
            {value}
          </span>
        ) : (
          <span style={{ color: '#cbd5e1', fontSize: '12px', whiteSpace: 'nowrap' }}>—</span>
        )}
      </td>
    );
  }
  return (
    <td className="p-0 border whitespace-nowrap" style={{ borderColor: '#cbd5e1', height: '46px', minWidth: 95, whiteSpace: 'nowrap' }}>
      <select value={value} onChange={e => onChange(e.target.value as ShiftType)}
        onDragStart={e => e.stopPropagation()}
        className="w-full h-full px-0.5 py-2.5 text-[12px] font-bold text-center border-0 outline-none cursor-pointer whitespace-nowrap"
        style={{ backgroundColor: s.bg, color: s.text, minWidth: 95, minHeight: '46px', whiteSpace: 'nowrap' }}>
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
}> = ({ title, storeName, roster, weekShifts, onRosterChange, onShiftsChange, editing, weekDates, currentMonth, category, shiftOpts, customShifts, is43751Admin, onViewPgHistory, onMoveToOtherCategory }) => {
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

  const dayNotes: Record<number, string> = { 3: '(ưu tiên\nca chiều)', 6: '(ưu tiên\nca chiều)' };

  return (
    <div className="mb-6 w-full overflow-x-auto no-scrollbar max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div style={{ minWidth: 1450, width: 'max-content' }} className="pb-2">
        <div className="text-center py-4 font-utm-avo font-black text-2xl sm:text-[25px] tracking-wider uppercase w-full"
          style={{
            fontFamily: 'var(--font-utm-avo), "UTM Avo", sans-serif',
            background: category === 'DTDLGD'
              ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 50%, #86efac 100%)'
              : 'linear-gradient(135deg, #fef08a 0%, #fde68a 50%, #fde047 100%)',
            color: category === 'DTDLGD' ? '#14532d' : '#78350f',
            border: '1.5px solid #cbd5e1',
            borderBottom: '2.5px solid #cbd5e1',
            borderRadius: '10px 10px 0 0',
            letterSpacing: '2px',
            boxSizing: 'border-box'
          }}>
          <div>{title}</div>
          {storeName && (
            <div className="text-sm font-bold tracking-normal normal-case mt-1 opacity-90"
              style={{ color: category === 'DTDLGD' ? '#166534' : '#854d0e' }}>
              Siêu thị: <span className="font-extrabold uppercase">{storeName}</span>
            </div>
          )}
        </div>
        <div className="border border-slate-300 w-full" style={{ borderRadius: '0 0 10px 10px', boxSizing: 'border-box', borderColor: '#cbd5e1' }}>
          <table className="w-full border-collapse" style={{ width: '100%', minWidth: 1450, tableLayout: 'auto' }}>
            <thead>
            <tr>
              {editing && (
                <th className="px-1 py-2 border text-[11px] font-black text-center uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: '#e2e8f0', color: '#1e293b', borderColor: '#cbd5e1', minWidth: 75, whiteSpace: 'nowrap' }}>
                  VỊ TRÍ
                </th>
              )}
              <th className="px-2 py-2 border text-[12px] font-black text-center uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: '#e2e8f0', color: '#1e293b', borderColor: '#cbd5e1', minWidth: 45, whiteSpace: 'nowrap' }}>STT</th>
              <th className="px-2 py-2 border text-[12px] font-black text-left uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: '#e2e8f0', color: '#1e293b', borderColor: '#cbd5e1', minWidth: 180, whiteSpace: 'nowrap' }}>TÊN PG HÃNG</th>
              {weekDates.map((d, i) => {
                const isSunday = d.getDay() === 0;
                return (
                  <th key={i} className="px-1 py-1.5 border text-center whitespace-nowrap"
                    style={{
                      borderColor: '#cbd5e1',
                      minWidth: 95,
                      whiteSpace: 'nowrap',
                      backgroundColor: isSunday ? '#fecdd3' : '#bae6fd',
                      color: isSunday ? '#9f1239' : '#0369a1',
                    }}>
                    <div className="text-[12px] font-black whitespace-nowrap" style={{ color: isSunday ? '#9f1239' : '#0369a1' }}>{dayName(d)}</div>
                    <div className="text-[11px] font-bold whitespace-nowrap" style={{ color: isSunday ? '#be123c' : '#0284c7' }}>{fmtDate(d)}</div>
                    {dayNotes[i] && <div className="text-[10px] font-semibold whitespace-pre-line leading-tight mt-0.5" style={{ color: isSunday ? '#9f1239' : '#0284c7' }}>{dayNotes[i]}</div>}
                  </th>
                );
              })}
              <th className="px-1 py-1.5 border text-[12px] font-black text-center uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: '#fef08a', color: '#713f12', borderColor: '#cbd5e1', minWidth: 320, whiteSpace: 'nowrap' }}>
                <div className="font-black mb-0.5 text-[#713f12] whitespace-nowrap">NOTE</div>
                <div className="text-[10px] font-bold text-[#14532d] normal-case whitespace-nowrap">Ca Sáng: 8h-16h</div>
                <div className="text-[10px] font-bold text-[#581c87] normal-case whitespace-nowrap">Ca Chiều: 13h-21h</div>
                <div className="text-[10px] font-bold text-[#b45309] normal-case whitespace-nowrap">Ca Gãy: 8h-12h - 16h-21h</div>
              </th>
              <th className="px-1 py-2 border text-[12px] font-black text-center uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: '#e9d5ff', color: '#581c87', borderColor: '#cbd5e1', minWidth: 230, whiteSpace: 'nowrap' }}>SDT SUP + Tên</th>
              {editing && (
                <th className="px-1 py-2 border text-[11px] font-black text-center uppercase tracking-wider whitespace-nowrap" style={{ backgroundColor: '#e2e8f0', color: '#1e293b', borderColor: '#cbd5e1', minWidth: 110, whiteSpace: 'nowrap' }}>
                  THAO TÁC
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 && !editing ? (
              <tr><td colSpan={12} className="text-center py-6 text-xs text-slate-400 italic">Chưa có dữ liệu. Nhấn "Chỉnh sửa" để thêm PG.</td></tr>
            ) : roster.map((pg, idx) => {
              const ws = weekShifts[pg.id] || emptyShifts();
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx && draggedIndex !== null && draggedIndex !== idx;
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
                    backgroundColor: isDragging ? '#fef3c7' : (isDragOver ? '#ecfdf5' : (idx % 2 === 0 ? '#ffffff' : '#f8fafc')),
                    borderBottom: isDragOver ? '2px solid #10b981' : '1px solid #cbd5e1',
                    opacity: isDragging ? 0.4 : 1,
                    minHeight: '46px',
                    transition: 'background-color 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  {editing && (
                    <td className="px-1 py-2.5 border text-center" style={{ borderColor: '#cbd5e1', height: '46px' }}>
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
                  <td className="px-2 py-2.5 border text-center text-[13px] font-bold text-black whitespace-nowrap" style={{ borderColor: '#cbd5e1', minWidth: 45, height: '46px', whiteSpace: 'nowrap' }}>{idx + 1}</td>
                  <td className="px-2 py-2.5 border text-[13px] font-bold text-slate-800 whitespace-nowrap" style={{ borderColor: '#cbd5e1', minWidth: 180, height: '46px', whiteSpace: 'nowrap' }}>
                    {editing ? (
                      <input value={pg.tenPgHang} onChange={e => updateName(pg.id, e.target.value)}
                        onDragStart={e => e.stopPropagation()}
                        className="w-full px-1.5 py-1.5 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-400 outline-none font-bold"
                        placeholder="VD: Ngọc Trâm - Realme" />
                    ) : (
                      <div className="flex items-center justify-between gap-1 whitespace-nowrap">
                        <span className="font-bold whitespace-nowrap">{pg.tenPgHang || '—'}</span>
                        {is43751Admin && pg.tenPgHang && (
                          <button
                            onClick={() => onViewPgHistory?.(pg.tenPgHang)}
                            title={`Xem lịch sử thay đổi của ${pg.tenPgHang}`}
                            className="p-1 rounded text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <History size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  {ws.shifts.map((shift, di) => (
                    <ShiftCell key={di} value={shift} onChange={v => updateShift(pg.id, di, v)} editable={editing} options={shiftOpts} customShifts={customShifts} />
                  ))}
                  <td className="px-2 py-2.5 border text-[13px] text-slate-700" style={{ borderColor: '#cbd5e1', minWidth: 320, height: '46px' }}>
                    {editing ? (
                      <textarea value={pg.note} onChange={e => updateNote(pg.id, e.target.value)}
                        onDragStart={e => e.stopPropagation()}
                        className="w-full px-1.5 py-1 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-400 outline-none resize-none" rows={2} placeholder="Ca sáng 9h-15h..." />
                    ) : <span className="whitespace-pre-line text-[12.5px] leading-snug">{pg.note || '—'}</span>}
                  </td>
                  <td className="px-2 py-2.5 border text-[13px] text-slate-700 whitespace-nowrap" style={{ borderColor: '#cbd5e1', minWidth: 230, height: '46px', whiteSpace: 'nowrap' }}>
                    {editing ? (
                      <input value={pg.sdtSup} onChange={e => updateSdt(pg.id, e.target.value)}
                        onDragStart={e => e.stopPropagation()}
                        className="w-full px-1.5 py-1 border border-slate-300 rounded text-[13px] focus:ring-1 focus:ring-green-400 outline-none" placeholder="0901234567 (Tên)" />
                    ) : <span className="text-[13px] leading-relaxed whitespace-nowrap font-medium">{pg.sdtSup || '—'}</span>}
                  </td>
                  {editing && (
                    <td className="px-1 py-2.5 border text-center" style={{ borderColor: '#cbd5e1', minWidth: 110, height: '46px' }}>
                      <div className="flex items-center justify-center gap-1">
                        {onMoveToOtherCategory && (
                          <button
                            type="button"
                            onClick={() => onMoveToOtherCategory(pg)}
                            title={category === 'ICT' ? 'Chuyển sang nhóm ĐIỆN TỬ - ĐIỆN LẠNH - GIA DỤNG' : 'Chuyển sang nhóm ICT'}
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
            })}
          </tbody>
        </table>
      </div>
      {editing && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <button onClick={addPG} className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 shadow-sm transition-colors cursor-pointer">
            <Plus size={13} /> Thêm PG ({category})
          </button>
          <span className="text-[11.5px] font-medium text-slate-400 italic">
            💡 Mẹo: Nhấn nút mũi tên ↑/↓ hoặc kéo thả dòng để thay đổi vị trí PG trong nhóm.
          </span>
        </div>
      )}
      </div>
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
                              <span style={{ backgroundColor: oldStyle.bg, color: oldStyle.text }} className="px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">
                                {c.oldValue}
                              </span>
                              <ArrowRight size={12} className="text-slate-400" />
                              <span style={{ backgroundColor: newStyle.bg, color: newStyle.text }} className="px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">
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
                <table className="w-full text-xs border-collapse">
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
                                    border: `1px solid ${sStyle.border || sStyle.bg}`
                                  }}
                                  className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold whitespace-nowrap"
                                >
                                  {sVal}
                                </span>
                              ) : (
                                <span className="text-slate-300">—</span>
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
      el.style.width = 'max-content';
      el.style.minWidth = '1450px';
      el.style.overflow = 'visible';
      el.style.maxHeight = 'none';
      
      // All child overflow containers
      const overflowEls = el.querySelectorAll<HTMLElement>('.overflow-x-auto, .overflow-y-auto, .overflow-hidden, [class*="overflow"]');
      overflowEls.forEach(child => {
        savedStyles.push({ el: child, props: { overflow: child.style.overflow, width: child.style.width, minWidth: child.style.minWidth, maxWidth: child.style.maxWidth, maxHeight: child.style.maxHeight } });
        child.style.overflow = 'visible';
        child.style.width = 'max-content';
        child.style.minWidth = '1450px';
        child.style.maxWidth = 'none';
        child.style.maxHeight = 'none';
      });
      
      // Ensure tables expand fully without wrapping
      const tables = el.querySelectorAll<HTMLTableElement>('table');
      tables.forEach(tbl => {
        savedStyles.push({ el: tbl, props: { width: tbl.style.width, minWidth: tbl.style.minWidth, tableLayout: tbl.style.tableLayout } });
        tbl.style.width = '100%';
        tbl.style.minWidth = '1450px';
        tbl.style.tableLayout = 'auto';
      });

      // ★ Ensure UTM Avo font is fully loaded before export
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
  const [historyFilterPg, setHistoryFilterPg] = useState<string>('ALL');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareLink = () => {
    const currentKho = userProfile?.ma_kho || localStorage.getItem('rtst_ma_kho') || '';
    if (!currentKho) return;
    const shareUrl = buildGuestShareUrl('lichpg', currentKho, '', activeStoreName);
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {});
    }
  };
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
      }

      // If store doc has no valid PG data, fallback to sibling stores in same cluster/warehouse
      if (!editingRef.current && availableStores && availableStores.length > 1) {
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
  
  // Rule: Lock editing if the week's start date is less than the current date.
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const activeWeekStart = weeks[activeWeek] ? new Date(weeks[activeWeek].dates[0]) : new Date();
  activeWeekStart.setHours(0, 0, 0, 0);
  
  const isPastWeek = activeWeekStart < todayDate;
  const weekKeyStr = `week${activeWeek + 1}`;
  const override = allowUserEdit[weekKeyStr];
  const effectiveUserEditAllowed = override !== undefined ? override : !isPastWeek;
  const canEdit = effectiveUserEditAllowed;

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
    <div className="p-3 md:p-5 max-w-[1500px] mx-auto">
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
        {BASE_SHIFTS.map(o => { const s = getShiftStyle(o, customShifts); return <span key={o} className="px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border" style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border || s.bg, letterSpacing: '0.3px' }}>{o}</span>; })}
        {customShifts.map(o => { const s = getShiftStyle(o, customShifts); return (
          <span key={o} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border" style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border || s.bg, letterSpacing: '0.3px' }}>
            {o}
            {editing && <button onClick={() => { setCustomShifts(prev => prev.filter(x => x !== o)); }} className="ml-0.5 hover:opacity-70"><X size={10} /></button>}
          </span>
        ); })}
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
        <div ref={allRef} className="bg-white" style={{ padding: '8px 0' }}>
          <div ref={ictRef} style={{ marginBottom: '24px' }}>
            <ScheduleTable
              title="LỊCH LÀM VIỆC  ( ICT )"
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
              title="LỊCH LÀM VIỆC  ( ĐIỆN TỬ - ĐIỆN LẠNH - GIA DỤNG )"
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
