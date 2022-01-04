import list from './realized-pnl-list.element';
import stats from './realized-pnl-stats.element';

export default function element() {
  return [
    {
      view: 'row',
      children: [...stats(), {}],
    },
    ...list(),
  ];
}
