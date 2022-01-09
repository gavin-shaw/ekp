import { DefaultProps } from '../default.props';
import { RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Tile(props: TileProps): UiElement {
  return {
    type: 'Tile',
    props,
  };
}

export interface TileProps extends DefaultProps {
  align?: 'left' | 'right';
  left?: UiElement;
  right?: UiElement;
  subTitle?: UiElement | RpcOrPrimitive;
  title?: UiElement | RpcOrPrimitive;
}
