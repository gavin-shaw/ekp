import { JsonSchema, JsonSchema7, UISchemaElement } from '@jsonforms/core';

export interface ServerStateDto {
  meta: MetaDataDto;
  entities: any;
  entitySchema: JsonSchema7;
  uiSchema: UISchemaElement;
}

export interface MetaDataDto {
  pluginName: string;
}
