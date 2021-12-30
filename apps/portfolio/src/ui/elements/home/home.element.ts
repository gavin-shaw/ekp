import { nftList } from './nfts';
import { portfolioStats } from './portfolio-stats.element';
import { tokenList } from './tokens';
import { realizedPnlTab } from './tokens/realized-pnl-tab.element';

export const homeElement = [
  {
    view: 'card',
    children: [portfolioStats],
  },
  {
    view: 'card',
    children: [
      {
        view: 'tabs',
        children: {
          // TODO: use a list here, not a map, to be more consistent
          Tokens: [
            {
              view: 'tabs',
              children: {
                Balances: [tokenList],
                'Realized P & L': realizedPnlTab,
              },
            },
          ],
          NFTs: [nftList],
        },
      },
    ],
  },
];
