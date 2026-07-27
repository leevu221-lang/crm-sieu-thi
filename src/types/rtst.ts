/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MarketInfo {
  name: string;
  targetST: number;
  actualReal: number;
  actualVirtual: number;
  percentHT?: number;
}

export interface CategoryData {
  name: string;
  actual: number;
  target: number;
  rate: number;
  marketName?: string;
  type?: 'SL' | 'DT' | 'ALL';
}

export interface StaffData {
  displayName: string;
  fullId: string;
  actualVal: number;
  virtualVal: number;
  effVal: number;
  target?: number;
  rate?: number;
}

export interface StaffMatrixData {
  displayName: string;
  fullId: string;
  achieved: number;
  totalCats: number;
  rate: number;
  rawValues: number[];
  projectedRates: number[];
}

export interface YcxItemDetail {
  productName: string;
  revenue: number;
  convertedRevenue: number;
  category: string;
  isInstallment: boolean;
  quantity: number;
}

export interface YcxStaffData {
  staffName: string;
  marketName?: string;
  totalRevenue: number;
  convertedRevenue: number;
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
}
