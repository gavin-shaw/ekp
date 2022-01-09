import {
  Col,
  Container,
  Datatable,
  DatatableColumn,
  formatCurrency,
  formatAge,
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
  NFT_BALANCES,
  NFT_BALANCE_MILESTONES,
} from '../../collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        children: [Col({ children: [WalletSelector()] })],
      }),
      Row({
        children: [
          MilestoneWrapper({
            milestones: `$.${NFT_BALANCE_MILESTONES}`,
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
        className: 'col-md-6',
        children: [
          SummaryStats({
            rows: [
              {
                label: 'Total Value',
                value: formatCurrency(sum(`$.${NFT_BALANCES}..balanceFiat`), `$.${NFT_BALANCES}..fiatSymbol`),
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
            data: `$.${NFT_BALANCES}.*`,
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
      id: 'collection',
      name: 'token',
      sortable: true,
      value: '$.nftCollectionName',
      cell: Tile({
        left: Image({ src: '$.nftCollectionLogo', size: 28 }),
        title: '$.nftCollectionName',
        subTitle: {
          method: 'template',
          params: [
            '{{ price }} {{ symbol }} - {{ balance }} nfts',
            {
              balance: '$.balanceNfts',
              price: {
                method: 'formatToken',
                params: [
                  '$.nftPrice'
                ]
              },
              symbol: '$.saleTokenSymbol',
            }
          ]
        },
      }),
    },
    {
      id: 'value',
      right: true,
      sortable: true,
      value: '$.balanceFiat',
      cell: Tile({
        align: 'right',
        subTitle: formatAge('$.updated'),
        title: Tile({
          right: Image({
            src: '$.chainLogo',
            size: 12,
            tooltip: '$.chainName',
          }),
          title: formatCurrency('$.balanceFiat', '$.fiatSymbol'),
        }),
      }),
    },
  ];
}
