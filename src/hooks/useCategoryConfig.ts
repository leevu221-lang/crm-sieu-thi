import { useState, useEffect, useMemo, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getCachedDoc, setCachedDoc } from '../services/cachedFirestore';
import { cleanCategoryName } from '../pages/RTST/utils';

export type CategoryGroupType = 'ICT' | 'DỊCH VỤ' | 'CE';

export interface CategoryConfigItem {
  /**
   * Mã định danh ổn định (Stable ID), ví dụ: "cat_maylanh".
   * Không bao giờ thay đổi khi Admin sửa tên hiển thị (name).
   */
  id?: string;
  /**
   * Tên ngành hàng hiển thị chuẩn (Master Display Name)
   */
  name: string;
  /**
   * Nhóm ngành hàng: "ICT" | "DỊCH VỤ" | "CE"
   */
  group: string;
  /**
   * Thứ tự hiển thị chuẩn (0-based)
   */
  order?: number;
  /**
   * Trạng thái hoạt động (true = đang hoạt động, false = ngừng sử dụng / soft-delete để bảo toàn lịch sử)
   */
  isActive?: boolean;
  /**
   * Danh sách các tên/khóa cũ đã từng sử dụng trước khi đổi tên (Aliases).
   * Dùng để duy trì liên kết với dữ liệu BI/lịch sử khi đổi tên ngành hàng.
   */
  aliases?: string[];
}

export interface CategoryConflictWarning {
  type: 'DUPLICATE_ID' | 'DUPLICATE_NAME' | 'ALIAS_CONFLICT';
  key: string;
  affectedIds: string[];
  affectedNames: string[];
  message: string;
}

export interface ResolvedCategoryInfo {
  /** Mã định danh chuẩn (nếu đã ánh xạ: item.id; nếu chưa ánh xạ: "unmapped_" + cleanKey) */
  id: string;
  /** Khóa định danh chuẩn dùng để liên kết dữ liệu (tương đương id khi đã ánh xạ, hoặc cleanKey khi chưa ánh xạ) */
  canonicalKey: string;
  /** Tên hiển thị chuẩn (nếu đã ánh xạ: item.name từ Cấu hình; nếu chưa ánh xạ: giữ nguyên rawName gốc) */
  displayName: string;
  /** Tên gốc từ dữ liệu BI */
  rawName: string;
  /** Nhóm ngành hàng ("ICT" | "DỊCH VỤ" | "CE") */
  group: CategoryGroupType;
  /** Thứ tự sắp xếp (nếu chưa ánh xạ: 999999 để xếp sau danh mục chuẩn nhưng giữ nguyên dữ liệu) */
  order: number;
  /** Alias cho order để đồng nhất với getCategoryOrderIndex */
  orderIndex: number;
  /** Trạng thái hoạt động (mặc định true cho ngành chưa ánh xạ để không bao giờ tự động xóa/bỏ qua) */
  isActive: boolean;
  /** Đánh dấu đã được ánh xạ với TNB LEADER → CẤU HÌNH hay chưa */
  isMapped: boolean;
  /** Đánh dấu chưa ánh xạ (!isMapped) để Admin kiểm tra */
  isUnmapped: boolean;
  /** Đánh dấu nếu tên/alias bị xung đột giữa nhiều ngành hàng (không tự ý gộp) */
  isAmbiguous: boolean;
  /** Phương thức khớp */
  matchedBy: 'exact_id' | 'exact_name' | 'clean_name' | 'alias' | 'unmapped' | 'ambiguous';
  /** Tham chiếu đến item cấu hình gốc nếu tìm thấy */
  masterItem: CategoryConfigItem | null;
  /** Alias cho masterItem */
  item: CategoryConfigItem | null;
}

export interface UnmappedCategoryRecord {
  rawName: string;
  cleanKey: string;
  sources: string[];
  firstSeenAt: string;
}

/**
 * Chuẩn hóa tên nhóm ngành hàng về 1 trong 3 nhóm chuẩn: 'ICT' | 'DỊCH VỤ' | 'CE'
 */
export function normalizeCategoryGroup(group?: string): CategoryGroupType {
  if (!group) return 'CE';
  const upper = group.trim().toUpperCase();
  if (upper.includes('ICT')) return 'ICT';
  if (upper.includes('DỊCH VỤ') || upper.includes('DICH VU') || upper === 'DV') return 'DỊCH VỤ';
  return 'CE';
}

/**
 * Tạo mã định danh ngành hàng ổn định (Stable ID) từ tên ban đầu.
 * Khi ngành hàng đã có ID, hệ thống luôn giữ nguyên ID đó kể cả khi đổi tên.
 */
export function generateStableCategoryId(name: string, usedIds?: Set<string>): string {
  const clean = cleanCategoryName(name || '');
  const fallbackSlug = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  const baseSlug = clean || fallbackSlug || 'category';
  const baseId = baseSlug.startsWith('cat_') ? baseSlug : `cat_${baseSlug}`;

  if (!usedIds) return baseId;

  let candidate = baseId;
  let counter = 2;
  while (usedIds.has(candidate)) {
    candidate = `${baseId}_${counter}`;
    counter++;
  }
  usedIds.add(candidate);
  return candidate;
}

