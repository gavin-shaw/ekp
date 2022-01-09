import { DefaultProps } from '../default.props';
import { RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Col(props?: ColProps): UiElement {
  return {
    type: 'Col',
    props,
  };
}

export interface ColProps extends DefaultProps {
  children: UiElement[];
  xs?: RpcOrPrimitive;
  sm?: RpcOrPrimitive;
  md?: RpcOrPrimitive;
  lg?: RpcOrPrimitive;
}
