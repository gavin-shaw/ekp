export default function menus() {
  return [
    {
      id: 'portfolio',
      header: 'Portfolio',
    },
    {
      id: 'portfolio-token-balances',
      title: 'Tokens',
      navLink: 'portfolio/tokens/balances',
      icon: 'cil-money',
    },
    {
      id: 'portfolio-nft-balances',
      title: 'NFTs',
      navLink: 'portfolio/nfts/balances',
      icon: 'cil-color-palette',
    },
    // {
    //   header: 'P & L',
    // },
    // {
    //   title: 'Tokens',
    //   navLink: 'portfolio/tokens/pnl',
    //   icon: 'cil-money',
    // },
    // {
    //   title: 'NFTs',
    //   navLink: 'portfolio/nfts/pnl',
    //   icon: 'cil-color-palette',
    // },
  ];
}