const RAW_DEFAULT_TNB_LEADER_CATEGORIES: Array<{ id: string; name: string; group: CategoryGroupType }> = [
  // ICT (13 ngành hàng)
  { id: 'cat_dienthoairealme', name: 'T11 - Điện thoại Realme', group: 'ICT' },
  { id: 'cat_dienthoaivivo', name: 'T11 - Điện thoại Vivo', group: 'ICT' },
  { id: 'cat_dienthoaitabletandroid', name: 'T11 - ĐIỆN THOẠI & TABLET ANDROID', group: 'ICT' },
  { id: 'cat_camera', name: 'T11 - Camera', group: 'ICT' },
  { id: 'cat_tainghe', name: 'T11 - Tai nghe', group: 'ICT' },
  { id: 'cat_capsac', name: 'T11 - Cáp sạc', group: 'ICT' },
  { id: 'cat_dongho', name: 'T11 - Đồng hồ & Smartwatch', group: 'ICT' },
  { id: 'cat_laptop', name: 'T11 - Laptop', group: 'ICT' },
  { id: 'cat_pkitnhomkhac', name: 'T11 - Phụ kiện khác IT & Nhóm khác', group: 'ICT' },
  { id: 'cat_pkcongnghe', name: 'T11 - Phụ kiện công nghệ', group: 'ICT' },
  { id: 'cat_sacduphong', name: 'T11 - Sạc dự phòng', group: 'ICT' },
  { id: 'cat_topzone', name: 'T11 - Topzone', group: 'ICT' },
  { id: 'cat_audio', name: 'T11 - Loa', group: 'ICT' },

  // DỊCH VỤ (14 ngành hàng)
  { id: 'cat_bhtho', name: 'T11 - Bảo hiểm Thợ', group: 'DỊCH VỤ' },
  { id: 'cat_napruttientaikhoannganhang', name: 'T11 - Nạp rút', group: 'DỊCH VỤ' },
  { id: 'cat_bhtong', name: 'T11 - Bảo hiểm Tổng', group: 'DỊCH VỤ' },
  { id: 'cat_bhthodmx', name: 'T11 - Bảo hiểm Thợ ĐMX', group: 'DỊCH VỤ' },
  { id: 'cat_simtong', name: 'T11 - Sim', group: 'DỊCH VỤ' },
  { id: 'cat_vas', name: 'T11 - VAS', group: 'DỊCH VỤ' },
  { id: 'cat_vaytienmat', name: 'T11 - Vay tiền mặt', group: 'DỊCH VỤ' },
  { id: 'cat_trachamfecreditshinhansamsungfinance', name: 'T11 - Trả chậm FECREDIT, SAMSUNG F+ , SHINHAN, MCREDIT', group: 'DỊCH VỤ' },
  { id: 'cat_trachamhomecredit', name: 'T11 - Trả chậm Homecredit', group: 'DỊCH VỤ' },
  { id: 'cat_trachamdienmaygd', name: 'T11 - Trả Chậm Điện máy & Gia dụng', group: 'DỊCH VỤ' },
  { id: 'cat_simmobifonesimdmx', name: 'T11 - Sim ĐMX', group: 'DỊCH VỤ' },
  { id: 'cat_mothetindungtpbankevovpbankmwg', name: 'T11 - MỞ THẺ TÍN DỤNG VPBANK MWG VÀ TPBANK EVO', group: 'DỊCH VỤ' },
  { id: 'cat_vitrasau', name: 'T11 - Ví trả sau', group: 'DỊCH VỤ' },
  { id: 'cat_ottmangoicallme', name: 'T11 - OTT (Mango+, iCallMe)', group: 'DỊCH VỤ' },

  // CE (13 ngành hàng)
  { id: 'cat_celg', name: 'T11 - CE LG', group: 'CE' },
  { id: 'cat_dientutcl', name: 'T11 - Tivi TCL', group: 'CE' },
  { id: 'cat_dientu', name: 'T11 - Điện tử', group: 'CE' },
  { id: 'cat_maylocnuoc', name: 'T11 - Máy lọc nước', group: 'CE' },
  { id: 'cat_maygiat', name: 'T11 - Máy giặt', group: 'CE' },
  { id: 'cat_maysaymayruachen', name: 'T11 - Máy sấy / Máy rửa chén', group: 'CE' },
  { id: 'cat_tulanhtudongtumat', name: 'T11 - Tủ Lạnh / Đông / Mát', group: 'CE' },
  { id: 'cat_hutbui', name: 'T11 - Máy lọc KK - Hút bụi - Hút ẩm', group: 'CE' },
  { id: 'cat_maynuocnong', name: 'T11 - Máy nước nóng', group: 'CE' },
  { id: 'cat_noicomnoichien', name: 'T11 - Nồi cơm & Nồi chiên', group: 'CE' },
  { id: 'cat_quatgio', name: 'T11 - Quạt gió', group: 'CE' },
  { id: 'cat_dennangluongmattroi', name: 'T11 - Đèn năng lượng mặt trời', group: 'CE' },
  { id: 'cat_maylanh', name: 'T11 - Máy Lạnh', group: 'CE' }
];

export const DEFAULT_TNB_LEADER_CATEGORIES: CategoryConfigItem[] = RAW_DEFAULT_TNB_LEADER_CATEGORIES.map(
  (item, idx) => ({
    id: item.id,
    name: item.name,
    group: item.group,
    order: idx,
    isActive: true,
    aliases: [],
  })
);

/**
 * Chuẩn hóa danh sách ngành hàng từ Firestore / LocalStorage / Default.
 * Đảm bảo tương thích ngược 100% với dữ liệu cấu hình cũ chỉ có { name, group }.
 */
