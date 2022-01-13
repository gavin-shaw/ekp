import {
  AbstractProcessor,
  BaseContext,
  CoingeckoService,
  EthersService,
  MilestoneConfig,
  milestoneConfig,
  moralis,
  MoralisService,
  OpenseaService,
} from '@app/sdk';
import { Processor } from '@nestjs/bull';
import { ethers } from 'ethers';
import _ from 'lodash';
import * as Rx from 'rxjs';
import { Observable } from 'rxjs';
import {
  parseTokenUri,
  RENTED_CRITTERZ_MILESTONES,
  RENTED_CRITTERZ_QUEUE,
  RENTED_CRITTER_DOCUMENT,
  scritterzAbi,
  TokenDetails,
} from '../util';
import { NULL_ADDRESS, SCRITTERZ_CONTRACT_ADDRESS } from '../util/constants';
import { RentedCritterDocument } from './rented-critter.document';

@Processor(RENTED_CRITTERZ_QUEUE)
export class RentedCritterzProcessor extends AbstractProcessor<Context> {
  constructor(
    private coingeckoService: CoingeckoService,
    private moralisService: MoralisService,
    private openseaService: OpenseaService,
    private ethersService: EthersService,
  ) {
    super();
  }

  pipe(source: Observable<BaseContext>): Observable<BaseContext> {
    return source.pipe(
      this.emitMilestones(),
      this.addNftOwners(),
      this.emitMilestones(),
      this.mapDocuments(),
      this.emitDocuments(),
      this.removeMilestones(),
    );
  }

  private mapDocuments() {
    return Rx.mergeMap(async (context: Context) => {
      const scritterNfts = context.nftOwners.filter(
        (nft) =>
          nft.token_address.toLowerCase() ===
          SCRITTERZ_CONTRACT_ADDRESS.toLowerCase(),
      );

      const documents: RentedCritterDocument[] = await _.chain(scritterNfts)
        .map(async (nft) => {
          let tokenDetails: TokenDetails;

          await this.ethersService.wrapProviderCall('eth', async (provider) => {
            const contract = new ethers.Contract(
              SCRITTERZ_CONTRACT_ADDRESS,
              scritterzAbi,
              provider,
            );

            const tokenUri: string = await contract.tokenURI(
              Number(nft.token_id),
            );

            tokenDetails = parseTokenUri(tokenUri);
          });

          const tokenIdTransfers =
            await this.moralisService.nftTransfersOfTokenId(
              'eth',
              SCRITTERZ_CONTRACT_ADDRESS,
              nft.token_id,
            );

          const lastStakingTransfer = _.chain(tokenIdTransfers)
            .filter((it) => it.from_address === NULL_ADDRESS)
            .first()
            .value();

          const document: RentedCritterDocument = {
            id: nft.token_id,
            tokenId: nft.token_id,
            renterAddress: nft.owner_of,
            ownerAddress: lastStakingTransfer.to_address,
            expiryDate: Number(
              tokenDetails.attributes['Lock Expiration']?.value,
            ),
          };

          return document;
        })
        .thru((promises) => Promise.all(promises))
        .value();

      return { ...context, documents };
    });
  }

  private addNftOwners() {
    return Rx.mergeMap(async (context: Context) => {
      const nftOwners = await _.chain(context.watchedAddresses)
        .map((address) => this.moralisService.nftsOf('eth', address))
        .thru((promises) =>
          Promise.all(promises).then((nfts) => _.flatten(nfts)),
        )
        .value();

      return <Context>{
        ...context,
        nftOwners: nftOwners,
      };
    });
  }

  protected getMilestoneConfig(): MilestoneConfig<Context> {
    return milestoneConfig<Context>(
      RENTED_CRITTERZ_MILESTONES,
      (context) => !context.documents?.length,
      {
        items: (context) => context.nftOwners,
        progressing: () => 'Fetching your eth nfts',
        complete: (nftOwners) => `Fetched ${nftOwners.length} eth nfts`,
      },
      {
        items: (context) => context.documents,
        progressing: () => 'Fetching critterz details',
        complete: (nftOwners) =>
          `Fetched details for ${nftOwners.length} critterz`,
      },
    );
  }

  private emitDocuments() {
    return Rx.tap((context: Context) => {
      if (context.documents.length === 0) {
        const removeQuery = {
          id: RENTED_CRITTER_DOCUMENT,
        };

        this.eventService.removeLayers(context.clientId, removeQuery);
      } else {
        const addLayers = [
          {
            id: RENTED_CRITTER_DOCUMENT,
            collectionName: RENTED_CRITTER_DOCUMENT,
            set: context.documents,
          },
        ];
        this.eventService.addLayers(context.clientId, addLayers);
      }
    });
  }
}

interface Context extends BaseContext {
  readonly nftOwners?: moralis.NftOwner[];
  readonly documents?: RentedCritterDocument[];
}
