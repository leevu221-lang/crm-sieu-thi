/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * storeSync.ts
 *
 * Tiện ích dò và đồng bộ cấu hình tên siêu thị với Firebase Firestore.
 * Quy tắc:
 * 1. Nếu chưa có document tên siêu thị giống cấu hình -> TẠO DOCUMENT MỚI.
 * 2. Nếu đã có rồi -> BỎ QUA (không ghi đè dữ liệu báo cáo, 0 write).
 * 3. Tận dụng cache và in-memory docs để tối ưu chi phí Firebase Firestore.
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { supabase } from '../supabaseClient';
import { isValidStoreName, normalizeStoreId } from '../pages/RTST/utils';

/**
 * Làm sạch chuỗi tên siêu thị: loại bỏ mã kho ở đầu, chuẩn hóa ký tự
 */
export function cleanStoreInput(val: string): string {
  if (!val) return '';
  let cleaned = val.trim();
  cleaned = cleaned.replace(/^\d+\s*[-–—]\s*(?=(ĐML|ĐMM|ĐMS|ĐMS3|TGD|AAR|BHX|MWG|SIÊU THỊ|CH|KHO)[_\s-])/i, '').trim();
  cleaned = cleaned.replace(/^\d+\s*[-–—]\s*/, '').trim();
  // Khắc phục lỗi dấu gạch nối chèn nhầm vào ngày/tháng/số nhà (ví dụ "Đường -19/5" -> "Đường 19/5")
  cleaned = cleaned.replace(/(Đường|Đ\.|Phố)\s*-\s*(\d+)/gi, '$1 $2').trim();
  return cleaned;
}

/**
 * Kiểm tra xem tên siêu thị có phải placeholder tạm thời hay không
 */
export function isPlaceholderStore(val: string): boolean {
  if (!val) return true;
  const v = val.trim();
  if (/^siêu\s*thị\s*\d+/i.test(v)) return true;
  if (/offline\s*mode/i.test(v)) return true;
  if (!isValidStoreName(v)) return true;
  return false;
}

/**
 * Lấy danh sách siêu thị đã cấu hình cho 1 mã kho từ DS BOSS (localStorage cache)
 */
export function getConfiguredStoresFromBoss(maKho: string): string[] {
  if (!maKho) return [];
  const cleanTarget = String(maKho).trim().replace(/^0+/, '');
  try {
    const cached = localStorage.getItem('rtst_ds_boss_config');
    if (!cached) return [];
    const parsed = JSON.parse(cached);
    const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
    const matched = rows.filter((r: any) => {
      const rowKho = String(r.maKho || '').trim().replace(/^0+/, '');
      const d = String(r.mstSieuThi || '').trim();
      const e = String(r.base || '').trim();
      return (rowKho !== '' && rowKho === cleanTarget) ||
             d.startsWith(`${cleanTarget} -`) || d.startsWith(`${maKho} -`) ||
             e.startsWith(`${cleanTarget} -`) || e.startsWith(`${maKho} -`);
    });
    return matched
      .map((r: any) => cleanStoreInput(r.tenSieuThi || ''))
      .filter((s: string) => s && isValidStoreName(s) && !isPlaceholderStore(s));
  } catch {
    return [];
  }
}

/**
 * Dò lại trong Firebase Firestore:
 * - Nếu chưa có document tên siêu thị giống cấu hình -> TẠO DOCUMENT MỚI.
 * - Nếu đã có rồi -> BỎ QUA (không ghi đè, bảo toàn dữ liệu hiện có).
 */
