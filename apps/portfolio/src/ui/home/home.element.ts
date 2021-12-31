import nftBalances from './nfts/balances/nft-balances.element';
import tokenBalances from './tokens/balances/token-balances.element';
import tokenRealizedPnL from './tokens/realized-pnl/realized-pnl.element';

export default function element() {
  return [
    {
      view: 'card',
      children: [
        {
          view: 'tabs',
          tabs: [
            {
              label: 'Tokens',
              children: [
                {
                  view: 'tabs',
                  tabs: [
                    {
                      label: 'Balances',
                      children: tokenBalances(),
                    },
                    {
                      label: 'Realized P & L',
                      children: tokenRealizedPnL(),
                    },
                  ],
                },
              ],
            },
            {
              label: 'NFTs',
              children: [
                {
                  view: 'tabs',
                  tabs: [
                    {
                      label: 'Balances',
                      children: nftBalances(),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}
