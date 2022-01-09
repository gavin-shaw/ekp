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
  Row,
  sum,
  SummaryStats,
  Tile,
  UiElement,
  WalletSelector,
} from '@app/sdk/ui';
import { NFT_PNL_MILESTONES, NFT_PNL_SUMMARIES } from '../../collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        children: [Col({ children: [WalletSelector()] })],
      }),
      Row({
        children: [
          MilestoneWrapper({
            milestones: `$.${NFT_PNL_MILESTONES}`,
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
                  sum(`$.${NFT_PNL_SUMMARIES}..costBasisFiat`),
                  `$.${NFT_PNL_SUMMARIES}..fiatSymbol`,
                ),
              },
              {
                label: 'Realized Value',
                value: formatCurrency(
                  sum(`$.${NFT_PNL_SUMMARIES}..realizedValueFiat`),
                  `$.${NFT_PNL_SUMMARIES}..fiatSymbol`,
                ),
              },
              {
                label: 'Realized Gain',
                value: formatCurrency(
                  sum(`$.${NFT_PNL_SUMMARIES}..realizedGainFiat`),
                  `$.${NFT_PNL_SUMMARIES}..fiatSymbol`,
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
            data: `$.${NFT_PNL_SUMMARIES}.*`,
            defaultSortAsc: false,
            defaultSortFieldId: 'realizedGain',
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
      name: 'collection',
      sortable: true,
      value: '$.nftCollectionName',
      cell: Tile({
        left: Image({ src: '$.nftCollectionLogo', size: 28 }),
        subTitle: formatTemplate('Cost {{ cost }}', {
          cost: formatCurrency('$.costBasisFiat', '$.fiatSymbol'),
        }),
        title: '$.nftCollectionName',
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
