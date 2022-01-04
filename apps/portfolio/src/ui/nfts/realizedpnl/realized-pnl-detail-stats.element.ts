export default function element() {
  return [
    {
      view: 'stats',
      title: 'Summary',
      mappings: [
        {
          name: 'Cost Basis',
          context: {
            fiatSymbol: '$..fiatSymbol',
            sum: {
              formatter: 'sum',
              items: {
                formatter: 'jsonpath',
                array: true,
                value: '$..costBasis',
              },
              value: '$',
            },
          },
          value: {
            value: '$.sum',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
        {
          name: 'Realized Value',
          context: {
            fiatSymbol: '$..fiatSymbol',
            sum: {
              formatter: 'sum',
              items: {
                formatter: 'jsonpath',
                array: true,
                value: '$..realizedValue',
              },
              value: '$',
            },
          },
          value: {
            value: '$.sum',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
        {
          name: 'Realized Gain',
          context: {
            fiatSymbol: '$..fiatSymbol',
            sum: {
              formatter: 'sum',
              items: {
                formatter: 'jsonpath',
                array: true,
                value: '$..realizedGain',
              },
              value: '$',
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