export function normalizeCategoryConfigList(rawList: any[] | null | undefined): CategoryConfigItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_TNB_LEADER_CATEGORIES.map((item) => ({ ...item, aliases: [...(item.aliases || [])] }));
  }

  const usedIds = new Set<string>();
  const normalized: CategoryConfigItem[] = [];

  rawList.forEach((raw, idx) => {
    if (!raw || typeof raw !== 'object') return;
    const name = String(raw.name || '').trim();
    if (!name) return;

    const group = normalizeCategoryGroup(raw.group);
    let id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : '';

    if (id) {
      // Bảo toàn tuyệt đối ID đã có; nếu dữ liệu lỗi bị trùng ID thì thêm hậu tố an toàn
      if (usedIds.has(id)) {
        let suffix = 2;
        while (usedIds.has(`${id}_${suffix}`)) suffix++;
        id = `${id}_${suffix}`;
      }
      usedIds.add(id);
    } else {
      id = generateStableCategoryId(name, usedIds);
    }

    const rawAliases = Array.isArray(raw.aliases) ? raw.aliases : [];
    const seenAliasLower = new Set<string>();
    const currentNameLower = name.toLowerCase().normalize('NFC');
    const aliases: string[] = [];

    for (const a of rawAliases) {
      const aTrim = String(a || '').trim().normalize('NFC');
      if (!aTrim) continue;
      const aLower = aTrim.toLowerCase();
      if (aLower === currentNameLower) continue;
      if (!seenAliasLower.has(aLower)) {
        seenAliasLower.add(aLower);
        aliases.push(aTrim);
      }
    }

    const order = typeof raw.order === 'number' && !isNaN(raw.order) ? raw.order : idx;
    const isActive = raw.isActive !== false;

    normalized.push({
      id,
      name,
      group,
      order,
      isActive,
      aliases,
    });
  });

  return normalized.length > 0
    ? normalized
    : DEFAULT_TNB_LEADER_CATEGORIES.map((item) => ({ ...item, aliases: [...(item.aliases || [])] }));
}

/**
 * Đổi tên một ngành hàng nhưng giữ nguyên tuyệt đối ID ổn định và tự động lưu tên cũ vào Alias.
 */
export function applyCategoryRenameWithAlias(
  item: CategoryConfigItem,
  newName: string,
  committedOldName?: string
): CategoryConfigItem {
  const trimmedNew = String(newName || '').trim();
  const baseOldName = String(committedOldName !== undefined ? committedOldName : item.name || '').trim();
  const existingAliases = Array.isArray(item.aliases) ? [...item.aliases] : [];

  if (
    baseOldName &&
    trimmedNew &&
    baseOldName.toLowerCase().normalize('NFC') !== trimmedNew.toLowerCase().normalize('NFC')
  ) {
    const oldNorm = baseOldName.toLowerCase().normalize('NFC');
    const alreadyExists = existingAliases.some((a) => a.trim().toLowerCase().normalize('NFC') === oldNorm);
    if (!alreadyExists) {
      existingAliases.push(baseOldName);
    }
  }

  // Loại bỏ trường hợp tên mới trùng với một alias cũ trong chính ngành hàng đó
  const filteredAliases = existingAliases.filter(
    (a) => a.trim().toLowerCase().normalize('NFC') !== trimmedNew.toLowerCase().normalize('NFC')
  );

  return {
    ...item,
    id: item.id || generateStableCategoryId(baseOldName || trimmedNew),
    name: newName,
    aliases: filteredAliases,
  };
}

/**
 * Bật/tắt trạng thái hoạt động (Soft Delete / Archive) để bảo toàn dữ liệu lịch sử.
 */
export function toggleCategoryActiveStatus(
  list: CategoryConfigItem[],
  index: number,
  nextActive?: boolean
): CategoryConfigItem[] {
  return list.map((item, idx) => {
    if (idx !== index) return item;
    const currentActive = item.isActive !== false;
    return {
      ...item,
      isActive: nextActive !== undefined ? nextActive : !currentActive,
    };
  });
}

/**
 * Phát hiện trùng lặp ID, trùng tên ngành hàng hoặc xung đột Alias giữa các ngành hàng khác nhau.
 * Đảm bảo nguyên tắc: Không tự ý gộp các ngành hàng khi có xung đột.
 */
export function detectCategoryConflicts(list: CategoryConfigItem[]): CategoryConflictWarning[] {
  const warnings: CategoryConflictWarning[] = [];
  if (!Array.isArray(list) || list.length === 0) return warnings;

  const idMap = new Map<string, CategoryConfigItem[]>();
  const cleanNameMap = new Map<string, CategoryConfigItem[]>();
  const aliasOwnerMap = new Map<string, CategoryConfigItem[]>();

  for (const item of list) {
    const id = (item.id || '').trim();
    if (id) {
      const arr = idMap.get(id) || [];
      arr.push(item);
      idMap.set(id, arr);
    }

    if (item.isActive !== false) {
      const cleanName = cleanCategoryName(item.name || '');
      if (cleanName) {
        const arr = cleanNameMap.get(cleanName) || [];
        arr.push(item);
        cleanNameMap.set(cleanName, arr);
      }
    }

    const allKeysForThisItem = new Set<string>();
    const mainClean = cleanCategoryName(item.name || '');
    if (mainClean) allKeysForThisItem.add(mainClean);

    for (const alias of item.aliases || []) {
      const cAlias = cleanCategoryName(alias);
      if (cAlias) allKeysForThisItem.add(cAlias);
      const rawLower = alias.trim().toLowerCase().normalize('NFC');
      if (rawLower) allKeysForThisItem.add(`raw:${rawLower}`);
    }

    allKeysForThisItem.forEach((key) => {
      const owners = aliasOwnerMap.get(key) || [];
      owners.push(item);
      aliasOwnerMap.set(key, owners);
    });
  }

  idMap.forEach((items, id) => {
    if (items.length > 1) {
      warnings.push({
        type: 'DUPLICATE_ID',
        key: id,
        affectedIds: items.map((i) => i.id || ''),
        affectedNames: items.map((i) => i.name),
        message: `Trùng mã định danh ID "${id}" giữa: ${items.map((i) => `"${i.name}"`).join(', ')}`,
      });
    }
  });

  const reportedCleanKeys = new Set<string>();
  cleanNameMap.forEach((items, cleanKey) => {
    if (items.length > 1) {
      reportedCleanKeys.add(cleanKey);
      warnings.push({
        type: 'DUPLICATE_NAME',
        key: cleanKey,
        affectedIds: items.map((i) => i.id || ''),
        affectedNames: items.map((i) => i.name),
        message: `Trùng tên ngành hàng chuẩn hóa (${cleanKey}) giữa: ${items.map((i) => `"${i.name}"`).join(' và ')}`,
      });
    }
  });

  aliasOwnerMap.forEach((items, key) => {
    if (items.length > 1) {
      const uniqueIds = Array.from(new Set(items.map((i) => i.id || i.name)));
      if (uniqueIds.length > 1 && !reportedCleanKeys.has(key)) {
        warnings.push({
          type: 'ALIAS_CONFLICT',
          key,
          affectedIds: uniqueIds,
          affectedNames: items.map((i) => i.name),
          message: `Xung đột tên cũ (Alias "${key.replace(/^raw:/, '')}") đang liên kết đồng thời tới nhiều ngành hàng: ${items
            .map((i) => `"${i.name}"`)
            .join(' và ')}`,
        });
      }
    }
  });

  return warnings;
}

