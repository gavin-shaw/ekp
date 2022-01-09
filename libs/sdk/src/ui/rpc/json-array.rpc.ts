import { RpcOrPrimitive } from '../rpc.types';

export function jsonArray(values: RpcOrPrimitive): RpcOrPrimitive {
  return {
    method: 'jsonArray',
    params: [values],
  };
}
