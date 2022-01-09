import homeElement from './home/home.uielement';
import tokensRealizedPnlDetail from './tokens/realizedpnl/realized-pnl-detail.element';
import nftsRealizedPnlDetail from './nfts/realizedpnl/realized-pnl-detail.element';

export default function pages() {
  return [
    {
      id: 'portfolio',
      element: homeElement(),
    },
    // {
    //   id: 'portfolio/tokens/realizedpnl/:chainId/:tokenAddress',
    //   element: tokensRealizedPnlDetail(),
    // },
    // {
    //   id: 'portfolio/nfts/realizedpnl/:chainId/:tokenAddress',
    //   element: nftsRealizedPnlDetail(),
    // },
  ];
}
