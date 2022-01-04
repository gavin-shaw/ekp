export default function element() {
  return [
    {
      view: 'datatable',
      items: '$.nft_pnl_summaries.*',
      options: {
        pagination: false,
        defaultSortFieldId: 'realizedGain',
        defaultSortAsc: false,
        filterable: false,
        onRowClicked: {
          method: 'ek_navigate',
          params: ['$.links.details'],
        },
      },
      columns: [
        {
          id: 'Collection',
          value: '$.nftCollection.name',
          sortable: true,
          cell: [
            {
              view: 'tile',
              left: [
                {
                  view: 'image',
                  src: '$.nftCollection.logo',
                  size: 28,
                },
              ],
              title: '$.nftCollection.name',
            },
          ],
        },
        {
          id: 'costBasis',
          value: '$.costBasis',
          grow: 0,
          sortable: true,
          label: {
            value: '$.costBasis',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
        {
          id: 'realizedValue',
          value: '$.realizedValue',
          sortable: true,
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
          sortable: true,
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
}
