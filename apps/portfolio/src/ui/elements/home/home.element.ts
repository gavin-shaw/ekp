import { nftList } from './nfts';
import { portfolioStats } from './portfolio-stats.element';
import { tokenList } from './tokens';

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
          Tokens: [tokenList],
          NFTs: [nftList],
        },
      },
    ],
  },
];
