import { RpcOrPrimitive } from '../rpc.types';

export function sum(values: RpcOrPrimitive): RpcOrPrimitive {
  return {
    method: 'sum',
    params: [values],
  };
}
