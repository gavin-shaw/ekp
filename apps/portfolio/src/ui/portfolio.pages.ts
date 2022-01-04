import homeElement from './home/home.element';
import tokensRealizedPnlDetail from './tokens/realizedpnl/realized-pnl-detail.element';
import nftsRealizedPnlDetail from './nfts/realizedpnl/realized-pnl-detail.element';

export default function pages() {
  return [
    {
      id: 'portfolio',
      elements: homeElement(),
    },
    {
      id: 'portfolio/tokens/realizedpnl/:chainId/:tokenAddress',
      elements: tokensRealizedPnlDetail(),
    },
    {
      id: 'portfolio/nfts/realizedpnl/:chainId/:tokenAddress',
      elements: nftsRealizedPnlDetail(),
    },
  ];
}
