import homeElement from './home/home.uielement';
import tokensRealizedPnlDetail from './tokens/realizedpnl/realized-pnl-detail.element';
import nftsRealizedPnlDetail from './nfts/realizedpnl/realized-pnl-detail.element';
import tokenBalances from './home/token-balances.uielement';
import nftBalances from './home/nft-balances.uielement';
import nftPnlSummaries from './home/nft-pnl-summaries.uielement';

export default function pages() {
  return [
    {
      id: 'portfolio/tokens/balances',
      element: tokenBalances(),
    },
    {
      id: 'portfolio/nfts/balances',
      element: nftBalances(),
    },
    {
      id: 'portfolio/nfts/pnl',
      element: nftPnlSummaries(),
    },
    // {
    //   id: 'tokens/realizedpnl/:chainId/:tokenAddress',
    //   element: tokensRealizedPnlDetail(),
    // },
    // {
    //   id: 'nfts/realizedpnl/:chainId/:tokenAddress',
    //   element: nftsRealizedPnlDetail(),
    // },
  ];
}
