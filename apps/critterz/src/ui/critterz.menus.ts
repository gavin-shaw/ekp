import { formatCurrency } from '@app/sdk/ui';
import { PRICES_DOCUMENT } from '../util/collectionNames';

export default function menus() {
  return [
    {
      header: 'Critterz',
    },
    // {
    //   component: PriceLink({
    //     price: formatCurrency(
    //       `$.${PRICES_DOCUMENT}[0].blockPrice`,
    //       `$.${PRICES_DOCUMENT}[0].fiatSymbol`,
    //     ),
    //     href: `https://www.dextools.io/app/ether/pair-explorer/0xe93527d1f8c586353b13826c501fa5a69bce2b0e`,
    //     label: '$BLOCK',
    //   }),
    // },
    {
      title: 'Rental Checker',
      navLink: 'critterz/rental-checker',
      icon: 'cil-money',
    },
    // {
    //   title: 'My sCritterz',
    //   navLink: 'critterz/my-scritterz',
    //   icon: 'cil-money',
    // },
  ];
}
