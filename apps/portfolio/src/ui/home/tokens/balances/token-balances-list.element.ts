import tokenBalanceActions from './token-balance.actions';

export default function element() {
  return [
    {
      view: 'datatable',
      items: '$.token_balances.*',
      options: {
        pagination: false,
        defaultSortFieldId: 'value',
        defaultSortAsc: false,
        filterable: false,
      },
      columns: [
        {
          id: 'token',
          value: '$.token.symbol',
          filterable: true,
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
                value: '$.tokenValue.tokenPrice',
                formatter: 'currency',
                symbol: '$.tokenValue.fiatSymbol',
              },
            },
          ],
        },
        {
          id: 'value',
          value: '$.tokenValue.fiatAmount',
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
                    value: '$.tokenValue.fiatAmount',
                    formatter: 'currency',
                    symbol: '$.tokenValue.fiatSymbol',
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
                value: '$.tokenValue.tokenAmount',
                formatter: 'token',
              },
              right: true, // TODO: remove the need for this duplicate "right" attribute
            },
          ],
        },
        {
          id: 'actions',
          compact: true,
          name: '',
          width: '22px',
          actions: tokenBalanceActions(),
        },
      ],
    },
  ];
}
