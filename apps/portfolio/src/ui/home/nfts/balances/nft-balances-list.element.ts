import nftBalanceActions from './nft-balance.actions';

export default function element() {
  return [
    {
      view: 'datatable',
      items: '$.nft_balances.*',
      options: {
        pagination: false,
        defaultSortFieldId: 'value',
        defaultSortAsc: false,
        filterable: false,
        onRowClicked: {
          method: 'ek_openLink',
          params: ['$.links.explorer'],
        },
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
                  symbol: '$.tokenValue.tokenSymbol',
                  price: {
                    value: '$.tokenValue.tokenAmount',
                    formatter: 'token',
                  },
                },
              },
            },
          ],
        },
        {
          id: 'value',
          value: '$.tokenValue.fiatAmount',
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
                value: '{{ age }}',
                formatter: 'template',
                scope: {
                  age: {
                    value: '$.updated',
                    formatter: 'age',
                  },
                },
              },
              right: true,
            },
          ],
        },
      ],
    },
  ];
}
