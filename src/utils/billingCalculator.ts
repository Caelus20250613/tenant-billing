export interface BillingCalculationResult {
  usage: number | null;
  fee: number | null;
  isError: boolean;
  errorMessage?: string;
}

export function calculateInfraBilling(
  previous: number,
  current: number | '',
  setting: { baseFee: number, unitPrice: number }
): BillingCalculationResult {
  if (current === '' || typeof current !== 'number' || isNaN(current)) {
    return { usage: null, fee: null, isError: false };
  }

  if (current < previous) {
    return {
      usage: null,
      fee: null,
      isError: true,
      errorMessage: "当月指針が前月より少なくなっています",
    };
  }

  const usage = current - previous;
  const rawFee = setting.baseFee + (usage * setting.unitPrice);
  const fee = Math.floor(rawFee);

  return { usage, fee, isError: false };
}
