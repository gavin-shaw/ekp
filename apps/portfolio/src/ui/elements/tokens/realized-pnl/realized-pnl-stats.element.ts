export default function element() {
  return [
    {
      view: 'stats',
      items: "$.stats[?(@.id == 'token_pnl')]",
      mappings: [
        {
          name: 'Cost Basis',
          value: {
            value: '$.costBasis',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
        {
          name: 'Realized Value',
          value: {
            value: '$.realizedValue',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
        {
          name: 'Realized Gain',
          value: {
            value: '$.realizedGain',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
      ],
    },
  ];
}
