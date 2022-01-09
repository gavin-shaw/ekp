import { DefaultProps } from '../default.props';
import { RpcOrPrimitive } from '../rpc.types';
import { UiElement } from '../ui.element';

export function Datatable(props: DatatableProps): UiElement {
  return {
    type: 'Datatable',
    props,
  };
}

export interface DatatableProps extends DefaultProps {
  columns: DatatableColumn[];
  data: RpcOrPrimitive;
  defaultSortAsc?: RpcOrPrimitive;
  defaultSortFieldId?: RpcOrPrimitive;
  filterable?: RpcOrPrimitive;
  pagination?: RpcOrPrimitive;
}

export interface DatatableColumn {
  id: RpcOrPrimitive;
  filterable?: RpcOrPrimitive;
  name?: RpcOrPrimitive;
  right?: RpcOrPrimitive;
  sortable?: RpcOrPrimitive;
  value?: RpcOrPrimitive;
  cell?: UiElement;
}
