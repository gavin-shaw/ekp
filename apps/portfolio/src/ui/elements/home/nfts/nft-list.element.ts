export const nftList = {
  view: 'datatable',
  items: '$.collections',
  options: {
    pagination: false,
    defaultSortFieldId: 'asset',
    defaultSortAsc: true,
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
          subtitle: '$.floorPriceFiat.display',
        },
      ],
    },
    {
      id: 'value',
      value: '$.balanceFiat.display',
      filterable: true,
      sortable: true,
      right: true,
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