/**
 * Đối chiếu và chuẩn hóa danh sách ngành hàng trước khi lưu tại TNB LEADER → CẤU HÌNH:
 * - Bảo toàn ID ổn định của từng ngành hàng.
 * - Khi đổi tên, tự động đẩy tên cũ vào mảng `aliases` (không tạo ID mới).
 * - Cập nhật thứ tự `order` theo vị trí hiện tại.
 * - Phát hiện xung đột Alias hoặc trùng tên.
 */
export function reconcileCategoryConfigOnSave(
  draftList: CategoryConfigItem[],
  previousMasterList: CategoryConfigItem[] = []
): { items: CategoryConfigItem[]; conflicts: CategoryConflictWarning[] } {
  const normalizedPrev = normalizeCategoryConfigList(
    previousMasterList.length > 0 ? previousMasterList : DEFAULT_TNB_LEADER_CATEGORIES
  );

  const prevById = new Map<string, CategoryConfigItem>();
  normalizedPrev.forEach((p) => {
    if (p.id) prevById.set(p.id, p);
  });

  const claimedPrevIds = new Set<string>();
  const usedFinalIds = new Set<string>();

  // Pass 1: Khớp các mục đã có sẵn `id` (do chỉnh sửa trực tiếp trên bảng Cấu hình)
  const intermediate = draftList
    .map((item) => ({
      ...item,
      name: String(item?.name || '').trim(),
      group: normalizeCategoryGroup(item?.group),
    }))
    .filter((item) => item.name.length > 0);

  const reconciled: CategoryConfigItem[] = intermediate.map((draft, idx) => {
    let matchedPrev: CategoryConfigItem | undefined;

    if (draft.id && prevById.has(draft.id) && !claimedPrevIds.has(draft.id)) {
      matchedPrev = prevById.get(draft.id);
      claimedPrevIds.add(draft.id);
    }

    if (!matchedPrev) {
      // Nếu mục được dán từ văn bản chưa có ID, tìm xem có khớp duy nhất 1 mục trong previousMasterList không
      const draftLower = draft.name.toLowerCase().normalize('NFC');
      const draftClean = cleanCategoryName(draft.name);

      // 1. Khớp chính xác tên hiển thị
      const exactMatches = normalizedPrev.filter(
        (p) => p.id && !claimedPrevIds.has(p.id) && p.name.trim().toLowerCase().normalize('NFC') === draftLower
      );
      if (exactMatches.length === 1) {
        matchedPrev = exactMatches[0];
      } else if (exactMatches.length === 0 && draftClean) {
        // 2. Khớp duy nhất qua cleanCategoryName hoặc alias (chỉ nhận khi = 1 để không tự ý gộp)
        const cleanMatches = normalizedPrev.filter((p) => {
          if (!p.id || claimedPrevIds.has(p.id)) return false;
          if (cleanCategoryName(p.name) === draftClean) return true;
          return (p.aliases || []).some(
            (a) =>
              a.trim().toLowerCase().normalize('NFC') === draftLower ||
              cleanCategoryName(a) === draftClean
          );
        });
        if (cleanMatches.length === 1) {
          matchedPrev = cleanMatches[0];
        }
      }

      if (matchedPrev?.id) {
        claimedPrevIds.add(matchedPrev.id);
      }
    }

    if (matchedPrev) {
      let stableId = matchedPrev.id || generateStableCategoryId(matchedPrev.name, usedFinalIds);
      if (usedFinalIds.has(stableId)) {
        stableId = generateStableCategoryId(matchedPrev.name, usedFinalIds);
      } else {
        usedFinalIds.add(stableId);
      }

      // Gộp aliases từ bản lưu trước và bản nháp hiện tại
      const mergedAliases: string[] = [];
      const seenLower = new Set<string>();
      const pushAlias = (val: string) => {
        const t = String(val || '').trim().normalize('NFC');
        if (!t) return;
        const l = t.toLowerCase();
        if (l === draft.name.toLowerCase().normalize('NFC')) return;
        if (!seenLower.has(l)) {
          seenLower.add(l);
          mergedAliases.push(t);
        }
      };

      (matchedPrev.aliases || []).forEach(pushAlias);
      (draft.aliases || []).forEach(pushAlias);

      // Nếu tên hiển thị đã thay đổi so với bản lưu trước, tự động lưu tên cũ vào Alias
      if (
        matchedPrev.name.trim().toLowerCase().normalize('NFC') !==
        draft.name.trim().toLowerCase().normalize('NFC')
      ) {
        pushAlias(matchedPrev.name);
      }

      return {
        id: stableId,
        name: draft.name,
        group: draft.group,
        order: idx,
        isActive: draft.isActive !== undefined ? draft.isActive : matchedPrev.isActive !== false,
        aliases: mergedAliases,
      };
    }

    // Ngành hàng mới hoàn toàn
    const newId =
      draft.id && !usedFinalIds.has(draft.id)
        ? (usedFinalIds.add(draft.id), draft.id)
        : generateStableCategoryId(draft.name, usedFinalIds);

    return {
      id: newId,
      name: draft.name,
      group: draft.group,
      order: idx,
      isActive: draft.isActive !== false,
      aliases: Array.isArray(draft.aliases) ? [...draft.aliases] : [],
    };
  });

  const conflicts = detectCategoryConflicts(reconciled);
  return { items: reconciled, conflicts };
}

