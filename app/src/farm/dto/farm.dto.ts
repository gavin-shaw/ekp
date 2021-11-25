import { JsonSchema, JsonSchema7 } from '@jsonforms/core';

export interface FarmDto {
  name: string;
  link: string;
  details: string;
  age: number;
  balance: number;
  balanceFiat: string;
  contractAddress: string;
}

export const farmsEntitySchema: JsonSchema7 = {
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
