export const nftList = {
  view: 'datatable',
  items: '$.nfts',
  options: {
    pagination: false,
    defaultSortFieldId: 'value',
    defaultSortAsc: false,
    filterable: false,
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
          subtitle: {
            value: '$.price',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
      ],
    },
    {
      id: 'value',
      value: '$.valueFiat',
      filterable: true,
      sortable: true,
      alignTitle: 'right',
      cell: [
        {
          view: 'tile',
          title: [
            {
              view: 'tile',
              title: {
                value: '$.valueFiat',
                formatter: 'currency',
                symbol: '$.fiatSymbol',
              },
              right: [
                {
                  view: 'image',
                  src: '$.chain.logo',
                  size: 12,
                  tooltip: '$.chain.name',
                },
              ],
            },
          ],
          subtitle: { value: '$.fetchTimestamp', formatter: 'datetime' },
          right: true,
        },
      ],
    },
  ],
};
