export default function element() {
  return [
    {
      view: 'stats',
      items: "$.stats[?(@.id == 'nft_balance')]",
      mappings: [
        {
          name: 'Total Value',
          value: {
            value: '$.totalValue',
            formatter: 'currency',
            symbol: '$.fiatSymbol',
          },
        },
      ],
    },
  ];
}
