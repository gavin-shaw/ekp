import tokenBalanceActions from './token-balance.actions';

export default function element() {
  return [
    {
      view: 'datatable',
      title: 'Portfolio',
      items: '$.tokens',
      className: 'd-none d-sm-block',
      options: {
        pagination: false,
        defaultSortFieldId: 'fiatValue',
        defaultSortAsc: false,
        filterable: false,
      },
      columns: [
        {
          id: 'chain',
          value: '$.chain.name',
          filterOptions: ['Binance Smart Chain'], // TODO: support multiple chains
          center: true,
          width: '80px',
          cell: [
            {
              view: 'image',
              src: '$.chain.logo',
              tooltip: '$.chain.name',
              size: 22,
            },
          ],
        },
        {
          id: 'name',
          name: 'Token',
          value: '$.name',
          cell: [
            {
              view: 'row',
              children: [
                {
                  view: 'image',
                  src: '$.logo',
                  size: 22,
                },
                {
                  view: 'span',
                  value: '$.name',
                },
              ],
            },
          ],
          filterable: true,
          sortable: true,
        },
        {
          id: 'price',
          value: '$.price.value',
          label: '$.price.display',
          sortable: true,
          right: true,
          width: '120px',
        },
        {
          id: 'balance',
          value: '$.balance.value',
          label: '$.balance.display',
          hide: 'md',
          sortable: true,
          right: true,
          width: '200px',
        },
        {
          id: 'fiatValue',
          value: '$.balanceFiat.value',
          label: '$.balanceFiat.display',
          sortable: true,
          filterable: true,
          right: true,
          width: '120px',
        },
        {
          id: 'actions',
          compact: true,
          name: '',
          center: true,
          width: '32px',
          actions: tokenBalanceActions(),
        },
      ],
    },
  ];
}
