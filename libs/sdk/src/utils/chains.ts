import { ChainMetadata } from './ChainMetadata';

export const chains: { [chainId: string]: ChainMetadata } = {
  bsc: {
    id: 'bsc',
    logo: 'https://cryptologos.cc/logos/thumbs/binance-coin.png?v=014',
    name: 'Binance Smart Chain',
    explorer: 'https://bscscan.com/',
    token: {
      coinId: 'binancecoin',
      contractAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      decimals: 18,
      name: 'Binance Coin',
      symbol: 'BNB',
    },
  },
  polygon: {
    id: 'polygon',
    logo: 'https://cryptologos.cc/logos/thumbs/polygon.png?v=014',
    name: 'Polygon',
    explorer: 'https://polygonscan.com/',
    token: {
      coinId: 'matic-network',
      contractAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
      decimals: 18,
      name: 'Polygon',
      symbol: 'MATIC',
    },
  },
  eth: {
    id: 'eth',
    logo: 'https://cryptologos.cc/logos/thumbs/ethereum.png?v=014',
    name: 'Ethereum',
    explorer: 'https://etherscan.com/',
    token: {
      coinId: 'ethereum',
      contractAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      decimals: 18,
      name: 'Ethereum',
      symbol: 'ETH',
    },
  },
};
