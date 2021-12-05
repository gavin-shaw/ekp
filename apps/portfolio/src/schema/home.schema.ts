export const HomeSchema = ({ loading }) => [
  {
    view: 'datatable',
    title: 'Portfolio',
    items: '$.tokens',
    className: 'd-none d-sm-block',
    options: {
      pagination: false,
      defaultSortFieldId: 'fiatValue',
      defaultSortAsc: false,
      loading,
    },
    columns: [
      {
        id: 'chain',
        value: 'Binance Smart Chain',
        filterable: true,
        filterOptions: ['Binance Smart Chain'],
        center: true,
        width: '80px',
        cell: [
          {
            view: 'image',
            src: 'https://cryptologos.cc/logos/thumbs/binance-coin.png?v=014',
            tooltip: 'Binance Smart Chain',
            size: 22,
          },
        ],
      },
      {
        id: 'name',
        name: 'Asset',
        value: '$.name',
        cell: [
          {
            view: 'row',
            children: [
              {
                view: 'image',
                src: '$.logo',
                size: 22,
              },
              {
                view: 'span',
                value: '$.name',
              },
            ],
          },
        ],
        filterable: true,
        sortable: true,
      },
      {
        id: 'price',
        value: '$.price',
        label: '$.priceFormatted',
        sortable: true,
        right: true,
        width: '120px',
      },
      {
        id: 'balance',
        value: '$.balance',
        label: '$.balanceFormatted',
        hide: 'md',
        sortable: true,
        filterable: true,
        right: true,
        width: '200px',
      },
      {
        id: 'fiatValue',
        value: '$.fiatValue',
        label: '$.fiatValueFormatted',
        sortable: true,
        filterable: true,
        right: true,
        width: '120px',
      },
      {
        id: 'actions',
        compact: true,
        name: '',
        center: true,
        width: '32px',
        actions,
      },
    ],
  },
  {
    view: 'datatable',
    title: 'Portfolio',
    items: '$.tokens',
    className: 'd-block d-sm-none',
    options: {
      pagination: false,
      defaultSortFieldId: 'fiatValue',
      defaultSortAsc: false,
      loading,
    },
    columns: [
      {
        id: 'asset',
        value: '$.name',
        filterable: true,
        sortable: true,
        cell: [
          {
            view: 'tile',
            left: [
              {
                view: 'image',
                src: '$.logo',
                size: 28,
              },
            ],
            title: '$.name',
            subtitle: '$.priceFormatted',
          },
        ],
      },
      {
        id: 'value',
        value: '$.fiatValue',
        filterable: true,
        sortable: true,
        right: true,
        cell: [
          {
            view: 'tile',
            title: [
              {
                view: 'tile',
                title: '$.fiatValueFormatted',
                right: [
                  {
                    view: 'image',
                    src: '$.chainLogo',
                    size: 12,
                    tooltip: 'Binance Smart Chain',
                  },
                ],
              },
            ],
            subtitle: '$.balanceFormatted',
            right: true,
          },
        ],
      },
      {
        id: 'actions',
        compact: true,
        name: '',
        width: '22px',
        actions,
      },
    ],
  },
];

const actions = [
  {
    icon: 'cil-wallet',
    name: 'Add to Metamask',
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
    name: 'Burn Spam Token',
    when: '$.allowBurnToken',
  },
  {
    icon: 'cil-swap-horizontal',
    name: 'Swap Token',
    when: '$.allowSwap',
    rpc: {
      method: 'ek_openLink',
      params: ['$.swapLink'],
    },
  },
];
