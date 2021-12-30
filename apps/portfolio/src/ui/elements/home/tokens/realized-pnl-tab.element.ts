export const realizedPnlTab = [
  {
    view: 'progressCard',
    description: 'We are fetching your transaction data, hang tight!',
    when: { not: '$.token_pnl_summaries' },
    milestones: '$.token_pnl_milestones',
  },
  {
    view: 'datatable',
    items: '$.token_pnl_summaries',
    when: '$.token_pnl_summaries',
    options: {
      defaultSortFieldId: 'realizedGain',
      defaultSortAsc: false,
      filterable: false,
    },
    columns: [
      {
        id: 'token',
        value: '$.token.symbol',
        sortable: true,
        cell: [
          {
            view: 'tile',
            left: [
              {
                view: 'image',
                src: '$.token.logo',
                size: 28,
              },
            ],
            title: '$.token.symbol',
          },
        ],
      },
      {
        id: 'costBasis',
        value: '$.costBasis.fiat',
        grow: 0,
        label: {
          value: '$.costBasis.fiat',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
      },
      {
        id: 'realizedValue',
        value: '$.realizedValue',
        grow: 0,
        label: {
          value: '$.realizedValue',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
      },
      {
        id: 'realizedGain',
        value: '$.realizedGain',
        grow: 0,
        label: {
          value: '$.realizedGain',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
      },
    ],
  },
];
