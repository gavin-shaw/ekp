import { MetaDataDto } from './meta-data.dto';

export interface ServerStateDto {
  meta: MetaDataDto;
  entities?: any;
  partial?: boolean;
  uiSchema?: any;
  walletRequired?: boolean;
}
