export const pnlTable = {
  view: 'datatable',
  title: 'P & L',
  items: '$.token_pnl_items',
  options: {
    defaultSortFieldId: 'timestamp',
    defaultSortAsc: false,
    filterable: false,
  },
  columns: [
    {
      id: 'timestamp',
      value: '$.timestamp',
      label: {
        value: '$.timestamp',
        formatter: 'timestamp',
      },
      width: '160px',
      sortable: true,
    },
    {
      id: 'chain',
      value: '$.chainName',
      grow: 0,
    },
    {
      id: 'description',
      value: '$.description',
    },
    {
      id: 'value',
      value: '$.valueFiat',
      grow: 0,
      label: {
        value: '$.valueFiat',
        formatter: 'currency',
        symbol: '$.fiatSymbol',
      },
    },
    {
      id: 'gas',
      value: '$.gasFiat',
      grow: 0,
      label: {
        value: '$.gasFiat',
        formatter: 'currency',
        symbol: '$.fiatSymbol',
      },
    },
    {
      id: 'actions',
      compact: true,
      name: '',
      width: '22px',
      actions: [
        {
          icon: 'cil-external-link',
          name: 'Transfer Details',
          rpc: {
            method: 'ek_openLink',
            params: ['$.links.transaction'],
          },
        },
      ],
    },
  ],
};
