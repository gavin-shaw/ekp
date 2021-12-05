import { commify } from '@ethersproject/units';

export function currencyValue(value: number, symbol: string) {
  if (isNaN(value)) {
    return `?`;
  }

  if (value === 0) {
    return `${symbol} 0`;
  }

  if (value < 0.0001) {
    return `${symbol} ~0`;
  }

  // TODO: find a better way to implement significant figures
  // I tried a couple of libraries and toPrecision() but they didn't work very well

  let c: string;

  if (value < 1) {
    c = value.toFixed(2);
  } else if (value < 10) {
    c = value.toFixed(2);
  } else if (value < 100) {
    c = value.toFixed(1);
  } else if (value < 1000) {
    c = value.toFixed(0);
  } else {
    c = commify(Math.floor(value));
  }

  return `${symbol} ${c}`;
}
