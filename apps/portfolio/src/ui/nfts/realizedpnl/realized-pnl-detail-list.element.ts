export default function element() {
  return [
    {
      view: 'datatable',
      items: '$.*',
      options: {
        defaultSortFieldId: 'transaction',
        defaultSortAsc: false,
        filterable: false,
        paginationPerPage: 25,
        responsive: true,
        onRowClicked: {
          method: 'ek_openLink',
          params: ['$.links.explorer'],
        },
      },
      columns: [
        {
          id: 'transaction',
          value: '$.blockTimestamp',
          cell: [
            {
              view: 'row',
              columns: [
                {
                  className: 'col-auto',
                  children: [
                    {
                      view: 'icon',
                      name: '$.icon',
                      size: 'lg',
                    },
                  ],
                },
                {
                  className: 'col-auto',
                  children: [
                    {
                      view: 'span',
                      containerClassName: 'ml-0',
                      value: '$.description',
                    },
                  ],
                },
              ],
            },
            {
              view: 'span',
              className: 'font-small-2',
              value: {
                value: '{{ age }} - Cost {{ costBasis }}',
                formatter: 'template',
                scope: {
                  age: {
                    formatter: 'age',
                    value: '$.blockTimestamp',
                  },
                  costBasis: {
                    value: '$.tokenValue.fiatAmount',
                    formatter: 'currency',
                    symbol: '$.tokenValue.fiatSymbol',
                  },
                },
              },
            },
          ],
          sortable: true,
        },
        {
          id: 'gain',
          value: '$.realizedGain',
          right: true,
          cell: [
            {
              view: 'span',
              className: 'text-right',
              value: {
                formatter: 'currency',
                value: '$.realizedGain',
                symbol: '$.tokenValue.fiatSymbol',
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
