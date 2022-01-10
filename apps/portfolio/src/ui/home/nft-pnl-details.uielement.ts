import {
  Col,
  Container,
  Datatable,
  DatatableColumn,
  formatAge,
  formatCurrency,
  formatPercent,
  formatTemplate,
  Icon,
  jsonArray,
  MilestoneWrapper,
  navigate,
  PageHeaderTile,
  Row,
  RpcOrPrimitive,
  sum,
  SummaryStats,
  Tile,
  UiElement,
} from '@app/sdk/ui';
import { NFT_PNL_EVENTS, NFT_PNL_MILESTONES } from '../../collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        context: currentCollectionContext(),
        children: [
          PageHeaderTile({
            image: '$..nftCollectionLogo',
            returnLocation: 'portfolio/nfts/pnl',
            subTitle: '$..chainName',
            title: '$..nftCollectionName',
          }),
        ],
      }),
      Row({
        children: [
          MilestoneWrapper({
            milestones: `$.${NFT_PNL_MILESTONES}`,
            child: Container({
              context: currentCollectionContext(),
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
                value: formatCurrency(sum(`$..costBasisFiat`), `$..fiatSymbol`),
              },
              {
                label: 'Realized Value',
                value: formatCurrency(
                  sum(`$..realizedValueFiat`),
                  `$..fiatSymbol`,
                ),
              },
              {
                label: 'Realized Gain',
                value: formatCurrency(
                  sum(`$..realizedGainFiat`),
                  `$..fiatSymbol`,
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
            data: `$.*`,
            defaultSortAsc: false,
            defaultSortFieldId: 'transaction',
            filterable: false,
            onRowClicked: navigate('$.links.explorer', true, true),
            paginationPerPage: 25,
          }),
        ],
      }),
    ],
  });
}

function tableColumns(): DatatableColumn[] {
  return [
    {
      id: 'transaction',
      sortable: true,
      value: '$.blockTimestamp',
      cell: Tile({
        title: Tile({
          left: Icon({ name: '$.icon', size: 'md' }),
          title: '$.description',
        }),
        subTitle: formatTemplate('{{ age }} - Cost {{ costBasis }}', {
          age: formatAge('$.blockTimestamp'),
          costBasis: formatCurrency('$.costBasisFiat', '$.fiatSymbol'),
        }),
      }),
    },
    {
      id: 'realizedGain',
      right: true,
      sortable: true,
      value: '$.realizedGainFiat',
      cell: Tile({
        align: 'right',
        subTitle: formatPercent('$.realizedGainPc'),
        title: formatCurrency('$.realizedGainFiat', '$.fiatSymbol'),
      }),
    },
  ];
}

export function currentCollectionContext(): RpcOrPrimitive {
  return jsonArray(
    formatTemplate(
      `$.${NFT_PNL_EVENTS}[?(@.chainId == "{{ chainId }}" && @.nftCollectionAddress == "{{ tokenAddress }}")]`,
      {
        chainId: '$.location.pathParams[1]',
        tokenAddress: '$.location.pathParams[2]',
      },
    ),
  );
}