// ============================================================================
// HIGH-PERFORMANCE O(1) MASTER LOOKUP INDEX & UNMAPPED REGISTRY
// ============================================================================

interface CategoryMasterLookupIndex {
  byId: Map<string, CategoryConfigItem>;
  byExactName: Map<string, CategoryConfigItem[]>;
  byExactAlias: Map<string, CategoryConfigItem[]>;
  byCleanName: Map<string, CategoryConfigItem[]>;
  byCleanAlias: Map<string, CategoryConfigItem[]>;
}

const masterIndexCache = new WeakMap<CategoryConfigItem[], CategoryMasterLookupIndex>();

function getOrCreateMasterIndex(categoryConfig: CategoryConfigItem[]): CategoryMasterLookupIndex {
  const cached = masterIndexCache.get(categoryConfig);
  if (cached) return cached;

  const byId = new Map<string, CategoryConfigItem>();
  const byExactName = new Map<string, CategoryConfigItem[]>();
  const byExactAlias = new Map<string, CategoryConfigItem[]>();
  const byCleanName = new Map<string, CategoryConfigItem[]>();
  const byCleanAlias = new Map<string, CategoryConfigItem[]>();

  const pushToMap = (map: Map<string, CategoryConfigItem[]>, key: string, item: CategoryConfigItem) => {
    if (!key) return;
    const existing = map.get(key);
    if (existing) {
      if (!existing.some((x) => (x.id || x.name) === (item.id || item.name))) {
        existing.push(item);
      }
    } else {
      map.set(key, [item]);
    }
  };

  categoryConfig.forEach((rawItem, idx) => {
    if (!rawItem || !rawItem.name) return;
    const item: CategoryConfigItem = {
      ...rawItem,
      id: rawItem.id || `cat_${cleanCategoryName(rawItem.name) || idx}`,
      group: normalizeCategoryGroup(rawItem.group),
      order: typeof rawItem.order === 'number' ? rawItem.order : idx,
      isActive: rawItem.isActive !== false,
      aliases: Array.isArray(rawItem.aliases) ? rawItem.aliases : [],
    };

    if (item.id) {
      byId.set(item.id.trim().toLowerCase(), item);
    }

    const exactLower = item.name.trim().toLowerCase().normalize('NFC');
    pushToMap(byExactName, exactLower, item);

    const cleanKey = cleanCategoryName(item.name);
    if (cleanKey) {
      pushToMap(byCleanName, cleanKey, item);
    }

    for (const alias of item.aliases || []) {
      const aliasTrim = String(alias || '').trim().normalize('NFC');
      if (!aliasTrim) continue;
      pushToMap(byExactAlias, aliasTrim.toLowerCase(), item);
      const cleanAlias = cleanCategoryName(aliasTrim);
      if (cleanAlias) {
        pushToMap(byCleanAlias, cleanAlias, item);
      }
    }
  });

  const indexObj: CategoryMasterLookupIndex = {
    byId,
    byExactName,
    byExactAlias,
    byCleanName,
    byCleanAlias,
  };
  masterIndexCache.set(categoryConfig, indexObj);
  return indexObj;
}

// Bộ ghi nhận các ngành hàng từ BI chưa có trong cấu hình TNB LEADER
const unmappedCategoryRegistry = new Map<string, UnmappedCategoryRecord>();
const unmappedSubscribers = new Set<() => void>();
let pendingUnmappedNotify = false;

function notifyUnmappedSubscribers() {
  if (pendingUnmappedNotify || unmappedSubscribers.size === 0) return;
  pendingUnmappedNotify = true;
  const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (fn: () => void) => Promise.resolve().then(fn);
  schedule(() => {
    pendingUnmappedNotify = false;
    unmappedSubscribers.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  });
}

/**
 * Ghi nhận một ngành hàng xuất hiện trong dữ liệu BI nhưng chưa có trong TNB LEADER → CẤU HÌNH.
 * Không xóa hay bỏ qua dữ liệu; chỉ ghi nhận trạng thái để Admin kiểm tra.
 */
export function recordUnmappedCategory(rawName: string, sourceModule = 'BI_DATA'): void {
  const trimmed = String(rawName || '').trim().normalize('NFC');
  if (!trimmed || trimmed === '-') return;
  const cleanKey = cleanCategoryName(trimmed) || trimmed.toLowerCase();
  const existing = unmappedCategoryRegistry.get(cleanKey);

  if (existing) {
    if (!existing.sources.includes(sourceModule)) {
      existing.sources.push(sourceModule);
      notifyUnmappedSubscribers();
    }
    return;
  }

  unmappedCategoryRegistry.set(cleanKey, {
    rawName: trimmed,
    cleanKey,
    sources: [sourceModule],
    firstSeenAt: new Date().toISOString(),
  });
  notifyUnmappedSubscribers();
}

/**
 * Lấy danh sách các ngành hàng chưa ánh xạ thực tế (đã loại trừ những ngành Admin vừa bổ sung vào cấu hình).
 */
export function getUnmappedCategories(categoryConfig?: CategoryConfigItem[]): UnmappedCategoryRecord[] {
  const activeConfig =
    categoryConfig && categoryConfig.length > 0
      ? categoryConfig
      : globalCategoryConfigCache || DEFAULT_TNB_LEADER_CATEGORIES;

  const result: UnmappedCategoryRecord[] = [];
  unmappedCategoryRegistry.forEach((rec) => {
    const resolved = resolveCategoryMaster(rec.rawName, activeConfig, { recordUnmapped: false });
    if (resolved.isUnmapped) {
      result.push(rec);
    }
  });
  return result;
}

export function clearUnmappedCategories(): void {
  unmappedCategoryRegistry.clear();
  notifyUnmappedSubscribers();
}

