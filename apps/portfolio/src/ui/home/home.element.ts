import nftBalances from './nfts/balances/nft-balances.element';
import tokenBalances from './tokens/balances/token-balances.element';
import tokenRealizedPnL from './tokens/realized-pnl/realized-pnl.element';
import nftRealizedPnl from './nfts/realized-pnl/realized-pnl.element';

export default function element() {
  return [
    {
      view: 'tabs',
      tabs: [
        {
          label: 'Balances',
          children: [
            {
              view: 'tabs',
              tabs: [
                {
                  label: 'Tokens',
                  children: tokenBalances(),
                },
                {
                  label: 'NFTs',
                  children: nftBalances(),
                },
              ],
            },
          ],
        },
        {
          label: 'Realized P & L',
          children: [
            {
              view: 'tabs',
              tabs: [
                {
                  label: 'Tokens',
                  children: tokenRealizedPnL(),
                },
                {
                  label: 'NFTs',
                  children: nftRealizedPnl(),
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}
