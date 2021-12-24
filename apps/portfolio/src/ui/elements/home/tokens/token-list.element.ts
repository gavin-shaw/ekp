import { homeTokenActions } from './token-actions';

export const tokenList = {
  view: 'datatable',
  title: 'Portfolio',
  items: '$.tokens',
  options: {
    pagination: false,
    defaultSortFieldId: 'value',
    defaultSortAsc: false,
    filterable: false,
  },
  columns: [
    {
      id: 'asset',
      value: '$.symbol',
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
          title: '$.symbol',
          subtitle: {
            value: '$.priceFiat',
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
            value: '$.balance',
            formatter: 'token',
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
      actions: homeTokenActions,
    },
  ],
};
