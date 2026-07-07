/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const STORAGE_KEYS = {
  MARKET_INPUT: 'rtst_market_input',
  CATEGORY_INPUT: 'rtst_category_input',
  YCX_DATA: 'rtst_ycx_data',
  YCX_FILE_NAME: 'rtst_ycx_file_name',
  MA_KHO: 'rtst_ma_kho',
  LINK_BC_TONG_HOP: 'rtst_link_bc_tong_hop',
  LINK_NGANH_HANG_TONG_HOP: 'rtst_link_nganh_hang_tong_hop',
  CLUSTER_SUMMARY_INPUT: 'rtst_cluster_summary_input',
  CLUSTER_CATEGORY_INPUT: 'rtst_cluster_category_input',
  CATEGORY_REVENUE_INPUT: 'rtst_category_revenue_input',
  STICKER_INVENTORY_DATA: 'rtst_sticker_inventory_data',
  STICKER_PRICE_DATA: 'rtst_sticker_price_data',
  STICKER_CE_INVENTORY_DATA: 'rtst_sticker_ce_inventory_data',
  STICKER_CE_PRICE_DATA: 'rtst_sticker_ce_price_data',
  STICKER_LK_INVENTORY_DATA: 'rtst_sticker_lk_inventory_data',
  STICKER_LK_PRICE_DATA: 'rtst_sticker_lk_price_data',
  STICKER_ADDRESS_DATA: 'rtst_sticker_address_data',
  STICKER_PHIEU_BH_DATA: 'rtst_sticker_phieu_bh_data'
};

export interface MarketData {
  name: string;
  revenue: number;
  target: number;
  color: string;
  icon: string;
}

export interface MarketInfo {
  name: string;
  ma_kho?: string | number;
  targetST: number;
  targetQD?: number;
  actualReal: number;
  actualVirtual: number | null;
  dtHomQua: number;
  percentHT?: number;
  percentQD?: number;
  isExplicitTarget?: boolean;
  installmentRate?: number;
  isSummary?: boolean;
  tlpvtcLK?: number;
  dtckThang?: number;
  laiGopQD?: number;
  percentHTTargetDuKienLNTT?: number;
  luotKhachLK?: number;
  luotBill?: number;
  luotBillBanHang?: number;
  luotBillThuHo?: number;
}

export interface CategoryData {
  name: string;
  revenue: number;
  target: number;
  group: string;
  actual?: number;
  rate?: number;
  marketName?: string;
  type?: 'SL' | 'DT' | 'ALL';
}

export interface StaffData {
  displayName: string;
  fullId: string;
  department?: string;
  actualVal: number | null;
  virtualVal: number;
  effVal: number;
  target?: number;
  rate?: number;
  // New fields for Event/Detailed reports
  todayTarget?: number;
  todayActual?: number;
  todayRate?: number;
  accTarget?: number;
  accActual?: number;
  forecast?: number;
  accRate?: number;
  storeName?: string;
}

export interface StaffMatrixData {
  displayName: string;
  fullId: string;
  shortName?: string;
  achieved: number;
  totalCats: number;
  rate: number;
  rawValues: number[];
  projectedRates: number[];
  actualPercentHTs?: number[];
}

export interface YcxItemDetail {
  productName: string;
  revenue: number;
  convertedRevenue: number;
  category: string;
  isInstallment: boolean;
  quantity: number;
  status?: string;
  returnStatus?: string;
}

export interface YcxRankData {
  staffName: string;
  totalRevenue: number;
  convertedRevenue: number;
  efficiency: number;
  isTop: boolean;
}

export interface YcxStaffData {
  staffName: string;
  staffId?: string;
  marketName?: string;
  totalRevenue: number;
  convertedRevenue: number;
  installmentRevenue: number;
  items: YcxItemDetail[];
  giaDung: {
    total: number;
    mayLocNuoc: number;
    noiCom: number;
    noiChien: number;
    quatGio: number;
    bep: number;
  };
  baoHiem: {
    total: number;
    count: number;
    motDoiMot: number;
    moRong: number;
    roiVo: number;
    khac: number;
  };
  ict: {
    smartphone: number;
    sdp: number;
    taiNghe: number;
    camera: number;
    sim: number;
    vieon: number;
    miengDan: number;
  };
  ce: {
    total: number;
    tivi: number;
    tuLanh: number;
    mayGiat: number;
    mayLanh: number;
    mayNuocNong: number;
    msMrc: number;
  };
  mayLanhImeiQty?: number;
  mayLanhDaikinQty?: number;
  mayLanhHaierQty?: number;
  mayLanhHisenseQty?: number;
}
