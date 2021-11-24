import { JsonSchema, UISchemaElement } from "@jsonforms/core";

export interface ServerStateDto {
    entities?: any,
    entitySchema?: JsonSchema,
    uiSchema?: UISchemaElement
}