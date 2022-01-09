import { RpcOrPrimitive } from '../rpc.types';

export function formatPercent(value: RpcOrPrimitive): RpcOrPrimitive {
  return {
    method: 'formatPercent',
    params: [value],
  };
}
