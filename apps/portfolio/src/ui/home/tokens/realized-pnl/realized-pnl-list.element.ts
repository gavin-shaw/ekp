export default function element() {
  return [
    {
      view: 'datatable',
      items: '$.token_pnl_summaries.*',
      options: {
        defaultSortFieldId: 'realizedGain',
        defaultSortAsc: false,
        filterable: false,
        onRowClicked: {
          method: 'ek_navigate',
          params: ['$.links.pnlDetails'],
        },
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
              subtitle: {
                value: 'Cost {{ costBasis }}',
                formatter: 'template',
                scope: {
                  costBasis: {
                    value: '$.costBasis.fiat',
                    formatter: 'currency',
                    symbol: '$.fiatSymbol',
                  },
                },
              },
            },
          ],
        },
        {
          id: 'realizedGain',
          value: '$.realizedGain',
          sortable: true,
          right: true,
          cell: [
            {
              view: 'tile',
              right: true,
              title: {
                value: '$.realizedGain',
                formatter: 'currency',
                symbol: '$.fiatSymbol',
              },
              subtitle: {
                value: '$.realizedGainPc',
                formatter: 'percent',
              },
            },
          ],
        },
      ],
    },
  ];
}
