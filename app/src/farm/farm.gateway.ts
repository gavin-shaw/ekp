import { formatEther, formatUnits } from '@ethersproject/units';
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
import { FarmDto } from './dto/farm.dto';
import { Farm } from './entity/farm.entity';
@WebSocketGateway()
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

    const farmDtos: FarmDto[] = [];

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

      farmDtos.push(farmDto);
    }

    const currencyAddresses = _.uniq(
      farms.map((farm) => farm.currencyAddress).filter((symbol) => !!symbol),
    );

    const currencies = await this.currencyService.updateCurrencies(
      currencyAddresses,
      clientState.currency.id,
    );

    client.emit('ui-schema', JSON.stringify(this.createUiSchema()));

    client.emit(
      'entities',
      JSON.stringify({
        farms: farmDtos,
      }),
    );

    client.emit('json-rpc', this.getFarmBalanceRequests(farms), (payload) => {
      const results = JSON.parse(payload);
      for (const result of results) {
        const farmDto = farmDtos.find(
          (farm) => farm.contractAddress === result.id,
        );
        const farm = farms.find((farm) => farm.contractAddress === result.id);

        if (!farm || !farmDto) {
          continue;
        }

        try {
          if (result.method === 'eth_call') {
            if (!!farm.currencyDecimals) {
              farmDto.balance = Number(
                formatUnits(result.result, farm.currencyDecimals),
              );
              const currency = currencies.find(
                (it) => it.coinAddress === farm.currencyAddress?.toLowerCase(),
              );
              if (!!currency) {
                farmDto.balanceFiat = `${
                  clientState.currency.symbol
                } ${Math.floor(farmDto.balance * currency.rate)}`;
              } else {
                this.logger.warn(
                  `Could not find a currency rate for farm ${farm.contractAddress}`,
                );
              }
              this.logger.debug(
                `Updated balance for farm ${farm.contractAddress} to ${farmDto.balance}`,
              );
            } else {
              this.logger.warn(
                `Could not set contract balance on farm ${farm.contractAddress}, undefined currencyDecimals`,
              );
            }
          } else if (result.method === 'eth_getBalance') {
            farmDto.balance = Number(formatEther(result.result));
            const currency = currencies.find(
              (it) => it.coinAddress === CurrencyService.WBNB_ADDRESS,
            );
            if (!!currency) {
              farmDto.balanceFiat = `${
                clientState.currency.symbol
              } ${Math.floor(farmDto.balance * currency.rate)}`;
            } else {
              this.logger.warn(
                `Could not find a currency rate for farm ${farm.contractAddress}`,
              );
            }

            this.logger.debug(
              `Updated balance for farm ${farm.contractAddress} to ${farmDto.balance}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `An error occurred while parsing contract balance ${result.result} for farm ${farm.contractAddress}`,
            error.stack,
          );
        }
      }

      client.emit('entities', JSON.stringify({ farms: farmDtos }));
    });

    return payload;
  }

  getFarmBalanceRequests(farms: Farm[]) {
    const requests = [];

    const iface = new ethers.utils.Interface(bep20Abi);

    for (const farm of farms) {
      if (!!farm.currencyAddress && !!farm.currencyDecimals) {
        requests.push({
          id: farm.contractAddress,
          method: 'eth_call',
          params: [
            {
              to: farm.currencyAddress,
              data: iface.encodeFunctionData('balanceOf', [
                farm.contractAddress,
              ]),
            },
            'latest',
          ],
        });
      } else {
        requests.push({
          id: farm.contractAddress,
          method: 'eth_getBalance',
          params: [farm.contractAddress, 'latest'],
        });
      }
    }

    return JSON.stringify(requests);
  }

  createDataSchema() {
    return {
      type: 'object',
      properties: {
        farms: {
          type: 'array',
        },
      },
    };
  }

  createUiSchema() {
    return {
      type: 'Control',
      scope: '#/properties/farms',
      options: {
        columns: {
          name: {},
          age: { format: 'duration' },
          balance: { displayProperty: 'balanceFiat' },
        },
      },
    };
  }
}
