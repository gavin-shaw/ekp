import {
  Col,
  Container,
  Datatable,
  DatatableColumn,
  formatCurrency,
  formatPercent,
  formatTemplate,
  Image,
  MilestoneWrapper,
  navigate,
  PageHeaderTile,
  Row,
  sum,
  SummaryStats,
  Tile,
  UiElement,
  WalletSelector,
} from '@app/sdk/ui';
import {
  TOKEN_PNL_MILESTONES,
  TOKEN_PNL_SUMMARIES,
} from '../../util/collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        children: [Col({ children: [WalletSelector()] })],
      }),
      Row({
        children: [
          Col({
            children: [
              PageHeaderTile({
                title: 'Token P & L',
                icon: 'cil-money',
              }),
            ],
          }),
        ],
      }),
      Row({
        children: [
          MilestoneWrapper({
            milestones: `$.${TOKEN_PNL_MILESTONES}`,
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
                label: 'Cost Basis',
                value: formatCurrency(
                  sum(`$.${TOKEN_PNL_SUMMARIES}..costBasisFiat`),
                  `$.${TOKEN_PNL_SUMMARIES}..fiatSymbol`,
                ),
              },
              {
                label: 'Realized Value',
                value: formatCurrency(
                  sum(`$.${TOKEN_PNL_SUMMARIES}..realizedValueFiat`),
                  `$.${TOKEN_PNL_SUMMARIES}..fiatSymbol`,
                ),
              },
              {
                label: 'Realized Gain',
                value: formatCurrency(
                  sum(`$.${TOKEN_PNL_SUMMARIES}..realizedGainFiat`),
                  `$.${TOKEN_PNL_SUMMARIES}..fiatSymbol`,
                ),
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
            data: `$.${TOKEN_PNL_SUMMARIES}.*`,
            defaultSortAsc: false,
            defaultSortFieldId: 'realizedGain',
            filterable: false,
            pagination: false,
            onRowClicked: navigate('$.links.details'),
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
      sortable: true,
      value: '$.tokenSymbol',
      cell: Tile({
        left: Image({ src: '$.tokenLogo', size: 28 }),
        subTitle: formatTemplate('Cost {{ cost }}', {
          cost: formatCurrency('$.costBasisFiat', '$.fiatSymbol'),
        }),
        title: '$.tokenSymbol',
      }),
    },
    {
      id: 'realizedGain',
      filterable: true,
      right: true,
      sortable: true,
      value: '$.realizedGainFiat',
      cell: Tile({
        align: 'right',
        subTitle: formatPercent('$.realizedGainPc'),
        title: Tile({
          right: Image({
            src: '$.chainLogo',
            size: 12,
            tooltip: '$.chainName',
          }),
          title: formatCurrency('$.realizedGainFiat', '$.fiatSymbol'),
        }),
      }),
    },
  ];
}
