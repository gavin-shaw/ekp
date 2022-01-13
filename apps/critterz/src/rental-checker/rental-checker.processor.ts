import {
  AbstractProcessor,
  BaseContext,
  EthersService,
  EventService,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import {
  NULL_ADDRESS,
  RENTAL_CHECKER_DOCUMENT,
  RENTAL_CHECKER_MILESTONES,
  RENTAL_CHECK_QUEUE,
  scritterzAbi,
  SCRITTERZ_CONTRACT_ADDRESS,
} from '../util';
import { RentalCheckerDocument } from './rental-checker.document';

@Processor(RENTAL_CHECK_QUEUE)
export class RentalCheckerProcessor extends AbstractProcessor<Context> {
  constructor(
    private eventService: EventService,
    private ethersService: EthersService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
  ) {
    super();
  }

  pipe(source: Observable<BaseContext>): Observable<BaseContext> {
    return source.pipe(
      this.emitMilestones(),
      this.mapRentalCheckerDocuments(),
      this.emitDocuments(),
      this.removeMilestones(),
    );
  }

  private removeMilestones() {
    return Rx.tap((context: Context) => {
      const removeMilestonesQuery = {
        id: RENTAL_CHECKER_MILESTONES,
      };

      this.eventService.removeLayers(context.clientId, removeMilestonesQuery);
    });
  }

  private emitMilestones() {
    return Rx.tap((context: Context) => {
      const documents = [
        {
          id: '1-documents',
          status: 'progressing',
          label: 'Fetching token data',
        },
      ];

      const layers = [
        {
          id: RENTAL_CHECKER_MILESTONES,
          collectionName: RENTAL_CHECKER_MILESTONES,
          set: documents,
        },
      ];

      this.eventService.addLayers(context.clientId, layers);
    });
  }

  private mapRentalCheckerDocuments() {
    return Rx.mergeMap(async (context: Context) => {
      const form = context.forms?.critterzRentalCheck;

      const tokenId = form?.tokenId;

      if (!form || !tokenId || isNaN(tokenId)) {
        return { ...context, documents: [] };
      }

      let lockExpiration = undefined;
      let gasCost: number = undefined;

      await this.ethersService.wrapProviderCall('eth', async (provider) => {
        const gasPriceBn = await provider.getGasPrice();

        gasCost = Number(ethers.utils.formatEther(gasPriceBn.mul(204764)));

        const contract = new ethers.Contract(
          SCRITTERZ_CONTRACT_ADDRESS,
          scritterzAbi,
          provider,
        );

        let tokenUri: string = await contract.tokenURI(Number(tokenId));

        tokenUri = tokenUri.replace('data:application/json;base64,', '');

        const tokenDetails = JSON.parse(atob(tokenUri));

        const lockExpirationAttribute = tokenDetails.attributes.find(
          (it) => it.trait_type === 'Lock Expiration',
        );

        if (!!lockExpirationAttribute) {
          lockExpiration = lockExpirationAttribute.value;
        }
      });

      const openseaAsset = await this.openseaService.assetOf(
        SCRITTERZ_CONTRACT_ADDRESS,
        tokenId,
      );

      const sellOrders =
        openseaAsset.orders?.filter((it: any) => it.side === 1) ?? [];

      const notForSale = sellOrders.length === 0;

      let sellerAddress = 'Unknown';
      let sellerAddressMasked = 'Unknown';
      let ethCost = undefined;
      let estimatedCostTotal = undefined;

      if (!notForSale) {
        const sellOrder = sellOrders[0];

        ethCost = Number(ethers.utils.formatEther(sellOrder.base_price));

        estimatedCostTotal = ethCost + gasCost;

        sellerAddress = sellOrder.maker.address;
        sellerAddressMasked = sellerAddress
          .substring(sellerAddress.length - 6)
          .toUpperCase();
      }

      const tokenIdTransfers = await this.moralisService.nftTransfersOfTokenId(
        'eth',
        SCRITTERZ_CONTRACT_ADDRESS,
        tokenId,
      );

      const lastStakingTransfer = _.chain(tokenIdTransfers)
        .filter((it) => it.from_address === NULL_ADDRESS)
        .first()
        .value();

      const sellerIsOwner =
        lastStakingTransfer?.to_address.toLowerCase() === sellerAddress;

      // const sellerAddress = lastStakingTransfer.to_address;

      const document: RentalCheckerDocument = {
        estimatedCostTotal,
        ethCost,
        gasCost,
        id: '0',
        notForSale,
        lockExpiration,
        sellerAddress,
        sellerAddressMasked,
        sellerIsOwner,
        tokenId,
      };

      return <Context>{
        ...context,
        documents: [document],
      };
    });
  }

  private emitDocuments() {
    return Rx.tap((context: Context) => {
      if (context.documents.length === 0) {
        const removeQuery = {
          id: RENTAL_CHECKER_DOCUMENT,
        };

        this.eventService.removeLayers(context.clientId, removeQuery);
      } else {
        const addLayers = [
          {
            id: RENTAL_CHECKER_DOCUMENT,
            collectionName: RENTAL_CHECKER_DOCUMENT,
            set: context.documents,
          },
        ];
        this.eventService.addLayers(context.clientId, addLayers);
      }
    });
  }
}

interface Context extends BaseContext {
  readonly documents?: RentalCheckerDocument[];
}
