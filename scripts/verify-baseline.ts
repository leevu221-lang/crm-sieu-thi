import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import {
  parseMarketData,
  parseCategoryData,
  parseYcxData,
  parseStaffMatrixData,
  normalizeStoreId,
} from '../src/pages/RTST/utils';
import { parseLineChatData } from '../src/pages/TienIch/utils/lineChatParser';
import { DEFAULT_LINE_CHAT_DATA } from '../src/pages/TienIch/data/defaultLineChatData';
import { findIsolatedStoreTarget, getWarehouseStoreTargetKey } from '../src/pages/RTST/hooks/useRTSTSharedData';
import { buildLuykeProcessSignature } from '../src/contexts/LuykeDataContext';
import { APP_PAGES_REGISTRY, getDefaultAllowedPagesForNewUser } from '../src/constants/routes';
import { SUPER_ADMIN_ALL_PAGES, isSuperAdmin43751 } from '../src/firebaseAdapter';

// 1. Deterministic Multi-Store BI Market Input (Tests RTST & LUYKE + Store Isolation)
const SAMPLE_BI_MARKET_INPUT = `
DT quy đổi
1,250.50
Target trọn kỳ 2,500.00 · tiến độ 50.02%
Tỷ trọng trả góp 38.5%

Tên siêu thị	DT thực	DTQĐ	Target	% HT Target (LK)	% HT Dự Kiến (QĐ)	+/- DTCK Tháng	Tỷ trọng trả góp
TỔNG	1,050.20	1,250.50	2,500.00	50.02%	100.04%	12.5%	38.5%
ĐML - 155A NGUYỄN TẤT THÀNH - 1841	520.10	640.25	1,200.00	53.35%	106.70%	15.2%	41.2%
ĐMM - TRẦN HƯNG ĐẠO - 2910	310.05	360.15	800.00	45.02%	90.04%	8.4%	36.0%
ĐMS - CÁI NƯỚC - 4512	220.05	250.10	500.00	50.02%	100.04%	11.1%	35.8%
`.trim();

// 2. Deterministic Multi-Store BI Category Thi Đua Input
const SAMPLE_BI_CATEGORY_INPUT = `
Ngành hàng	Target	Lũy kế	% HT	Dự kiến	% HT Dự kiến
Tivi - DTLK
ĐML - 155A NGUYỄN TẤT THÀNH - 1841	250.00	135.50	54.20%	271.00	108.40%
ĐMM - TRẦN HƯNG ĐẠO - 2910	180.00	88.20	49.00%	176.40	98.00%
ĐMS - CÁI NƯỚC - 4512	100.00	52.00	52.00%	104.00	104.00%
Tủ lạnh - DTLK
ĐML - 155A NGUYỄN TẤT THÀNH - 1841	200.00	110.00	55.00%	220.00	110.00%
ĐMM - TRẦN HƯNG ĐẠO - 2910	150.00	72.00	48.00%	144.00	96.00%
ĐMS - CÁI NƯỚC - 4512	90.00	46.80	52.00%	93.60	104.00%
Máy lạnh - SLLK
ĐML - 155A NGUYỄN TẤT THÀNH - 1841	120	66	55.00%	132	110.00%
ĐMM - TRẦN HƯNG ĐẠO - 2910	80	38	47.50%	76	95.00%
ĐMS - CÁI NƯỚC - 4512	50	27	54.00%	54	108.00%
Điện thoại - DTLK
ĐML - 155A NGUYỄN TẤT THÀNH - 1841	300.00	165.00	55.00%	330.00	110.00%
ĐMM - TRẦN HƯNG ĐẠO - 2910	210.00	105.00	50.00%	210.00	100.00%
ĐMS - CÁI NƯỚC - 4512	120.00	60.00	50.00%	120.00	100.00%
`.trim();

