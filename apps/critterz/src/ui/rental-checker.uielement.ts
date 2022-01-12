import {
  Card,
  Col,
  Container,
  Form,
  formatDatetime,
  formatTemplate,
  formatTimeToNow,
  formatToken,
  Fragment,
  Icon,
  LabelWrapper,
  Link,
  MilestoneWrapper,
  Row,
  Span,
  UiElement,
} from '@app/sdk/ui';
import {
  RENTAL_CHECKER_DOCUMENT,
  RENTAL_CHECKER_MILESTONES,
} from '../util/collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      tokenIdForm(),
      MilestoneWrapper({
        milestones: `$.${RENTAL_CHECKER_MILESTONES}`,
        child: Card({
          className: 'mt-1',
          when: `$.${RENTAL_CHECKER_DOCUMENT}[0]`,
          children: [
            Fragment({
              when: { not: `$.${RENTAL_CHECKER_DOCUMENT}[0].notForSale` },
              children: [sellerInfo(), sellerIsOwner(), sellerIsNotOwner()],
            }),
            Fragment({
              when: `$.${RENTAL_CHECKER_DOCUMENT}[0].notForSale`,
              children: [notForSale()],
            }),
            lockExpirationAndCost(),
          ],
        }),
      }),
    ],
  });
}

function tokenIdForm(): UiElement {
  return Row({
    children: [
      Col({
        children: [
          Form({
            name: 'critterzRentalCheck',
            uischema: {
              type: 'Control',
              scope: '#/properties/tokenId',
              label: `Enter sCritterz Token ID`,
            },
            schema: {
              type: 'object',
              properties: {
                tokenId: {
                  type: 'string',
                },
              },
              default: {
                tokenId: '',
              },
            },
            submitLabel: 'Check',
          }),
        ],
      }),
    ],
  });
}

function sellerInfo(): UiElement {
  return Row({
    children: [
      Col({
        children: [
          LabelWrapper({
            label: 'Seller',
            child: Link({
              className: 'font-medium-5 mb-2',
              content: '$.critterzRentalChecker[0].sellerAddressMasked',
              href: formatTemplate(
                'https://etherscan.io/address/{{ seller }}',
                {
                  seller: `$.${RENTAL_CHECKER_DOCUMENT}[0].sellerAddress`,
                },
              ),
            }),
          }),
        ],
      }),
    ],
  });
}

function sellerIsOwner() {
  return Container({
    className: 'px-0 py-2',
    when: `$.${RENTAL_CHECKER_DOCUMENT}[0].sellerIsOwner`,
    children: [
      Row({
        children: [
          Col({
            className: 'col-auto font-medium-1 mb-1',
            children: [Span({ content: 'Seller is Owner' })],
          }),
          Col({
            className: 'col-auto',
            children: [
              Icon({
                size: 'xl',
                name: 'cil-check-circle',
              }),
            ],
          }),
        ],
      }),
      Row({
        children: [
          Col({
            children: [
              Span({
                content:
                  'This means that as soon as you buy this item, the lock expiration will reset to 7 days in the future. Thumbs up! You can ignore the lock expiration below.',
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function lockExpirationAndCost(): UiElement {
  return Row({
    className: 'px-0 py-2',
    children: [
      Col({
        children: [
          LabelWrapper({
            label: 'Lock Expiration',
            child: Fragment({
              children: [
                Span({
                  className: 'font-medium-4',
                  when: `$.${RENTAL_CHECKER_DOCUMENT}[0].lockExpiration`,
                  content: formatTimeToNow(
                    `$.${RENTAL_CHECKER_DOCUMENT}[0].lockExpiration`,
                  ),
                }),
                Span({
                  className: 'font-medium-4',
                  when: {
                    not: `$.${RENTAL_CHECKER_DOCUMENT}[0].lockExpiration`,
                  },
                  content: '?',
                }),
              ],
            }),
            feedbackText: formatDatetime(
              `$.${RENTAL_CHECKER_DOCUMENT}[0].lockExpiration`,
            ),
          }),
        ],
      }),
      Col({
        children: [
          LabelWrapper({
            label: 'Estimated Total Cost',
            when: { not: `$.${RENTAL_CHECKER_DOCUMENT}[0].notForSale` },
            child: Span({
              className: 'font-medium-4',
              content: formatTemplate('{{ eth }} ETH', {
                eth: formatToken(
                  `$.${RENTAL_CHECKER_DOCUMENT}[0].estimatedCostTotal`,
                ),
              }),
            }),
            feedbackText: formatTemplate('{{ eth }} + {{ gas }} gas', {
              eth: formatToken(`$.${RENTAL_CHECKER_DOCUMENT}[0].ethCost`),
              gas: formatToken(`$.${RENTAL_CHECKER_DOCUMENT}[0].gasCost`),
            }),
          }),
          LabelWrapper({
            label: 'Estimated Total Cost',
            when: `$.${RENTAL_CHECKER_DOCUMENT}[0].notForSale`,
            child: Span({
              className: 'font-medium-4',
              content: '?',
            }),
          }),
        ],
      }),
    ],
  });
}

function sellerIsNotOwner(): UiElement {
  return Container({
    className: 'px-0 py-2',
    when: {
      not: `$.${RENTAL_CHECKER_DOCUMENT}[0].sellerIsOwner`,
    },
    children: [
      Row({
        children: [
          Col({
            className: 'col-auto font-medium-1 mb-1',
            children: [Span({ content: 'Seller is NOT Owner' })],
          }),
          Col({
            className: 'col-auto',
            children: [
              Icon({
                size: 'xl',
                name: 'cil-x-circle',
              }),
            ],
          }),
        ],
      }),
      Row({
        children: [
          Span({
            content:
              'Be careful, this means that at the end of the lock expiration below, the critter may be revoked and you will lose access to it',
          }),
        ],
      }),
    ],
  });
}

function notForSale(): UiElement {
  return Container({
    className: 'px-0 py-2',
    children: [
      Row({
        children: [
          Col({
            className: 'col-auto font-medium-1 mb-1',
            children: [Span({ content: 'Not for sale' })],
          }),
          Col({
            className: 'col-auto',
            children: [
              Icon({
                size: 'xl',
                name: 'cil-x-circle',
              }),
            ],
          }),
        ],
      }),
      Row({
        children: [
          Col({
            children: [
              Span({
                content:
                  "This item is not currently for sale, so we can't tell whether it is safe to buy just yet",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