/**
 * Hàm cốt lõi phân giải tên ngành hàng bất kỳ (từ BI hoặc lịch sử) sang danh mục Master SSOT.
 * - Ưu tiên khớp ID -> Tên hiển thị chính xác -> Alias chính xác -> Tên chuẩn hóa (cleanCategoryName) -> Alias chuẩn hóa.
 * - Nếu phát hiện xung đột (nhiều hơn 1 ngành hàng cùng khớp): KHÔNG tự ý gộp, đánh dấu `isAmbiguous: true` và giữ nguyên tên gốc.
 * - Nếu chưa tồn tại trong TNB LEADER: giữ nguyên `rawName`, giữ `isActive: true`, đánh dấu `isUnmapped: true`.
 */
export function resolveCategoryMaster(
  rawName: string,
  categoryConfig?: CategoryConfigItem[],
  options?: { recordUnmapped?: boolean; source?: string }
): ResolvedCategoryInfo {
  const rawStr = String(rawName || '');
  const trimmed = rawStr.trim().normalize('NFC');

  if (!trimmed || trimmed === '-') {
    return {
      id: '',
      canonicalKey: '',
      displayName: rawStr,
      rawName: rawStr,
      group: 'CE',
      order: 999999,
      orderIndex: 999999,
      isActive: true,
      isMapped: false,
      isUnmapped: true,
      isAmbiguous: false,
      matchedBy: 'unmapped',
      masterItem: null,
      item: null,
    };
  }

  const list =
    categoryConfig && categoryConfig.length > 0
      ? categoryConfig
      : globalCategoryConfigCache || DEFAULT_TNB_LEADER_CATEGORIES;

  const idx = getOrCreateMasterIndex(list);
  const lower = trimmed.toLowerCase();

  const buildResolved = (
    item: CategoryConfigItem,
    matchedBy: ResolvedCategoryInfo['matchedBy']
  ): ResolvedCategoryInfo => {
    const resolvedId = item.id || `cat_${cleanCategoryName(item.name)}`;
    const resolvedOrder = typeof item.order === 'number' ? item.order : 0;
    return {
      id: resolvedId,
      canonicalKey: resolvedId,
      displayName: item.name,
      rawName: rawStr,
      group: normalizeCategoryGroup(item.group),
      order: resolvedOrder,
      orderIndex: resolvedOrder,
      isActive: item.isActive !== false,
      isMapped: true,
      isUnmapped: false,
      isAmbiguous: false,
      matchedBy,
      masterItem: item,
      item,
    };
  };

  // 1. Khớp chính xác theo ID
  const byIdMatch = idx.byId.get(lower);
  if (byIdMatch) {
    return buildResolved(byIdMatch, 'exact_id');
  }

  // 2. Khớp chính xác theo Tên hiển thị chuẩn
  const exactNameMatches = idx.byExactName.get(lower);
  if (exactNameMatches && exactNameMatches.length === 1) {
    return buildResolved(exactNameMatches[0], 'exact_name');
  }
  if (exactNameMatches && exactNameMatches.length > 1) {
    const activeOnly = exactNameMatches.filter((x) => x.isActive !== false);
    if (activeOnly.length === 1) {
      return buildResolved(activeOnly[0], 'exact_name');
    }
    const fallbackKey = cleanCategoryName(trimmed) || lower;
    return {
      id: `ambiguous_${fallbackKey}`,
      canonicalKey: fallbackKey,
      displayName: trimmed,
      rawName: rawStr,
      group: normalizeCategoryGroup(exactNameMatches[0].group),
      order: 999999,
      orderIndex: 999999,
      isActive: true,
      isMapped: false,
      isUnmapped: true,
      isAmbiguous: true,
      matchedBy: 'ambiguous',
      masterItem: null,
      item: null,
    };
  }

  // 3. Khớp chính xác theo Alias đã lưu
  const exactAliasMatches = idx.byExactAlias.get(lower);
  if (exactAliasMatches && exactAliasMatches.length === 1) {
    return buildResolved(exactAliasMatches[0], 'alias');
  }
  if (exactAliasMatches && exactAliasMatches.length > 1) {
    const activeOnly = exactAliasMatches.filter((x) => x.isActive !== false);
    if (activeOnly.length === 1) {
      return buildResolved(activeOnly[0], 'alias');
    }
    // Không tự ý gộp khi xung đột alias
    const fallbackKey = cleanCategoryName(trimmed) || lower;
    return {
      id: `ambiguous_${fallbackKey}`,
      canonicalKey: fallbackKey,
      displayName: trimmed,
      rawName: rawStr,
      group: normalizeCategoryGroup(exactAliasMatches[0].group),
      order: 999999,
      orderIndex: 999999,
      isActive: true,
      isMapped: false,
      isUnmapped: true,
      isAmbiguous: true,
      matchedBy: 'ambiguous',
      masterItem: null,
      item: null,
    };
  }

  // 4. Khớp qua khóa chuẩn hóa cleanCategoryName (bỏ tiền tố tháng T09/T10/T11...)
  const cleanKey = cleanCategoryName(trimmed);
  if (cleanKey) {
    const cleanNameMatches = idx.byCleanName.get(cleanKey);
    if (cleanNameMatches && cleanNameMatches.length === 1) {
      return buildResolved(cleanNameMatches[0], 'clean_name');
    }
    if (cleanNameMatches && cleanNameMatches.length > 1) {
      const activeOnly = cleanNameMatches.filter((x) => x.isActive !== false);
      if (activeOnly.length === 1) {
        return buildResolved(activeOnly[0], 'clean_name');
      }
      return {
        id: `ambiguous_${cleanKey}`,
        canonicalKey: cleanKey,
        displayName: trimmed,
        rawName: rawStr,
        group: normalizeCategoryGroup(cleanNameMatches[0].group),
        order: 999999,
        orderIndex: 999999,
        isActive: true,
        isMapped: false,
        isUnmapped: true,
        isAmbiguous: true,
        matchedBy: 'ambiguous',
        masterItem: null,
        item: null,
      };
    }

    // 5. Khớp qua khóa chuẩn hóa của Alias (nhận diện tên cũ kể cả khi khác tiền tố tháng)
    const cleanAliasMatches = idx.byCleanAlias.get(cleanKey);
    if (cleanAliasMatches && cleanAliasMatches.length === 1) {
      return buildResolved(cleanAliasMatches[0], 'alias');
    }
    if (cleanAliasMatches && cleanAliasMatches.length > 1) {
      const activeOnly = cleanAliasMatches.filter((x) => x.isActive !== false);
      if (activeOnly.length === 1) {
        return buildResolved(activeOnly[0], 'alias');
      }
      return {
        id: `ambiguous_${cleanKey}`,
        canonicalKey: cleanKey,
        displayName: trimmed,
        rawName: rawStr,
        group: normalizeCategoryGroup(cleanAliasMatches[0].group),
        order: 999999,
        orderIndex: 999999,
        isActive: true,
        isMapped: false,
        isUnmapped: true,
        isAmbiguous: true,
        matchedBy: 'ambiguous',
        masterItem: null,
        item: null,
      };
    }
  }

  // 6. Chưa tồn tại trong TNB LEADER → CẤU HÌNH: Bảo toàn nguyên vẹn tên gốc và số liệu
  if (options?.recordUnmapped) {
    recordUnmappedCategory(trimmed, options.source || 'BI_DATA');
  }

  const unmappedKey = cleanKey || lower;
  return {
    id: `unmapped_${unmappedKey}`,
    canonicalKey: unmappedKey,
    displayName: trimmed,
    rawName: rawStr,
    group: 'CE',
    order: 999999,
    orderIndex: 999999,
    isActive: true,
    isMapped: false,
    isUnmapped: true,
    isAmbiguous: false,
    matchedBy: 'unmapped',
    masterItem: null,
    item: null,
  };
}

