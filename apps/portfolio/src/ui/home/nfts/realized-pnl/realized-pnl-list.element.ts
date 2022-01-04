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
              view: 'row',
              columns: [
                {
                  className: 'col-auto',
                  children: [
                    {
                      view: 'image',
                      src: '$.nftCollection.logo',
                      size: 28,
                    },
                  ],
                },
                {
                  className: 'col-auto',
                  children: [
                    {
                      view: 'span',
                      containerClassName: 'ml-0',
                      value: '$.nftCollection.name',
                    },
                    {
                      view: 'span',
                      containerClassName: 'ml-0',
                      className: 'font-small-1',
                      value: {
                        value: 'Cost {{ costBasis }}',
                        formatter: 'template',
                        scope: {
                          costBasis: {
                            value: '$.costBasis',
                            formatter: 'currency',
                            symbol: '$.fiatSymbol',
                          },
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'realizedGain',
          value: '$.realizedGain',
          right: true,
          cell: [
            {
              view: 'span',
              className: 'text-right',
              value: {
                formatter: 'currency',
                value: '$.realizedGain',
                symbol: '$.fiatSymbol',
              },
            },
            {
              view: 'span',
              className: 'text-right',
              value: {
                formatter: 'percent',
                value: '$.realizedGainPc',
              },
            },
          ],
          sortable: true,
        },
      ],
    },
  ];
}
