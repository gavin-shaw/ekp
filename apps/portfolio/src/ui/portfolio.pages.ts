import homeElement from './home/home.element';
import tokensRealizedPnlDetail from './tokens/realizedpnl/realized-pnl-detail.element';

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
  ];
}
