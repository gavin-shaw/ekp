import homeElement from './home/home.uielement';
import tokensRealizedPnlDetail from './tokens/realizedpnl/realized-pnl-detail.element';
import nftsRealizedPnlDetail from './nfts/realizedpnl/realized-pnl-detail.element';
import tokenBalances from './home/token-balances.uielement';
import { Container } from '@app/sdk/ui';

export default function pages() {
  return [
    {
      id: 'portfolio/tokens/balances',
      element: tokenBalances(),
    },
    {
      id: 'portfolio/nfts/balances',
      element: Container(),
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
