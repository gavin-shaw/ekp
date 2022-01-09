import { RpcOrPrimitive } from '../rpc.types';

export function formatTemplate(
  value: RpcOrPrimitive,
  scope: Record<string, RpcOrPrimitive>,
): RpcOrPrimitive {
  return {
    method: 'formatTemplate',
    params: [value, scope],
  };
}