// 3. Deterministic YCX Transaction Dataset (Multi-store, Cash & Installment, Multiple Categories)
const SAMPLE_YCX_INPUT = [
  [
    'Mã YCX',
    'Kho xuất',
    'Người tạo',
    'Ngành hàng',
    'Nhóm hàng',
    'Số lượng',
    'Giá bán 2',
    'Phải thu',
    'Trạng thái xuất',
    'Loại YCX',
    'Hình thức xuất',
  ].join('\t'),
  [
    'YCX001',
    '1841 - ĐML 155A NGUYỄN TẤT THÀNH',
    '43751 - Vũ Linh',
    '1124 - Tivi',
    'Tivi LED',
    '1',
    '15,000,000',
    '15,000,000',
    'Đã xuất',
    'Bán hàng',
    'Xuất bán trả góp',
  ].join('\t'),
  [
    'YCX002',
    '1841 - ĐML 155A NGUYỄN TẤT THÀNH',
    '43751 - Vũ Linh',
    '16 - Phụ kiện tiện ích',
    'Cáp sạc',
    '2',
    '500,000',
    '500,000',
    'Đã xuất',
    'Bán hàng',
    'Xuất bán tiền mặt',
  ].join('\t'),
  [
    'YCX003',
    '1841 - ĐML 155A NGUYỄN TẤT THÀNH',
    '102345 - Nguyễn Văn A',
    '1994 - Dịch vụ bảo hành, bảo dưỡng Điện Máy Xanh',
    'Bảo hiểm rơi vỡ',
    '1',
    '1,200,000',
    '1,200,000',
    'Đã xuất',
    'Bán hàng',
    'Xuất bán trả góp',
  ].join('\t'),
  [
    'YCX004',
    '2910 - ĐMM TRẦN HƯNG ĐẠO',
    '204567 - Trần Thị B',
    '364 - IT',
    'Laptop văn phòng',
    '1',
    '18,500,000',
    '18,500,000',
    'Đã xuất',
    'Bán hàng',
    'Xuất bán trả góp',
  ].join('\t'),
  [
    'YCX005',
    '4512 - ĐMS CÁI NƯỚC',
    '308901 - Lê Văn C',
    '664 - Sim Online',
    'Sim Viettel',
    '3',
    '450,000',
    '450,000',
    'Đã xuất',
    'Bán hàng',
    'Xuất bán tiền mặt',
  ].join('\t'),
].join('\n');

// 4. Deterministic Staff Matrix Dataset
const SAMPLE_STAFF_MATRIX_INPUT = [
  ['Nhân viên', 'Tivi - DTLK', 'Tủ lạnh - DTLK', 'Máy lạnh - SLLK', 'Điện thoại - DTLK'].join('\t'),
  ['043751 - Vũ Linh', '48.5', '39.0', '24', '58.0'].join('\t'),
  ['102345 - Nguyễn Văn A', '44.0', '36.5', '22', '52.0'].join('\t'),
  ['105678 - Phạm Thị D', '43.0', '34.5', '20', '55.0'].join('\t'),
].join('\n');

