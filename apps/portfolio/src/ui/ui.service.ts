import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { homeElement } from './elements/home/home.element';

@Injectable()
export class UiService {
  getMenus() {
    return [];
  }

  getPages() {
    const now = moment().unix();

    return [
      {
        id: 'portfolio',
        created: now,
        updated: now,
        elements: homeElement,
      },
    ];
  }
}
