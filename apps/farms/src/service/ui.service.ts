import { ClientStateDto, CurrencyService } from '@app/sdk';
import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import moment from 'moment';
import { FarmDto } from '../dto/farm.dto';
import { Farm } from '../entity/farm.entity';

@Injectable()
export class UiService {
  constructor(private currencyService: CurrencyService) {}

  async formatFarms(
    farms: Farm[],
    clientState: ClientStateDto,
  ): Promise<FarmDto[]> {
    const farmDtos: FarmDto[] = [];

    const fiatSymbol = clientState.currency ?? 'usd';

    const currencyAddresses = _.uniq(
      farms.map((farm) => farm.currencyAddress).filter((symbol) => !!symbol),
    );

    const currencies = await this.currencyService.fetchRates(
      currencyAddresses,
      fiatSymbol,
    );

    for (const farm of farms) {
      let name: string;
      if (farm.name === undefined || farm.name === '' || farm.name === null) {
        name = _.startCase(farm.contractName);
      } else {
        name = farm.name;
      }

      let age: number;
      if (!!farm.seedTimestamp) {
        age = moment().unix() - farm.seedTimestamp;
      }

      if (!age) {
        continue;
      }

      const link = !!farm.websiteUrl
        ? `[${name}](${farm.websiteUrl})`
        : `[${name}](https://bscscan.com/address/${farm.contractAddress})`;

      const subTitle = `${farm.currencyName ?? 'Unknown'} - ${(
        farm.dailyRoi * 100
      ).toFixed(0)} %`;

      const contractAddress = farm.contractAddress;

      let icon: string, color: string, reason: string;

      switch (farm.audit) {
        case 'approved':
          icon = 'Check';
          color = 'success';
          reason = 'Contract looks safe.';
          break;
        case 'danger':
          icon = 'XOctagon';
          color = 'danger';
          reason = 'Unsafe contract, use at your own risk.';
          break;
        default:
          icon = 'AlertTriangle';
          color = 'warning';
          reason = 'Not audited yet.';
          break;
      }

      if (!!farm.auditReason) {
        reason = farm.auditReason;
      }

      const audit = {
        icon,
        color,
        tooltip: reason,
      };

      const balance = await this.currencyService.convertCurrency(
        farm.balance,
        farm.currencyAddress,
        fiatSymbol,
        currencies,
      );

      if (balance === undefined) {
        continue;
      }

      farmDtos.push({
        audit,
        name,
        age,
        balance,
        contractAddress,
        link,
        subTitle,
      });
    }

    return farmDtos;
  }
}
