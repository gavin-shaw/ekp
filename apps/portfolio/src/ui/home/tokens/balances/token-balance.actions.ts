export default function element() {
  return [
    {
      icon: 'cil-wallet',
      name: 'Add to Metamask',
      rpc: {
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: '$.token.address',
            symbol: '$.token.symbol',
            decimals: '$.token.decimals',
            image: '$.token.logo',
          },
        },
      },
    },
    {
      icon: 'cil-swap-horizontal',
      name: 'Swap Token',
      when: '$.tokenValue.tokenPrice',
      rpc: {
        method: 'ek_openLink',
        params: ['$.links.swap'],
      },
    },
    {
      icon: 'cil-external-link',
      name: 'View in Explorer',
      rpc: {
        method: 'ek_openLink',
        params: ['$.links.explorer'],
      },
    },
  ];
}
