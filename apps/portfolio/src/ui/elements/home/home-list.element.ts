import { homeTokenActions } from './home-token-actions';

export const homeListElement = {
  view: 'datatable',
  title: 'Portfolio',
  items: '$.tokens',
  className: 'd-block d-sm-none',
  options: {
    pagination: false,
    defaultSortFieldId: 'fiatValue',
    defaultSortAsc: false,
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
          subtitle: '$.priceFormatted',
        },
      ],
    },
    {
      id: 'value',
      value: '$.fiatValue',
      filterable: true,
      sortable: true,
      right: true,
      cell: [
        {
          view: 'tile',
          title: [
            {
              view: 'tile',
              title: '$.fiatValueFormatted',
              right: [
                {
                  view: 'image',
                  src: '$.chainLogo',
                  size: 12,
                  tooltip: 'Binance Smart Chain',
                },
              ],
            },
          ],
          subtitle: '$.balanceFormatted',
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
