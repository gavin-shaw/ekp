import { DocumentDto } from '@app/sdk';

export interface RentalCheckerDocument extends DocumentDto {
  readonly tokenId: string;
  readonly sellerAddress: string;
  readonly sellerAddressMasked: string;
  readonly sellerIsOwner: boolean;
  readonly lockExpiration: number;
  readonly estimatedCostTotal: number;
  readonly ethCost: number;
  readonly gasCost: number;
}
