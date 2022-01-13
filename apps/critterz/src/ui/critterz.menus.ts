import { formatCurrency, PriceLink } from '@app/sdk/ui';
import { PRICES_DOCUMENT } from '../util';

export default function menus() {
  return [
    {
      id: 'critterz',
      header: 'Critterz',
    },
    {
      id: 'critterz-prices',
      component: PriceLink({
        price: formatCurrency(
          `$.${PRICES_DOCUMENT}[0].blockPrice`,
          `$.${PRICES_DOCUMENT}[0].fiatSymbol`,
        ),
        href: `https://www.dextools.io/app/ether/pair-explorer/0xe93527d1f8c586353b13826c501fa5a69bce2b0e`,
        label: 'BLOCK PRICE',
      }),
    },
    {
      id: 'critterz-rental-checker',
      title: 'Rental Checker',
      navLink: 'critterz/rental-checker',
      icon: 'cil-search',
    },
    {
      id: 'critterz-rented-critterz',
      title: 'Rented Critterz',
      navLink: 'critterz/rented-critterz',
      icon: 'cil-paw',
    },
  ];
}
