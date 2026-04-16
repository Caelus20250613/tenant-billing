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
