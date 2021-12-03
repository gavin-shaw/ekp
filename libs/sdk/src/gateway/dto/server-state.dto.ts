import { MetaDataDto } from './meta-data.dto';

export interface ServerStateDto {
  meta: MetaDataDto;
  entities?: any;
  partialEntities?: boolean;
  uiSchema?: any;
  walletRequired?: boolean;
}
