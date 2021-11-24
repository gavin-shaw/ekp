import { JsonSchema } from '@jsonforms/core';

export interface FarmDto {
  name: string;
  link: string;
  details: string;
  age: number;
  balance: number;
  balanceFiat: string;
  contractAddress: string;
}

export const farmsEntitySchema: JsonSchema = {
  type: "array",
  items: {
    type: "object",
    required: ['name', 'age', 'balance', 'contractAddress', 'link', 'details'],
    properties: {
      name: {
        type: 'string'
      },
      link: {
        type: 'string',
        format: 'uri'
      },
      age: {
        type: 'integer',
        format: 'duration'
      },
      balance: {
        type: 'number',
      },
      $balance: {
        type: 'string'
      },
      contractAddress: {
        type: 'string'
      },
      subTitle: {
        type: 'string'
      },
      currency: {
        type: 'string'
      }
    }
  }
}