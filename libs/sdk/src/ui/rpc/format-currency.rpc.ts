import { RpcOrPrimitive } from '../rpc.types';

export function formatCurrency(value: RpcOrPrimitive, fiatSymbol: RpcOrPrimitive): RpcOrPrimitive {
  return {
    method: 'formatCurrency',
    params: [value, fiatSymbol],
  };
}
