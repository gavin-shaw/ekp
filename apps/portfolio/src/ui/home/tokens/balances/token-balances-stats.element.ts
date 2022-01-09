export default function element() {
  return [
    {
      view: 'stats',
      title: 'Summary',
      mappings: [
        {
          name: 'Total Value',
          context: {
            fiatSymbol: '$.token_balances..fiatSymbol',
            sum: {
              formatter: 'sum',
              items: {
                formatter: 'jsonpath',
                array: true,
                value: '$.token_balances..tokenValue',
              },
              value: '$.fiatAmount',
            },
          },
          value: {
            value: '$.sum',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
      ],
    },
  ];
}
