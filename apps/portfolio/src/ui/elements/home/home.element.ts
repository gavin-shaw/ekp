import { nftList } from './nfts';
import { tokenList } from './tokens';

export const homeElement = [
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
