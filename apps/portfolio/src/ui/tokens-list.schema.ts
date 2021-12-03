export const TokensListSchema = [
  {
    view: 'datatable',
    title: 'Portfolio',
    items: '$.tokens',
    options: {
      defaultSortFieldId: 'fiatValue',
      defaultSortAsc: false,
    },
    columns: [
      // {
      //   id: 'type',
      //   value: 'Token',
      //   grow: 0,
      //   center: true,
      //   filterable: true,
      //   filterOptions: ['Token'],
      // },
      {
        id: 'chain',
        grow: 0,
        center: true,
        cell: [
          {
            view: 'image',
            url: 'https://cryptologos.cc/logos/binance-coin-bnb-logo.png?v=014',
            size: 16,
            tooltip: 'Binance Smart Chain',
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
        value: '$.balance',
        label: '$.description',
        sortable: true,
        filterable: true,
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
        actions: [
          {
            icon: 'cil-burn',
            tooltip: 'Burn spam token',
            color: 'yellow',
            when: '$.allowBurnToken',
          },
        ],
      },
    ],
  },
];
