export default function menus() {
  return [
    {
      header: 'Balances',
    },
    {
      title: 'Tokens',
      navLink: 'portfolio/tokens/balances',
      icon: 'cil-money',
    },
    {
      title: 'NFTs',
      navLink: 'portfolio/nfts/balances',
      icon: 'cil-color-palette',
    },
    {
      header: 'P & L',
    },
    {
      title: 'Tokens',
      navLink: 'portfolio/tokens/pnl',
      icon: 'cil-money',
    },
    {
      title: 'NFTs',
      navLink: 'portfolio/nfts/pnl',
      icon: 'cil-color-palette',
    },
  ];
}
