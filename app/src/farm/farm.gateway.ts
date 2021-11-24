import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { Server, Socket } from 'socket.io';
import { IsNull, Not, Repository } from 'typeorm';
import bep20Abi from '../abi/bep20.json';
import { CurrencyService } from './currency.service';
import { FarmDto, farmsEntitySchema } from './dto/farm.dto';
import { Farm } from './entity/farm.entity';
import { ServerStateDto } from '../gateway/dto/server-state.dto';

@WebSocketGateway()
export class FarmGateway {
  constructor(
    @InjectRepository(Farm) private farmRepository: Repository<Farm>,
    @Inject(CurrencyService) private currencyService: CurrencyService,
  ) { }

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

    const serverState: ServerStateDto = {};

    serverState.entities = {
      farms: []
    }

    for (const farm of farms) {
      const farmDto: FarmDto = {};

      if (farm.name === undefined || farm.name === '' || farm.name === null) {
        farmDto.name = _.startCase(farm.contractName);
      } else {
        farmDto.name = farm.name;
      }

      if (!!farm.seedTimestamp) {
        farmDto.age = moment().unix() - farm.seedTimestamp;
      }

      farmDto.contractAddress = farm.contractAddress;

      if (!farmDto.age) {
        continue;
      }

      serverState.entities.farms.push(farmDto);
    }

    // const currencyAddresses = _.uniq(
    //   farms.map((farm) => farm.currencyAddress).filter((symbol) => !!symbol),
    // );

    // const currencies = await this.currencyService.updateCurrencies(
    //   currencyAddresses,
    //   clientState.currency?.id ?? 'USD',
    // );

    client.emit(
      'server-state',
      JSON.stringify(serverState),
    );

    return payload;
  }


  createEntitiesSchema() {
    return {
      type: 'object',
      properties: {
        farms: farmsEntitySchema,
      },
    };
  }

  createUiSchema() {
    return {
      type: 'Control',
      scope: '#/properties/farms',
      options: {
        columns: {
          name: {
            cell: {
              type: 'VerticalLayout',
              elements: [
                {
                  type: 'Control',
                  scope: '#/properties/link',
                },
                {
                  type: 'Control',
                  scope: '#/properties/subTitle'
                }
              ]
            }
          },
          age: {},
          balance: {},
        },
      },
    };
  }
}
