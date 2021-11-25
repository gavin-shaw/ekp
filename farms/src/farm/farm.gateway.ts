import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import _ from 'lodash';
import moment from 'moment';
import { Server, Socket } from 'socket.io';
import { IsNull, Not, Repository } from 'typeorm';
import { ServerStateDto } from '../../libs/sdk/src/gateway/dto/server-state.dto';
import { CurrencyService } from './currency.service';
import { farmsEntitySchema } from './dto/farm.dto';
import { Farm } from './entity/farm.entity';

@WebSocketGateway({ cors: true })
export class FarmGateway {
  constructor(
    @InjectRepository(Farm) private farmRepository: Repository<Farm>,
    @Inject(CurrencyService) private currencyService: CurrencyService,
  ) {}

  @WebSocketServer()
  server: Server;
  private logger: Logger = new Logger('AppGateway');

  @OnEvent('farm.updated')
  handleFarmUpdated(farms: Farm[]) {
    this.server.to('farms').emit(JSON.stringify(farms));
  }

  @SubscribeMessage('client-state')
  async handleMessage(client: Socket, payload: any) {
    const clientState = JSON.parse(payload);

    const farms = await this.farmRepository.find({
      where: {
        contractName: Not(IsNull()),
        // updated: MoreThan(clientState?.entities?.farms?.updated ?? 0),
      },
    });

    const farmDtos = [];

    const fiatSymbol = clientState.currency?.id ?? 'usd';

    // const currencyAddresses = _.uniq(
    //   farms.map((farm) => farm.currencyAddress).filter((symbol) => !!symbol),
    // );

    // const currencies = await this.currencyService.updateCurrencies(
    //   currencyAddresses,
    //   fiatSymbol,
    // );

    for (const farm of farms) {
      let name;
      if (farm.name === undefined || farm.name === '' || farm.name === null) {
        name = _.startCase(farm.contractName);
      } else {
        name = farm.name;
      }

      let age;
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

    const serverState: ServerStateDto = {
      entities: {
        farms: farmDtos,
      },
      entitySchema: {
        type: 'object',
        properties: {
          farms: farmsEntitySchema,
        },
      },
      uiSchema: this.createUiSchema(),
      meta: { pluginName: 'Farms' },
    };

    client.emit('server-state', JSON.stringify(serverState));

    return JSON.stringify(serverState);
  }

  createUiSchema() {
    return {
      type: 'Control',
      scope: '#/properties/farms',
      options: {
        columns: {
          audit: {
            name: '',
            width: '50px',
            sortable: false,
            cell: {
              type: 'Control',
              scope: '#/properties/audit',
              label: '',
              options: {
                renderIcon: true,
              },
            },
          },
          name: {
            center: false,
            filter: true,
            cell: {
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/link',
                  label: '',
                  options: {
                    renderMarkdownLink: true,
                  },
                },
                {
                  type: 'Control',
                  scope: '#/properties/subTitle',
                  label: '',
                  options: {
                    displayOnly: true,
                  },
                },
              ],
            },
          },
          age: {
            format: 'duration',
          },
          balance: {
            format: 'currency',
          },
        },
      },
    };
  }
}
