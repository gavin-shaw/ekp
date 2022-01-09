import { RpcOrPrimitive } from '../rpc.types';

export function formatToken(value: RpcOrPrimitive): RpcOrPrimitive {
  return {
    method: 'formatToken',
    params: [value],
  };
}
