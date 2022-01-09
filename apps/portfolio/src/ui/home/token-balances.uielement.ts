import {
  Col,
  Container,
  Datatable,
  DatatableColumn,
  formatCurrency,
  Image,
  MilestoneWrapper,
  Row,
  sum,
  SummaryStats,
  Tile,
  UiElement,
  WalletSelector,
} from '@app/sdk/ui';
import {
  TOKEN_BALANCES,
  TOKEN_BALANCE_MILESTONES,
} from '../../collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        children: [WalletSelector()],
      }),
      Row({
        children: [
          MilestoneWrapper({
            milestones: `$.${TOKEN_BALANCE_MILESTONES}`,
            child: Container({
              children: [summaryRow(), tableRow()],
            }),
          }),
        ],
      }),
    ],
  });
}

function summaryRow(): UiElement {
  return Row({
    children: [
      Col({
        md: 4,
        children: [
          SummaryStats({
            rows: [
              {
                label: 'Total Value',
                value: formatCurrency(sum(`$.${TOKEN_BALANCES}..balanceFiat`)),
              },
            ],
          }),
        ],
      }),
    ],
  });
}

function tableRow(): UiElement {
  return Row({
    children: [
      Col({
        children: [
          Datatable({
            columns: tableColumns(),
            data: `$.${TOKEN_BALANCES}.*`,
            defaultSortAsc: false,
            defaultSortFieldId: 'value',
            filterable: false,
            pagination: false,
          }),
        ],
      }),
    ],
  });
}

function tableColumns(): DatatableColumn[] {
  return [
    {
      id: 'token',
      filterable: true,
      name: 'token',
      sortable: true,
      value: 'tokenSymbol',
      cell: Tile({
        left: Image({ src: '$.tokenLogo', size: 28 }),
        subTitle: formatCurrency('$.tokenPrice'),
        title: '$.tokenSymbol',
      }),
    },
    {
      id: 'value',
      filterable: true,
      right: true,
      sortable: true,
      value: '$.balanceFiat',
      cell: Tile({
        align: 'right',
        left: Image({ src: '$.tokenLogo', size: 28 }),
        subTitle: formatCurrency('$.tokenPrice'),
        title: Tile({
          right: Image({
            src: '$.chainLogo',
            size: 12,
            tooltip: '$.chainName',
          }),
          title: formatCurrency('$.balanceFiat'),
        }),
      }),
    },
  ];
}
