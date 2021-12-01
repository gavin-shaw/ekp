import { JsonSchema7 } from '@jsonforms/core';

export const FarmsDtoSchema: JsonSchema7 = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      audit: {
        type: 'object',
      },
      name: {
        type: 'string',
      },
      link: {
        type: 'string',
      },
      age: {
        type: 'integer',
      },
      balance: {
        type: 'number',
      },
      contractAddress: {
        type: 'string',
      },
      subTitle: {
        type: 'string',
      },
      currency: {
        type: 'string',
      },
    },
  },
};
