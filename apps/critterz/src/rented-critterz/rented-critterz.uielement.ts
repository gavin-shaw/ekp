import {
  Col,
  Container,
  Datatable,
  DatatableColumn,
  formatDatetime,
  formatMaskAddress,
  formatTemplate,
  formatTimeToNow,
  Link,
  MilestoneWrapper,
  PageHeaderTile,
  Row,
  UiElement,
  WalletSelector,
} from '@app/sdk/ui';
import { RENTED_CRITTERZ_MILESTONES, RENTED_CRITTER_DOCUMENT } from '../util';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        children: [Col({ children: [WalletSelector({ hideChains: true })] })],
      }),
      Row({
        children: [
          Col({
            children: [
              PageHeaderTile({
                title: 'Rented Critterz',
                icon: 'cil-paw',
              }),
            ],
          }),
        ],
      }),
      MilestoneWrapper({
        milestones: `$.${RENTED_CRITTERZ_MILESTONES}`,
        child: tableRow(),
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
            data: `$.${RENTED_CRITTER_DOCUMENT}.*`,
            defaultSortAsc: true,
            defaultSortFieldId: 'expiresIn',
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
      id: 'tokenId',
      sortable: true,
      value: '$.tokenId',
      cell: Link({
        content: '$.tokenId',
        href: formatTemplate(
          'https://etherscan.io/token/0x47f75e8dd28df8d6e7c39ccda47026b0dca99043?a={{ tokenId }}',
          {
            tokenId: '$.tokenId',
          },
        ),
        external: true,
      }),
    },
    {
      id: 'expiresIn',
      sortable: true,
      value: '$.expiryDate',
      label: formatTimeToNow('$.expiryDate'),
    },
    {
      id: 'expiryDate',
      sortable: true,
      value: '$.expiryDate',
      label: formatDatetime('$.expiryDate'),
    },
    {
      id: 'rentedBy',
      sortable: true,
      value: '$.renterAddress',
      cell: Link({
        content: formatMaskAddress('$.renterAddress'),
        href: formatTemplate('https://etherscan.io/address/{{ address }}', {
          address: '$.renterAddress',
        }),
        external: true,
      }),
    },
    {
      id: 'ownedBy',
      sortable: true,
      value: '$.ownerAddress',
      cell: Link({
        content: formatMaskAddress('$.ownerAddress'),
        href: formatTemplate('https://etherscan.io/address/{{ address }}', {
          address: '$.ownerAddress',
        }),
        external: true,
      }),
    },
  ];
}
