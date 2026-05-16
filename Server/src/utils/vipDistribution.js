/**
 * Exact VIP coin split: daily first, remainder upfront.
 * upfrontCoins + dailyCheckinCoins * (durationDays - 1) === totalCoins
 */
export function computeVipCoinSplit(totalCoins, durationDays) {
  const D = Number(durationDays);
  const T = Number(totalCoins);
  if (!Number.isFinite(T) || T < 0) throw new Error('Invalid totalCoins');
  if (!Number.isFinite(D) || D < 2) throw new Error('durationDays must be >= 2 for check-in tail');
  const dailyCheckinCoins = Math.floor(T / (D * 2));
  const upfrontCoins = T - dailyCheckinCoins * (D - 1);
  return { upfrontCoins, dailyCheckinCoins };
}
