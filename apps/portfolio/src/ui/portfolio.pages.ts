import tokenBalances from './home/token-balances.uielement';
import nftBalances from './home/nft-balances.uielement';
import nftPnlSummaries from './home/nft-pnl-summaries.uielement';
import tokenPnlSummaries from './home/token-pnl-summaries.uielement';
import nftPnlDetails from './home/nft-pnl-details.uielement';

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
      id: 'portfolio/tokens/pnl',
      element: tokenPnlSummaries(),
    },
    {
      id: 'portfolio/nfts/pnl',
      element: nftPnlSummaries(),
    },
    {
      id: 'portfolio/nfts/pnl/:chainId/:tokenAddress',
      element: nftPnlDetails(),
    },
  ];
}
