import { JsonSchema7 } from '@jsonforms/core';

export const TokensDtoSchema: JsonSchema7 = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      balance: {
        type: 'number',
      },
      fiatValue: {
        type: 'number',
      },
      name: {
        type: 'string',
      },
      symbol: {
        type: 'string',
      },
      tokenAddress: {
        type: 'string',
      },
      walletAddress: {
        type: 'string',
      },
    },
  },
};
