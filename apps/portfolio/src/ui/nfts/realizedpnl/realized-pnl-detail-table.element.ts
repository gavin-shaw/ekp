export default function element() {
  return [
    {
      view: 'datatable',
      title: 'Realized P & L',
      items: '$.*',
      options: {
        defaultSortFieldId: 'blockTimestamp',
        defaultSortAsc: false,
        filterable: false,
        paginationPerPage: 25,
        responsive: true,
        onRowClicked: {
          method: 'ek_openLink',
          params: ['$.links.explorer'],
        },
      },
      columns: [
        {
          id: 'blockTimestamp',
          name: 'Timestamp',
          value: '$.blockTimestamp',
          label: {
            value: '$.blockTimestamp',
            formatter: 'timestamp',
          },
          width: '160px',
          sortable: true,
        },
        {
          id: 'blockNumber',
          value: '$.blockNumber',
          grow: 0,
        },
        {
          id: 'description',
          value: '$.description',
        },
        {
          id: 'price',
          value: '$.tokenValue.fiatAmount',
          grow: 0,
          label: {
            value: '$.tokenValue.fiatAmount',
            formatter: 'currency',
            symbol: '$.tokenValue.fiatSymbol',
          },
        },
        {
          id: 'costBasis',
          value: '$.costBasis',
          grow: 0,
          label: {
            value: '$.costBasis',
            formatter: 'currency',
            symbol: '$.tokenValue.fiatSymbol',
          },
        },
        {
          id: 'realizedGain',
          value: '$.realizedGain',
          grow: 0,
          label: {
            value: '$.realizedGain',
            formatter: 'currency',
            symbol: '$.tokenValue.fiatSymbol',
          },
        },
        {
          id: 'unrealizedCost',
          value: '$.unrealizedCost',
          grow: 0,
          label: {
            value: '$.unrealizedCost',
            formatter: 'currency',
            symbol: '$.tokenValue.fiatSymbol',
          },
        },
      ],
    },
  ];
}
