export const TokensListSchema = ({ loading }) => [
  {
    view: 'datatable',
    title: 'Portfolio',
    items: '$.tokens',
    options: {
      pagination: false,
      defaultSortFieldId: 'fiatValue',
      defaultSortAsc: false,
      loading,
    },
    columns: [
      {
        id: 'chain',
        grow: 0,
        center: true,
        value: 'BSC',
        filterable: true,
        filterOptions: ['BSC'],
        cell: [
          {
            view: 'image',
            url: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=014',
            size: 16,
            tooltip: 'BSC',
          },
        ],
      },
      {
        id: 'name',
        title: 'Project',
        value: '$.name',
        filterable: true,
        sortable: true,
        cell: [
          {
            view: 'link',
            url: '$.tokenLink',
            content: '$.name',
            tooltip: 'Open token details',
          },
        ],
      },
      {
        id: 'description',
        label: '$.description',
        cell: [
          {
            view: 'link',
            url: '$.walletTokenLink',
            content: '$.description',
            tooltip: 'Open token history',
          },
        ],
      },
      {
        id: 'fiatValue',
        title: 'Value',
        value: '$.fiatValue',
        label: '$.fiatValueFormatted',
        center: true,
        sortable: true,
        filterable: true,
        cell: [
          {
            view: 'link',
            url: '$.coinLink',
            content: '$.fiatValueFormatted',
            tooltip: 'View coin price history',
          },
        ],
      },
      {
        center: true,
        actions: [
          {
            icon: 'cil-swap-horizontal',
            tooltip: 'Swap Token',
            when: '$.allowSwap',
            rpc: {
              method: 'ek_openLink',
              params: ['$.swapLink'],
            },
          },
          {
            icon: 'cil-wallet',
            tooltip: 'Add to Metamask',
            size: 14,
            rpc: {
              method: 'wallet_watchAsset',
              params: {
                type: 'ERC20',
                options: {
                  address: '$.tokenAddress',
                  symbol: '$.symbol',
                  decimals: '$.decimals',
                  image: '$.logo',
                },
              },
            },
          },
          {
            icon: 'cil-burn',
            tooltip: 'Burn Spam Token',
            when: '$.allowBurnToken',
          },
        ],
      },
    ],
  },
];
