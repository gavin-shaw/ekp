import { homeNftActions } from './nft-actions';

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
      id: 'collection',
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
            value: '{{ price }} {{ symbol }} - {{ balance }} nfts',
            formatter: 'template',
            scope: {
              balance: '$.balance',
              symbol: '$.priceSymbol',
              price: {
                value: '$.price',
                formatter: 'token',
              },
            },
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
      right: true,
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
          subtitle: {
            value: '{{ age }}',
            formatter: 'template',
            scope: {
              age: {
                value: '$.fetchTimestamp',
                formatter: 'age',
              },
            },
          },
          right: true,
        },
      ],
    },
    {
      id: 'actions',
      compact: true,
      name: '',
      width: '22px',
      actions: homeNftActions,
    },
  ],
};
