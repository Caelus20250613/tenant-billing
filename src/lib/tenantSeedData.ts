import { Tenant } from '../types';

// 「単価＋基本」の表記に対応: 単価 = unitPrice, 基本料金 = baseFee
export const TENANT_SEED_DATA: Omit<Tenant, 'id'>[] = [
  // ── 日建工学株式会社（2部屋：一括請求） ──────────────────────
  {
    roomName: '日建工学株式会社 6-8',
    billingName: '日建工学株式会社',
    sortOrder: 1,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 3500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '日建工学株式会社 6-7',
    billingName: '日建工学株式会社',
    sortOrder: 2,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 3500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },

  // ── 迅翔興業（4部屋：一括請求） ─────────────────────────────
  {
    roomName: '迅翔興業 6-4',
    billingName: '迅翔興業',
    sortOrder: 3,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '迅翔興業 6-3',
    billingName: '迅翔興業',
    sortOrder: 4,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '迅翔興業 6-2',
    billingName: '迅翔興業',
    sortOrder: 5,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '迅翔興業 6-1',
    billingName: '迅翔興業',
    sortOrder: 6,
    isActive: true,
    settings: {
      light: { hasMeter: true, unitPrice: 24,  baseFee: 598  },
      power: { hasMeter: true, unitPrice: 21,  baseFee: 5500 },
      water: { hasMeter: true, unitPrice: 200, baseFee: 1277 }, // 水道あり
    },
  },

  // ── 三谷歯科（7部屋：一括請求） ─────────────────────────────
  {
    roomName: '三谷歯科 5-2.3',
    billingName: '三谷歯科',
    sortOrder: 7,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '三谷歯科 5-1',
    billingName: '三谷歯科',
    sortOrder: 8,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '三谷歯科 4-右',
    billingName: '三谷歯科',
    sortOrder: 9,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 30, baseFee: 598 }, // 単価30
      power: { hasMeter: false, unitPrice: 0,  baseFee: 0   }, // 動力なし
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0   },
    },
  },
  {
    roomName: '三谷歯科 4-左',
    billingName: '三谷歯科',
    sortOrder: 10,
    isActive: true,
    settings: {
      light: { hasMeter: true, unitPrice: 30, baseFee: 598   }, // 単価30
      power: { hasMeter: true, unitPrice: 21, baseFee: 20000 }, // 基本20000
      water: { hasMeter: false, unitPrice: 0, baseFee: 0     },
    },
  },
  {
    roomName: '三谷歯科 3-5',
    billingName: '三谷歯科',
    sortOrder: 11,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 30, baseFee: 598 }, // 単価30
      power: { hasMeter: false, unitPrice: 0,  baseFee: 0   }, // 動力なし
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0   },
    },
  },
  {
    roomName: '三谷歯科 3-4',
    billingName: '三谷歯科',
    sortOrder: 12,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '三谷歯科 3-3',
    billingName: '三谷歯科',
    sortOrder: 13,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },

  // ── 単独テナント ─────────────────────────────────────────────
  {
    roomName: 'ワールドライフサービス',
    billingName: '',
    sortOrder: 14,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '山本電機',
    billingName: '',
    sortOrder: 15,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 26, baseFee: 598  }, // 単価26
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: '科研製薬',
    billingName: '',
    sortOrder: 16,
    isActive: true,
    settings: {
      light: { hasMeter: true,  unitPrice: 24, baseFee: 598  },
      power: { hasMeter: true,  unitPrice: 21, baseFee: 5500 },
      water: { hasMeter: false, unitPrice: 0,  baseFee: 0    },
    },
  },
  {
    roomName: 'トスティーノ',
    billingName: '',
    sortOrder: 17,
    isActive: true,
    settings: {
      light: { hasMeter: true, unitPrice: 26,  baseFee: 598  }, // 単価26
      power: { hasMeter: true, unitPrice: 21,  baseFee: 5500 },
      water: { hasMeter: true, unitPrice: 200, baseFee: 1277 }, // 水道あり
    },
  },
  {
    roomName: 'ライフ体操教室',
    billingName: '',
    sortOrder: 18,
    isActive: true,
    settings: {
      light: { hasMeter: true, unitPrice: 24,  baseFee: 598  },
      power: { hasMeter: true, unitPrice: 21,  baseFee: 8000 }, // 基本8000
      water: { hasMeter: true, unitPrice: 200, baseFee: 1277 }, // 水道あり
    },
  },
];
