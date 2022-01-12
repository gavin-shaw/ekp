import {
  Col,
  Container,
  Datatable,
  DatatableColumn,
  formatAge,
  formatCurrency,
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
        subTitle: formatTemplate('{{ age }}', {
          age: formatAge('$.blockTimestamp'),
          costBasis: formatCurrency('$.costBasisFiat', '$.fiatSymbol'),
        }),
      }),
    },
    {
      id: 'amount',
      right: true,
      grow: 0,
      value: '$.amountFiat',
      cell: Tile({
        align: 'right',
        title: formatCurrency('$.amountFiat', '$.fiatSymbol'),
      }),
    },
    {
      id: 'realized',
      right: true,
      grow: 0,
      value: '$.totalRealizedGainFiat',
      cell: Tile({
        align: 'right',
        title: formatCurrency('$.totalRealizedGainFiat', '$.fiatSymbol'),
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
