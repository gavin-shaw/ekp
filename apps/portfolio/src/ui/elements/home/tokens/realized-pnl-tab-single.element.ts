export const realizedPnlTabSingle = [
  {
    view: 'progressCard',
    description: 'We are fetching your transaction data, hang tight!',
    when: { not: '$.token_pnl_events' },
    milestones: '$.token_pnl_milestones',
  },
  {
    view: 'datatable',
    title: 'Realized P & L',
    items: '$.token_pnl_events',
    when: '$.token_pnl_events',
    options: {
      defaultSortFieldId: 'timestamp',
      defaultSortAsc: false,
      filterable: false,
    },
    columns: [
      {
        id: 'timestamp',
        value: '$.timestamp',
        label: {
          value: '$.timestamp',
          formatter: 'timestamp',
        },
        width: '160px',
        sortable: true,
      },
      {
        id: 'description',
        value: '$.description',
      },
      {
        id: 'price',
        value: '$.tokenPrice',
        grow: 0,
        label: {
          value: '$.tokenPrice',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
      },
      {
        id: 'value',
        value: '$.valueFiat',
        grow: 0,
        label: {
          value: '$.valueFiat',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
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
        id: 'realizedGain',
        value: '$.realizedGain',
        grow: 0,
        label: {
          value: '$.realizedGain',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
      },
      {
        id: 'unrealizedCost',
        value: '$.unrealizedCost',
        grow: 0,
        label: {
          value: '$.unrealizedCost',
          formatter: 'currency',
          symbol: '$.fiatSymbol',
        },
      },
      {
        id: 'actions',
        compact: true,
        name: '',
        width: '22px',
        actions: [
          {
            icon: 'cil-external-link',
            name: 'Transfer Details',
            rpc: {
              method: 'ek_openLink',
              params: ['$.links.transaction'],
            },
          },
        ],
      },
    ],
  },
];