/**
 * Lấy khóa định danh chuẩn (Stable ID) để liên kết dữ liệu nghiệp vụ.
 * Khi đổi tên ngành hàng, khóa này KHÔNG thay đổi nên dữ liệu lịch sử luôn giữ nguyên liên kết.
 */
export function getCanonicalCategoryKey(rawName: string, categoryConfig?: CategoryConfigItem[]): string {
  const resolved = resolveCategoryMaster(rawName, categoryConfig);
  if (resolved.isAmbiguous) {
    return `ambiguous:${resolved.canonicalKey || String(rawName || '').trim().toLowerCase()}`;
  }
  if (resolved.isMapped && resolved.id) {
    return resolved.id;
  }
  return cleanCategoryName(rawName) || String(rawName || '').trim().toLowerCase();
}

/**
 * Lấy tên hiển thị chuẩn từ TNB LEADER → CẤU HÌNH.
 * Nếu ngành hàng chưa có trong cấu hình, giữ nguyên tên gốc từ BI.
 */
export function getCategoryDisplayName(rawName: string, categoryConfig?: CategoryConfigItem[]): string {
  const resolved = resolveCategoryMaster(rawName, categoryConfig);
  return resolved.displayName;
}

/**
 * Lấy nhóm ngành hàng chuẩn ('ICT' | 'DỊCH VỤ' | 'CE') từ TNB LEADER → CẤU HÌNH.
 */
export function getCategoryGroupByConfig(
  rawName: string,
  categoryConfig?: CategoryConfigItem[]
): CategoryGroupType {
  const resolved = resolveCategoryMaster(rawName, categoryConfig);
  return resolved.group;
}

/**
 * Lấy thứ tự sắp xếp chuẩn từ TNB LEADER → CẤU HÌNH.
 */
export function getCategoryOrderIndex(rawName: string, categoryConfig?: CategoryConfigItem[]): number {
  const resolved = resolveCategoryMaster(rawName, categoryConfig);
  return resolved.order;
}

/**
 * Kiểm tra 2 tên ngành hàng (VD: tên mới sau khi đổi và tên cũ trong dữ liệu lịch sử)
 * có cùng thuộc một ngành hàng định danh hay không.
 */
export function isSameCategoryByConfig(
  nameA: string,
  nameB: string,
  categoryConfig?: CategoryConfigItem[]
): boolean {
  if (!nameA || !nameB) return false;
  const resA = resolveCategoryMaster(nameA, categoryConfig);
  const resB = resolveCategoryMaster(nameB, categoryConfig);

  // Nếu có xung đột mơ hồ, không tự ý gộp
  if (resA.isAmbiguous || resB.isAmbiguous) {
    return nameA.trim().toLowerCase().normalize('NFC') === nameB.trim().toLowerCase().normalize('NFC');
  }

  if (resA.isMapped && resB.isMapped) {
    return resA.id === resB.id;
  }

  if (!resA.isMapped && !resB.isMapped) {
    const cleanA = cleanCategoryName(nameA);
    const cleanB = cleanCategoryName(nameB);
    return Boolean(cleanA && cleanA === cleanB);
  }

  return false;
}

// ============================================================================
// SINGLETON CACHE & SHARED REALTIME LISTENER (1 LISTENER FOR ENTIRE APP)
// ============================================================================

let globalCategoryConfigCache: CategoryConfigItem[] | null = null;
let lastGlobalCategorySignature = '';
let globalCategoryConfigFetched = false;
const categoryConfigSubscribers = new Set<(cats: CategoryConfigItem[]) => void>();
let categoryConfigUnsub: (() => void) | null = null;
let categoryConfigTeardownTimer: ReturnType<typeof setTimeout> | null = null;

function getInitialCategoryConfig(): CategoryConfigItem[] {
  if (globalCategoryConfigCache && globalCategoryConfigCache.length > 0) {
    return globalCategoryConfigCache;
  }
  try {
    const raw = localStorage.getItem('fbcache_app_settings_TNB_LEADER_DATA');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed?.data?.categories &&
        Array.isArray(parsed.data.categories) &&
        parsed.data.categories.length > 0
      ) {
        const normalized = normalizeCategoryConfigList(parsed.data.categories);
        globalCategoryConfigCache = normalized;
        lastGlobalCategorySignature = JSON.stringify(normalized);
        return normalized;
      }
    }
  } catch {}
  const defaults = normalizeCategoryConfigList(DEFAULT_TNB_LEADER_CATEGORIES);
  globalCategoryConfigCache = defaults;
  lastGlobalCategorySignature = JSON.stringify(defaults);
  return defaults;
}

