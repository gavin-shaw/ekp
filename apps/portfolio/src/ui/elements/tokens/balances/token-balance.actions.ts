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
            address: '$.contractAddress',
            symbol: '$.symbol',
            decimals: '$.decimals',
            image: '$.logo',
          },
        },
      },
    },
    {
      icon: 'cil-swap-horizontal',
      name: 'Swap Token',
      when: '$.allowSwap',
      rpc: {
        method: 'ek_openLink',
        params: ['$.links.swap'],
      },
    },
    {
      icon: 'cil-external-link',
      name: 'Token Details',
      rpc: {
        method: 'ek_openLink',
        params: ['$.links.token'],
      },
    },
  ];
}