export async function syncConfiguredStoreDocument(
  maKho: string,
  storeNames: string[],
  existingDocs?: any[]
): Promise<{ created: string[]; skipped: string[] }> {
  const cleanKho = String(maKho || '').trim();
  const result = { created: [] as string[], skipped: [] as string[] };
  if (!cleanKho) return result;

  const validStores = storeNames
    .map(s => cleanStoreInput(s))
    .filter(s => s && isValidStoreName(s) && !isPlaceholderStore(s));

  if (validStores.length === 0) return result;

  try {
    // 1. Dùng danh sách existingDocs nếu có sẵn trong bộ nhớ để không tốn Firestore reads
    let currentDocs = existingDocs;
    if (!currentDocs) {
      const maKhoNum = parseInt(cleanKho, 10);
      let q = supabase.from('store').select('id, ten_sieu_thi, declared_stores, warehouse_code');
      if (!isNaN(maKhoNum)) {
        q = q.or(`warehouse_code.eq.${cleanKho},warehouse_code.eq.${maKhoNum}`);
      } else {
        q = q.eq('warehouse_code', cleanKho);
      }
      const { data } = await q;
      currentDocs = data || [];
    }

    // Kiểm tra xem có document mã kho cũ (vd doc '1841' hoặc '3008') cần kế thừa dữ liệu sang doc mới không
    let oldNumericDocData: any = null;
    if (/^\d+$/.test(cleanKho)) {
      try {
        const oldSnap = await getDoc(doc(db, 'store', cleanKho));
        if (oldSnap.exists()) {
          oldNumericDocData = oldSnap.data();
        }
      } catch {}
    }

    for (const stName of validStores) {
      const normId = normalizeStoreId(stName);
      if (!normId) continue;

      // Bước 1: Kiểm tra trong bộ nhớ
      const inMemoryMatch = currentDocs?.find((d: any) => {
        const dId = normalizeStoreId(d.id || '');
        const dTen = normalizeStoreId(d.ten_sieu_thi || '');
        return dId === normId || dTen === normId;
      });

      if (inMemoryMatch) {
        console.log(`[StoreSync] Siêu thị "${stName}" (${normId}) ĐÃ CÓ trong Firebase (in-memory) -> BỎ QUA`);
        result.skipped.push(stName);
        continue;
      }

      // Bước 2: Dò trực tiếp bằng ID trong Firestore
      const safeId = normId.replace(/\//g, '-');
      const docRef = doc(db, 'store', safeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log(`[StoreSync] Siêu thị "${stName}" (${normId}) ĐÃ CÓ trong Firebase (Firestore getDoc) -> BỎ QUA`);
        result.skipped.push(stName);

        // Đảm bảo warehouse_code và declared_stores khớp nếu thiếu
        const existingData = docSnap.data();
        const needsWhUpdate = !existingData?.warehouse_code || String(existingData.warehouse_code).trim() !== cleanKho;
        const needsDeclUpdate = !Array.isArray(existingData?.declared_stores) || existingData.declared_stores.length === 0;

        if (needsWhUpdate || needsDeclUpdate) {
          const patch: any = { updated_at: serverTimestamp() };
          if (needsWhUpdate) patch.warehouse_code = cleanKho;
          if (needsDeclUpdate) patch.declared_stores = validStores;
          await updateDoc(docRef, patch).catch(() => {});
        }
        continue;
      }

      // Bước 3: CHƯA CÓ TRONG FIREBASE -> TẠO DOCUMENT MỚI!
      console.log(`[StoreSync] Siêu thị "${stName}" (${normId}) CHƯA CÓ trong Firebase -> TẠO DOCUMENT MỚI!`);
      const newDocPayload: any = {
        id: normId,
        warehouse_code: cleanKho,
        ten_sieu_thi: stName,
        declared_stores: validStores,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      // Kế thừa dữ liệu báo cáo cũ nếu có
      if (oldNumericDocData) {
        const fieldsToMigrate = [
          'lk_bi_tong_quan', 'lk_nh_sieu_thi', 'taget_doanh_thu', 'category_targets',
          'lk_dt_nv', 'lk_td_nv', 'ds_nhan_vien', 'dt_gio_cong', 'data_phan_ca',
          'tragop_matran', 'tragop_nv', 'phuc_vu', 'ban_kem_nv',
          'sticker_ce_price_data', 'sticker_ce_inventory_data',
          'sticker_lk_price_data', 'sticker_lk_inventory_data'
        ];
        fieldsToMigrate.forEach(f => {
          if (oldNumericDocData[f] !== undefined && oldNumericDocData[f] !== null) {
            newDocPayload[f] = oldNumericDocData[f];
          }
        });
      }

      await setDoc(docRef, newDocPayload);
      result.created.push(stName);

      // Thêm vào danh sách currentDocs để các vòng lặp tiếp theo không query lại
      currentDocs?.push({
        id: normId,
        ten_sieu_thi: stName,
        declared_stores: validStores,
        warehouse_code: cleanKho
      });
    }

    // Nếu đã tạo thành công và có doc mã kho thuần số cũ, dọn dẹp doc mã kho cũ
    if (result.created.length > 0 && oldNumericDocData && /^\d+$/.test(cleanKho)) {
      await deleteDoc(doc(db, 'store', cleanKho)).catch(() => {});
    }

    // Đồng bộ vào bảng warehouses
    if (validStores[0]) {
      supabase.from('warehouses').upsert({
        ma_kho: cleanKho,
        ten_kho: validStores[0]
      }, { onConflict: 'ma_kho' }).catch(() => {});
    }
  } catch (err) {
    console.warn('[StoreSync] Lỗi khi dò và đồng bộ cấu hình siêu thị:', err);
  }

  return result;
}
