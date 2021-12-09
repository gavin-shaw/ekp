import { MenuschemaDto, MetadataDto, TrackedRecordDto } from '.';

export interface ServerStateDto {
  readonly menuschema: MenuschemaDto[];
  readonly metadata: MetadataDto;
  readonly overwrite?: string[]; // TODO: find a more generic way to indicate a shared collection should be cleared
  readonly shared?: { [key: string]: TrackedRecordDto[] };
  readonly timestamp: number;
}
