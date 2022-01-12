import tokenBalances from './elements/token-balances.uielement';
import nftBalances from './elements/nft-balances.uielement';
import nftPnlSummaries from './elements/nft-pnl-summaries.uielement';
import tokenPnlSummaries from './elements/token-pnl-summaries.uielement';
import nftPnlDetails from './elements/nft-pnl-details.uielement';

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
