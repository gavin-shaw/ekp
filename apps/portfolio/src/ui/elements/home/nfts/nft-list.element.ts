export const nftList = {
  view: 'datatable',
  items: '$.collections',
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
          },
        },
      ],
    },
    {
      id: 'value',
      value: '$.balanceFiat.value',
      filterable: true,
      sortable: true,
      alignTitle: 'right',
      cell: [
        {
          view: 'tile',
          title: [
            {
              view: 'tile',
              title: '$.balanceFiat.display',
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
          subtitle: '$.balance.display',
          right: true,
        },
      ],
    },
  ],
};
