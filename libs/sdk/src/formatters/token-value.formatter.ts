import { commify } from '@ethersproject/units';

export function tokenValue(value: number) {
  if (isNaN(value)) {
    return '?';
  }

  const sigfig = roundSignif(value, 4);

  return commify(sigfig);
}

function roundDecimal(value: number, digits = 0) {
  const n = Math.pow(10, digits);
  return Math.round(value * n) / n;
}

function roundSignif(value: number, digits = 1) {
  const scaleFactor = Math.floor(Math.log10(Math.abs(value)));
  return roundDecimal(value, digits - scaleFactor - 1);
}
