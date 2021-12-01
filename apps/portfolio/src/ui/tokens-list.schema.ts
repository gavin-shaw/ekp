export const TokensListSchema = {
  type: 'Control',
  scope: '#/properties/tokens',
  options: {
    columns: {
      symbol: {
        width: '100px',
        center: false,
      },
      name: {
        center: false,
        filter: true,
      },
      balance: {
        filter: true,
        format: 'token',
      },
      fiatValue: {
        format: 'currency',
        filter: true,
      },
    },
  },
};
