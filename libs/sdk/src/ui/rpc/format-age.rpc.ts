import { RpcOrPrimitive } from '../rpc.types';

export function formatAge(value: RpcOrPrimitive): RpcOrPrimitive {
    return {
        method: 'formatAge',
        params: [value],
    };
}
