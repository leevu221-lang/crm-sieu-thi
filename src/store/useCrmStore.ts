import { createStore } from './createStore';

interface CrmState {
  // 1. LUYKE DATA
  clusterSummaryInput: string;
  clusterCategoryInput: string;
  staffInput: string;
  staffCategoryInput: string;
  staffListInput: string;
  dtGioCong: string;
  dataPhanCa: any;
  tragopMatran: string;
  tragopNv: string;
  categoryTargets: any[];
  
  // 2. TARGET / SETTINGS DATA
  stPercentTarget: number;
  stTargetSauHeSo: number;
  
  // 3. HEALTH DATA
  biRevenueData: any[];
  luyKeNganhHang: string;
  thiDuaNv: string;
  phucVu: string;
  banKemNv: string;

  // 4. META
  activeStoreId: string | null;
  hasLoadedLuyke: boolean;
  hasLoadedHealth: boolean;

  // ACTIONS (If we want to put actions here, though we can also just use setState)
}

const initialState: CrmState = {
  clusterSummaryInput: '',
  clusterCategoryInput: '',
  staffInput: '',
  staffCategoryInput: '',
  staffListInput: '',
  dtGioCong: '',
  dataPhanCa: null,
  tragopMatran: '',
  tragopNv: '',
  categoryTargets: [],
  
  stPercentTarget: 100,
  stTargetSauHeSo: 0,
  
  biRevenueData: [],
  luyKeNganhHang: '',
  thiDuaNv: '',
  phucVu: '',
  banKemNv: '',

  activeStoreId: null,
  hasLoadedLuyke: false,
  hasLoadedHealth: false,
};

export const crmStore = createStore<CrmState>(initialState);
export const useCrmStore = crmStore.useStore;