function updateGlobalCategoryConfig(cats: CategoryConfigItem[]) {
  if (!Array.isArray(cats) || cats.length === 0) return;
  const normalized = normalizeCategoryConfigList(cats);
  const nextSignature = JSON.stringify(normalized);
  if (nextSignature === lastGlobalCategorySignature && globalCategoryConfigCache) {
    return;
  }
  lastGlobalCategorySignature = nextSignature;
  globalCategoryConfigCache = normalized;
  categoryConfigSubscribers.forEach((cb) => {
    try {
      cb(normalized);
    } catch {}
  });
}

/**
 * Cho phép kiểm tra trạng thái listener & cache hiện tại phục vụ QA/Audit hiệu năng.
 */
export function getCategoryConfigDiagnostics() {
  return {
    hasActiveFirestoreListener: Boolean(categoryConfigUnsub),
    activeSubscriberCount: categoryConfigSubscribers.size,
    cachedCategoryCount: globalCategoryConfigCache ? globalCategoryConfigCache.length : 0,
    unmappedCategoryCount: unmappedCategoryRegistry.size,
  };
}

export const useCategoryConfig = () => {
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfigItem[]>(getInitialCategoryConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [, setUnmappedTick] = useState(0);

  useEffect(() => {
    if (categoryConfigTeardownTimer) {
      clearTimeout(categoryConfigTeardownTimer);
      categoryConfigTeardownTimer = null;
    }

    categoryConfigSubscribers.add(setCategoryConfig);
    const handleUnmappedChange = () => setUnmappedTick((t) => t + 1);
    unmappedSubscribers.add(handleUnmappedChange);

    if (globalCategoryConfigCache && globalCategoryConfigCache.length > 0) {
      setCategoryConfig(globalCategoryConfigCache);
    }

    // 1. One-time initial cached / fresh fetch across the entire session
    if (!globalCategoryConfigFetched) {
      globalCategoryConfigFetched = true;
      getCachedDoc<{ categories?: CategoryConfigItem[] }>('app_settings', 'TNB_LEADER_DATA')
        .then((data) => {
          if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
            updateGlobalCategoryConfig(data.categories);
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching category config:', error);
          setIsLoading(false);
        });
    }

    // 2. Single shared realtime listener via onSnapshot across all components & tabs
    if (!categoryConfigUnsub) {
      try {
        categoryConfigUnsub = onSnapshot(
          doc(db, 'app_settings', 'TNB_LEADER_DATA'),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
                const normalized = normalizeCategoryConfigList(data.categories);
                updateGlobalCategoryConfig(normalized);
                setCachedDoc('app_settings', 'TNB_LEADER_DATA', {
                  ...data,
                  categories: normalized,
                });
              }
            }
          },
          (err) => {
            console.warn('Realtime categoryConfig listener error:', err);
          }
        );
      } catch (err) {
        console.warn('Failed to attach categoryConfig listener:', err);
      }
    }

    // 3. Local custom event listener for zero-latency in-session updates
    const handleLocalUpdate = (e: any) => {
      const newCats = e.detail;
      if (Array.isArray(newCats) && newCats.length > 0) {
        updateGlobalCategoryConfig(newCats);
      }
    };
    window.addEventListener('category_config_updated', handleLocalUpdate);

    return () => {
      categoryConfigSubscribers.delete(setCategoryConfig);
      unmappedSubscribers.delete(handleUnmappedChange);
      window.removeEventListener('category_config_updated', handleLocalUpdate);
      if (categoryConfigSubscribers.size === 0 && !categoryConfigTeardownTimer) {
        categoryConfigTeardownTimer = setTimeout(() => {
          if (categoryConfigSubscribers.size === 0 && categoryConfigUnsub) {
            try {
              categoryConfigUnsub();
            } catch {}
            categoryConfigUnsub = null;
          }
        }, 30000);
      }
    };
  }, []);

  const activeCategoryConfig = useMemo(
    () => categoryConfig.filter((item) => item.isActive !== false),
    [categoryConfig]
  );

  const conflicts = useMemo(() => detectCategoryConflicts(categoryConfig), [categoryConfig]);

  const unmappedCategories = useMemo(
    () => getUnmappedCategories(categoryConfig),
    [categoryConfig]
  );

  const resolveCategory = useCallback(
    (rawName: string, options?: { recordUnmapped?: boolean; source?: string }) =>
      resolveCategoryMaster(rawName, categoryConfig, options),
    [categoryConfig]
  );

  const getDisplayName = useCallback(
    (rawName: string) => getCategoryDisplayName(rawName, categoryConfig),
    [categoryConfig]
  );

  const getCanonicalKey = useCallback(
    (rawName: string) => getCanonicalCategoryKey(rawName, categoryConfig),
    [categoryConfig]
  );

  const getGroup = useCallback(
    (rawName: string) => getCategoryGroupByConfig(rawName, categoryConfig),
    [categoryConfig]
  );

  const getOrderIndex = useCallback(
    (rawName: string) => getCategoryOrderIndex(rawName, categoryConfig),
    [categoryConfig]
  );

  const isSameCategory = useCallback(
    (nameA: string, nameB: string) => isSameCategoryByConfig(nameA, nameB, categoryConfig),
    [categoryConfig]
  );

  return {
    categoryConfig,
    activeCategoryConfig,
    isLoading,
    conflicts,
    unmappedCategories,
    resolveCategory,
    getDisplayName,
    getCanonicalKey,
    getGroup,
    getOrderIndex,
    isSameCategory,
  };
};
