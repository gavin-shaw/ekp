import { AddLayersEvent, ADD_LAYERS } from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import moment from 'moment';
import { metadata } from '../metadata';
import { NftContractDocument } from './dto';

@Injectable()
export class NftEmitterService {
  constructor(private eventEmitter: EventEmitter2) {}
  async emitContractDocuments(clientId: any, contracts: NftContractDocument[]) {
    validate([clientId, contracts], ['string', 'Array.<object>']);

    const now = moment().unix();

    const event: AddLayersEvent = {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: 'nft-contracts-layer',
          collectionName: 'nft-contracts',
          set: contracts,
          timestamp: now,
        },
      ],
    };

    this.eventEmitter.emit(ADD_LAYERS, event);
  }

  async patchPrice(clientId: any, contract: NftContractDocument) {
    validate([clientId, contract], ['string', 'object']);

    const contractId = contract.id;

    const now = moment().unix();

    const event: AddLayersEvent = {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: `nfts-price-${contract.contractAddress}`,
          tags: ['nfts-price'],
          collectionName: 'nfts',
          patch: [
            {
              path: `$.[?(@.id=='${contractId}')].price`,
              value: contract.price,
            },
            {
              path: `$.[?(@.id=='${contractId}')].priceFormatted`,
              value: contract.priceFormatted,
            },
            {
              path: `$.[?(@.id=='${contractId}')].value`,
              value: contract.value,
            },
            {
              path: `$.[?(@.id=='${contractId}')].valueFormatted`,
              value: contract.valueFormatted,
            },
            {
              path: `$.[?(@.id=='${contractId}')].valueFiat`,
              value: contract.valueFiat,
            },
            {
              path: `$.[?(@.id=='${contractId}')].valueFiatFormatted`,
              value: contract.valueFiatFormatted,
            },
          ],
          timestamp: now,
        },
      ],
    };

    this.eventEmitter.emit(ADD_LAYERS, event);
  }

  async patchSyncState(clientId: any, contract: NftContractDocument) {
    validate([clientId, contract], ['string', 'object']);

    const contractId = contract.id;

    const now = moment().unix();

    const event: AddLayersEvent = {
      clientId,
      pluginId: metadata.pluginId,
      layers: [
        {
          id: `nfts-sync-state-${contract.contractAddress}`,
          tags: ['nfts-sync-state'],
          collectionName: 'nfts',
          patch: [
            {
              path: `$.[?(@.id=='${contractId}')].latestTransactionTimestamp`,
              value: contract.fetchTimestamp,
            },
          ],
          timestamp: now,
        },
      ],
    };

    this.eventEmitter.emit(ADD_LAYERS, event);
  }
}
