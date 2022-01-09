import { DocumentDto } from '@app/sdk';

export interface MilestoneDocumentDto extends DocumentDto {
  readonly label: string;
  readonly status: 'pending' | 'progressing' | 'complete';
}
