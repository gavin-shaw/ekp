export type RpcOrPrimitive =
  | Rpc
  | string
  | number
  | boolean
  | string[]
  | number[];

export interface Rpc {
  method: string;
  params?: RpcOrPrimitive[];
}
