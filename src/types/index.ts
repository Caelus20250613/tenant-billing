export interface InfraSetting {
  hasMeter: boolean;
  baseFee: number;
  unitPrice: number;
}

export interface Tenant {
  id: string;
  roomName: string;
  billingName?: string; // Additional field for grouping invoices
  sortOrder: number;
  isActive: boolean;
  settings: {
    light: InfraSetting;
    power: InfraSetting;
    water: InfraSetting;
  };
}

export interface MeterReading {
  previousValue: number;
  currentValue: number;
  usage: number;
  calculatedFee: number;
}

export interface MonthlyBillingRecord {
  id: string;
  billingMonth: string; // YYYY-MM
  tenantId: string;
  readings: {
    light: MeterReading;
    power: MeterReading;
    water: MeterReading;
  };
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'ISSUED';
}

// 請求書PDF用の型（@react-pdf/renderer に依存しない型定義）
export interface InvoiceLineItem {
  id: string;
  type: 'light' | 'power' | 'water';
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  usage: number;
  fee: number;
}

export interface InvoiceData {
  groupId: string;
  recipientName: string;
  billingMonth: string;
  items: InvoiceLineItem[];
  totalAmount: number;
}
