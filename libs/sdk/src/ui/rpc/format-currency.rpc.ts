import { RpcOrPrimitive } from '../rpc.types';

export function formatCurrency(value: RpcOrPrimitive): RpcOrPrimitive {
  return {
    method: 'formatCurrency',
    params: [value],
  };
}
