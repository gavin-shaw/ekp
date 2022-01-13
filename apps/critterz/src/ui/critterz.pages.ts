import rentalChecker from '../rental-checker/rental-checker.uielement';
import rentedCritterz from '../rented-critterz/rented-critterz.uielement';

export default function pages() {
  return [
    {
      id: 'critterz/rental-checker',
      element: rentalChecker(),
    },
    {
      id: 'critterz/rented-critterz',
      element: rentedCritterz(),
    },
  ];
}
