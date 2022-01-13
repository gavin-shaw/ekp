import { DocumentDto } from '@app/sdk';

export interface RentedCritterDocument extends DocumentDto {
  readonly tokenId: string;
  readonly expiryDate: number;
  readonly renterAddress: string;
  readonly ownerAddress: string;
}
