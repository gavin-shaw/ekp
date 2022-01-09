import { DefaultProps } from '../default.props';
import { RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function SummaryStats(props: SummaryStatsProps): UiElement {
  return {
    type: 'SummaryStats',
    props,
  };
}

export interface SummaryStatsProps extends DefaultProps {
  title?: RpcOrPrimitive;
  rows: {
    label: RpcOrPrimitive;
    value: RpcOrPrimitive;
  }[];
}
