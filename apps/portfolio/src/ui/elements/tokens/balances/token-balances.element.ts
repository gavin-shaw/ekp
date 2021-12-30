import tokenBalancesStats from './token-balances-stats.element';
import tokenBalancesList from './token-balances-list.element';

export default function element() {
  return [
    {
      view: 'row',
      children: [...tokenBalancesStats(), {}],
    },
    ...tokenBalancesList(),
  ];
}
