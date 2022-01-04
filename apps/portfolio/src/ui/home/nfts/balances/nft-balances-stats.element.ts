export default function element() {
  return [
    {
      view: 'stats',
      title: 'Summary',
      mappings: [
        {
          name: 'Total Value',
          context: {
            fiatSymbol: '$.nft_balances..tokenValue.fiatSymbol',
            sum: {
              formatter: 'sum',
              items: {
                formatter: 'jsonpath',
                array: true,
                value: '$.nft_balances..tokenValue',
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
