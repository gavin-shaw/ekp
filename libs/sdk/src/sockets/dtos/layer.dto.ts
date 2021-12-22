import { DocumentDto } from './document.dto';

export interface LayerDto {
  readonly collectionName: string;
  readonly id: string;
  readonly set?: DocumentDto[];
  readonly patch?: { id: string; [key: string]: any }[];
  readonly tags?: string[];
  readonly timestamp?: number;
}
