import {
  AbstractProcessor,
  BaseContext,
  EthersService,
  EventService,
  MoralisService,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import { OpenseaService } from '../../../../libs/sdk/src/opensea/opensea.service';
import scritterzAbi from '../abi/scritterz.abi.json';
import {
  RENTAL_CHECKER_DOCUMENT,
  RENTAL_CHECKER_MILESTONES,
} from '../util/collectionNames';
import { RENTAL_CHECK_QUEUE } from '../util/queue.names';
import { RentalCheckerDocument } from './rental-checker.document';

const SCRITTERZ_CONTRACT_ADDRESS = '0x47f75e8dd28df8d6e7c39ccda47026b0dca99043';
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

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

      const notForSale = !(openseaAsset?.sellOrders?.length > 0);

      let sellerAddress = 'Unknown';
      let sellerAddressMasked = 'Unknown';
      let ethCost = undefined;
      let estimatedCostTotal = undefined;

      if (!notForSale) {
        const sellOrder = openseaAsset.sellOrders[0];

        ethCost = Number(
          ethers.utils.formatEther(sellOrder.currentPrice.toString()),
        );

        estimatedCostTotal = ethCost + gasCost;

        sellerAddress = sellOrder.maker;
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