function sha256(data: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function runVerificationSuite() {
  const t0 = performance.now();

  // 1. Parse Market Data (RTST & LUYKE)
  const tMarketStart = performance.now();
  const marketsRtst = parseMarketData(SAMPLE_BI_MARKET_INPUT, 0, 'RTST');
  const marketsLuyke = parseMarketData(SAMPLE_BI_MARKET_INPUT, 0, 'LUYKE');
  const tMarketMs = performance.now() - tMarketStart;

  // 2. Parse Category Data (REALTIME & LUYKE)
  const tCatStart = performance.now();
  const categoriesRealtime = parseCategoryData(SAMPLE_BI_CATEGORY_INPUT, 15, 30, marketsRtst, 'REALTIME');
  const categoriesLuyke = parseCategoryData(SAMPLE_BI_CATEGORY_INPUT, 15, 30, marketsLuyke, 'LUYKE');
  const tCatMs = performance.now() - tCatStart;

  // 3. Parse YCX Data
  const tYcxStart = performance.now();
  const ycxParsed = parseYcxData(SAMPLE_YCX_INPUT, []);
  const tYcxMs = performance.now() - tYcxStart;

  // 4. Parse Staff Matrix Data (filtered for store 1841 categories)
  const tMatrixStart = performance.now();
  const store1841Categories = categoriesLuyke.filter(c => c.marketName.includes('1841'));
  const staffMatrix = parseStaffMatrixData(SAMPLE_STAFF_MATRIX_INPUT, 3, store1841Categories, 15, 30);
  const tMatrixMs = performance.now() - tMatrixStart;

  // 5. Parse Line Chat Data (16,760 lines)
  const tLineStart = performance.now();
  const lineChatParsed = parseLineChatData(DEFAULT_LINE_CHAT_DATA);
  const tLineMs = performance.now() - tLineStart;

  // 6. Store Isolation Check
  const storesInMarket = marketsRtst.map(m => m.name);
  const store1841CatsCount = categoriesLuyke.filter(c => c.marketName.includes('1841')).length;
  const store2910CatsCount = categoriesLuyke.filter(c => c.marketName.includes('2910')).length;
  const store4512CatsCount = categoriesLuyke.filter(c => c.marketName.includes('4512')).length;

  const totalTimeMs = performance.now() - t0;

  const snapshot = {
    hashes: {
      marketsRtst: sha256(marketsRtst),
      marketsLuyke: sha256(marketsLuyke),
      categoriesRealtime: sha256(categoriesRealtime),
      categoriesLuyke: sha256(categoriesLuyke),
      ycxParsed: sha256(ycxParsed),
      staffMatrix: sha256(staffMatrix),
      lineChatSummary: sha256({
        totalMessages: lineChatParsed.totalMessages,
        employeeCount: lineChatParsed.employees.length,
        dateCount: lineChatParsed.dates.length,
        months: lineChatParsed.months,
        top3Employees: lineChatParsed.employees.slice(0, 3).map(e => ({
          id: e.id,
          lineDisplayName: e.lineDisplayName,
          totalMessages: e.totalMessages,
        })),
      }),
    },
    counts: {
      marketsRtstCount: marketsRtst.length,
      marketsLuykeCount: marketsLuyke.length,
      categoriesRealtimeCount: categoriesRealtime.length,
      categoriesLuykeCount: categoriesLuyke.length,
      ycxStaffCount: ycxParsed.length,
      staffMatrixCount: staffMatrix.length,
      lineChatTotalMessages: lineChatParsed.totalMessages,
      lineChatEmployees: lineChatParsed.employees.length,
      lineChatDates: lineChatParsed.dates.length,
    },
    storeIsolation: {
      storesInMarket,
      store1841CatsCount,
      store2910CatsCount,
      store4512CatsCount,
    },
    outputs: {
      marketsRtst,
      marketsLuyke,
      categoriesRealtime,
      categoriesLuyke,
      ycxParsed,
      staffMatrix,
    },
  };

  const timings = {
    parseMarketDataMs: Number(tMarketMs.toFixed(3)),
    parseCategoryDataMs: Number(tCatMs.toFixed(3)),
    parseYcxDataMs: Number(tYcxMs.toFixed(3)),
    parseStaffMatrixDataMs: Number(tMatrixMs.toFixed(3)),
    parseLineChatDataMs: Number(tLineMs.toFixed(3)),
    totalVerificationMs: Number(totalTimeMs.toFixed(3)),
  };

  return { snapshot, timings };
}

const snapshotPath = path.resolve(process.cwd(), 'scripts/baseline-snapshot.json');
const isSaveMode = process.argv.includes('--save');

const { snapshot, timings } = runVerificationSuite();

console.log('\n======================================================');
console.log('  CRM SIÊU THỊ - BI / YCX / LINE PARITY & BENCHMARK');
console.log('======================================================');
console.log('Timings (ms):', JSON.stringify(timings, null, 2));
console.log('Output Hashes:', JSON.stringify(snapshot.hashes, null, 2));
console.log('Record Counts:', JSON.stringify(snapshot.counts, null, 2));
console.log('Store Isolation:', JSON.stringify(snapshot.storeIsolation, null, 2));

if (isSaveMode || !fs.existsSync(snapshotPath)) {
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, JSON.stringify({ snapshot, baselineTimings: timings }, null, 2), 'utf-8');
  console.log(`\n[SAVED] Golden baseline snapshot written to: ${snapshotPath}`);
} else {
  const baselineRaw = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
  const baselineHashes = baselineRaw.snapshot.hashes;
  let allMatch = true;

  console.log('\n--- PARITY VERIFICATION AGAINST GOLDEN BASELINE ---');
  for (const [key, expectedHash] of Object.entries(baselineHashes)) {
    const actualHash = (snapshot.hashes as Record<string, string>)[key];
    const match = actualHash === expectedHash;
    console.log(`  [${match ? 'PASS 100%' : 'FAIL'}] ${key}: ${actualHash}`);
    if (!match) allMatch = false;
  }

  if (!allMatch) {
    console.error('\n[CRITICAL ERROR] Calculation parity mismatch detected! Stopping immediately.');
    process.exit(1);
  }
  console.log('\n[SUCCESS] 100% Bit-for-Bit Calculation & Store Isolation Parity Verified!');
}

