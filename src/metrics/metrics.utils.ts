import BigNumber from 'bignumber.js';

export const normalizeAmount = (amount: string, decimals: number): BigNumber => {
  return new BigNumber(amount).dividedBy(new BigNumber(10).pow(decimals));
};
