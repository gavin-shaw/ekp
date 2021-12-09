export interface MenuschemaDto {
  readonly children?: MenuschemaDto[];
  readonly external?: boolean;
  readonly icon?: string;
  readonly label: string;
  readonly link: string;
  readonly type: 'collapse|group|item';
}
