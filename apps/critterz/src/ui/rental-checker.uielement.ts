import {
  Card,
  Col,
  Container,
  formatDatetime,
  formatTemplate,
  formatTimeToNow,
  Icon,
  Input,
  LabelWrapper,
  Link,
  Row,
  Span,
  UiElement,
} from '@app/sdk/ui';
import { RENTAL_CHECKER_DOCUMENT } from '../util/collectionNames';

export default function element(): UiElement {
  return Container({
    children: [
      Row({
        children: [
          Input({
            label: 'sCritterz ID',
            value: '$.shared.critterz.lookupID',
          }),
        ],
      }),
      // Row({
      //   children: [
      //     Col({
      //       children: [
      //         Span({
      //           className: 'font-medium-5 mb-2',
      //           content: formatTemplate('sCritterz #{{ id }}', {
      //             id: `$.${RENTAL_CHECKER_DOCUMENT}[0].tokenId`,
      //           }),
      //         }),
      //       ],
      //     }),
      //   ],
      // }),
      Card({
        children: [
          Row({
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
          }),
          Row({
            children: [
              Container({
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
              }),
              Container({
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
              }),
            ],
          }),
          Row({
            className: 'mt-2',
            children: [
              Col({
                children: [
                  LabelWrapper({
                    label: 'Lock Expiration',
                    child: Span({
                      className: 'font-medium-4',
                      content: formatTimeToNow(
                        `$.${RENTAL_CHECKER_DOCUMENT}[0].lockExpiration`,
                      ),
                    }),
                    validationText: formatDatetime(
                      `$.${RENTAL_CHECKER_DOCUMENT}[0].lockExpiration`,
                    ),
                  }),
                ],
              }),
              Col({
                children: [
                  LabelWrapper({
                    label: 'Estimated Cost',
                    child: Span({
                      className: 'font-medium-4',
                      content: formatTemplate('{{ eth }} ETH', {
                        eth: `$.${RENTAL_CHECKER_DOCUMENT}[0].estimatedCostTotal`,
                      }),
                    }),
                    validationText: formatTemplate(
                      '{{ eth }} + {{ gas }} gas',
                      {
                        eth: `$.${RENTAL_CHECKER_DOCUMENT}[0].ethCost`,
                        gas: `$.${RENTAL_CHECKER_DOCUMENT}[0].gasCost`,
                      },
                    ),
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
