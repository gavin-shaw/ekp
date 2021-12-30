import realizedPnlList from './realized-pnl-list.element';
import realizedPnlStats from './realized-pnl-stats.element';

export default function element() {
  return [
    {
      view: 'row',
      children: [...realizedPnlStats(), {}],
    },
    ...realizedPnlList(),
  ];
}
