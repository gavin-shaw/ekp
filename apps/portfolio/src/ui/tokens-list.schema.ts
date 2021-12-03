export const TokensListSchema = [
  {
    view: 'datatable',
    title: 'Portfolio',
    items: '$.tokens',
    options: {
      defaultSortFieldId: 'fiatValue',
      defaultSortAsc: false,
    },
    columns: [
      {
        id: 'type',
        title: 'Type',
        value: 'Token',
        width: '100px',
        center: true,
        filterable: true,
      },
      {
        id: 'name',
        title: 'Project',
        value: '$.name',
        filterable: true,
        sortable: true,
      },
      {
        id: 'description',
        title: 'Description',
        value: '$.balance',
        label: '$.description',
        sortable: true,
        filterable: true,
      },
      {
        id: 'fiatValue',
        title: 'Value',
        value: '$.fiatValue',
        label: '$.fiatValueFormatted',
        center: true,
        sortable: true,
        filterable: true,
      },
      {
        actions: [
          {
            icon: 'cil-burn',
            tooltip: 'Burn spam token',
            color: 'yellow',
            when: '$.allowBurnToken',
          },
        ],
      },
    ],
  },
];
