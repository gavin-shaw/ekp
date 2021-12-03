import { commify } from '@ethersproject/units';

export function currencyValue(value: number, symbol: string) {
  if (isNaN(value)) {
    return '?';
  }

  const rounded = value.toFixed(2);

  const c = commify(rounded);

  return `${symbol} ${c}`;
}
