import nftBalancesStats from './nft-balances-stats.element';
import nftBalancesList from './nft-balances-list.element';

export default function element() {
  return [
    {
      view: 'row',
      children: [...nftBalancesStats(), {}],
    },
    ...nftBalancesList(),
  ];
}