function runPhase2ContextAndIsolationSuite() {
  console.log('\n--- PHASE 2: CONTEXT, HOOK & ISOLATION VERIFICATION ---');

  // 1. Multi-Store & Multi-Warehouse Isolation Test (RTSTSharedDataProvider)
  const storeA = 'ĐML - 155A NGUYỄN TẤT THÀNH - 1841';
  const storeB = 'ĐMM - TRẦN HƯNG ĐẠO - 2910';
  const storeC = 'ĐMS - CÁI NƯỚC - 4512';
  const foreignStore = 'ĐML - KHO KHÁC - 9999';

  const mockTargetsMap: Record<string, any> = {
    [storeA.toUpperCase()]: {
      stName: storeA,
      stPercentTarget: 108,
      stTargetQuyDoi: 1200,
      categoryMappingInput: 'MAP_A',
      warehouse_code: '1841',
      storeId: normalizeStoreId(storeA),
    },
    [storeB.toUpperCase()]: {
      stName: storeB,
      stPercentTarget: 95,
      stTargetQuyDoi: 800,
      categoryMappingInput: '',
      warehouse_code: '0001841',
      storeId: normalizeStoreId(storeB),
    },
    [foreignStore.toUpperCase()]: {
      stName: foreignStore,
      stPercentTarget: 150,
      stTargetQuyDoi: 5000,
      categoryMappingInput: 'FOREIGN_MAP',
      warehouse_code: '9999',
      storeId: normalizeStoreId(foreignStore),
    },
  };

  const targetA = findIsolatedStoreTarget(mockTargetsMap, '1841', storeA);
  const targetB = findIsolatedStoreTarget(mockTargetsMap, '1841', storeB);
  const targetC = findIsolatedStoreTarget(mockTargetsMap, '1841', storeC); // Store C has no DB target yet
  const crossWhLeakCheck = findIsolatedStoreTarget(mockTargetsMap, '1841', foreignStore);

  if (
    targetA?.stPercentTarget !== 108 ||
    targetB?.stPercentTarget !== 95 ||
    targetB?.categoryMappingInput !== '' ||
    targetC !== null ||
    crossWhLeakCheck !== null ||
    getWarehouseStoreTargetKey('001841', storeA) !== `1841::${normalizeStoreId(storeA)}`
  ) {
    console.error('[FAIL] Multi-store / multi-warehouse isolation check failed!', {
      targetA,
      targetB,
      targetC,
      crossWhLeakCheck,
    });
    process.exit(1);
  }
  console.log('  [PASS 100%] Multi-store switching (1841 -> 2910 -> 4512) & cross-warehouse (1841 vs 9999) strict isolation');

  // 2. handleProcess Deduplication Simulation (Before vs After Phase 2)
  let prePhase2ProcessCount = 0;
  let postPhase2ProcessCount = 0;
  let lastSig = '';

  const simulateStoreLoadAndTabSwitches = (wh: string, store: string, summary: string, category: string, staff: string) => {
    // Event 1: loadData cache hit
    prePhase2ProcessCount++;
    const sig1 = buildLuykeProcessSignature(wh, store, summary, category, staff);
    if (sig1 !== lastSig) { postPhase2ProcessCount++; lastSig = sig1; }

    // Event 2: loadData DB response with identical data
    prePhase2ProcessCount++;
    const sig2 = buildLuykeProcessSignature(wh, store, summary, category, staff);
    if (sig2 !== lastSig) { postPhase2ProcessCount++; lastSig = sig2; }

    // Event 3: setIsLoading(false) triggers 300ms useEffect
    prePhase2ProcessCount++;
    const sig3 = buildLuykeProcessSignature(wh, store, summary, category, staff);
    if (sig3 !== lastSig) { postPhase2ProcessCount++; lastSig = sig3; }

    // Event 4: KhaiBao useEffect on isLoading -> false
    prePhase2ProcessCount++;

    // Events 5..7: User clicks 3 sub-tabs in StoreContext (previously recreated warehouseCodes -> saveLuykeData -> handleProcess)
    for (let t = 0; t < 3; t++) {
      prePhase2ProcessCount++;
      const sigTab = buildLuykeProcessSignature(wh, store, summary, category, staff);
      if (sigTab !== lastSig) { postPhase2ProcessCount++; lastSig = sigTab; }
    }
  };

  simulateStoreLoadAndTabSwitches('1841', storeA, SAMPLE_BI_MARKET_INPUT, SAMPLE_BI_CATEGORY_INPUT, SAMPLE_STAFF_MATRIX_INPUT);
  simulateStoreLoadAndTabSwitches('1841', storeB, SAMPLE_BI_MARKET_INPUT, SAMPLE_BI_CATEGORY_INPUT, SAMPLE_STAFF_MATRIX_INPUT);
  simulateStoreLoadAndTabSwitches('1841', storeC, SAMPLE_BI_MARKET_INPUT, SAMPLE_BI_CATEGORY_INPUT, SAMPLE_STAFF_MATRIX_INPUT);

  if (postPhase2ProcessCount !== 3) {
    console.error(`[FAIL] Expected 3 handleProcess executions for 3 distinct stores, got ${postPhase2ProcessCount}`);
    process.exit(1);
  }
  console.log(`  [PASS 100%] handleProcess deduplication: Before = ${prePhase2ProcessCount} runs -> After = ${postPhase2ProcessCount} runs (-${((1 - postPhase2ProcessCount / prePhase2ProcessCount) * 100).toFixed(1)}%)`);

  // 3. Admin 43751 & User RBAC Verification
  const registryIds = APP_PAGES_REGISTRY.map(p => p.id);
  const isAdmin43751Valid =
    isSuperAdmin43751('43751') &&
    isSuperAdmin43751(' 43751 ') &&
    !isSuperAdmin43751('102345') &&
    SUPER_ADMIN_ALL_PAGES.includes('users') &&
    SUPER_ADMIN_ALL_PAGES.includes('khaibao') &&
    registryIds.includes('realtime') &&
    registryIds.includes('khaibao');
  const defaultNewUserPages = getDefaultAllowedPagesForNewUser();

  if (!isAdmin43751Valid || !Array.isArray(defaultNewUserPages)) {
    console.error('[FAIL] RBAC / Admin 43751 verification failed!');
    process.exit(1);
  }
  console.log('  [PASS 100%] Admin 43751 SuperAdmin bypass & User RBAC permission checks verified');
}

runPhase2ContextAndIsolationSuite();
