export interface TrackedRecordDto {
  readonly created: number;
  readonly updated: number;
  readonly deleted?: number;
  readonly [key: string]: any;
}
