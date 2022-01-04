import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import retry from 'async-retry';
import Bottleneck from 'bottleneck';
import { validate } from 'bycontract';
import { Cache } from 'cache-manager';
import Moralis from 'moralis/node';
import { EkConfigService } from '../config/ek-config.service';
import { LimiterService } from '../limiter.service';
import { ChainId, chains, logger } from '../util';
import {
  ChainList,
  NativeBalance,
  NftOwner,
  NftContractMetadata,
  NftTransfer,
  TokenBalance,
  TokenTransfer,
  Transaction,
} from './types';
import { TokenMetadata } from '../util/TokenMetadata';

@Injectable()
export class MoralisService {
  constructor(
    @Inject(CACHE_MANAGER) private cache: Cache,
    limiterService: LimiterService,
    private configService: EkConfigService,
  ) {
    this.limiter = limiterService.createLimiter('moralis-limiter', 10);
  }

  async onModuleInit() {
    await Moralis.start({
      serverUrl: this.configService.moralisServerUrl,
      appId: this.configService.moralisAppId,
    });
  }

  private limiter: Bottleneck;

  async tokenMetadataOf(
    chainId: ChainId,
    contractAddress: string,
  ): Promise<TokenMetadata> {
    validate([chainId, contractAddress], ['string', 'string']);

    const cacheKey = `moralis.tokenMetadataOf_['${chainId}']['${contractAddress}']`;
    const debugMessage = `Web3API > getTokenMetadata('${chainId}', '${contractAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const result = await Moralis.Web3API.token.getTokenMetadata({
              addresses: [contractAddress],
              chain: chainId,
            });

            if (!Array.isArray(result) || result.length === 0) {
              return undefined;
            }

            return <TokenMetadata>{
              ...result[0],
              decimals: Number(result[0].decimals),
              chainId,
            };
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 3600000,
      },
    );
  }

  async nativeBalanceOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<string> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nativeBalance['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNativeBalance('${chainId}', '${ownerAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const result: NativeBalance =
              await Moralis.Web3API.account.getNativeBalance({
                address: ownerAddress,
                chain: chainId,
              });

            return result?.balance;
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 5000,
      },
    );
  }

  async tokensOf(
    chainId: ChainList,
    ownerAddress: string,
    includeNativeBalance = true,
  ): Promise<TokenBalance[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.tokensByOwner['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getTokenBalances('${chainId}', '${ownerAddress}')`;

    const tokens: TokenBalance[] = await this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await Moralis.Web3API.account.getTokenBalances({
              address: ownerAddress,
              chain: chainId,
            });

            return response?.map(
              (token) =>
                <TokenBalance>{
                  ...token,
                  chain_id: chainId,
                },
            );
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 5000,
      },
    );

    if (includeNativeBalance) {
      const nativeBalance = await this.nativeBalanceOf(chainId, ownerAddress);

      const chainMetadata = chains[chainId];

      if (!chainMetadata) {
        throw new Error(`Sorry ${chainId} not ready yet, file an issue!`);
      }

      tokens.push(<TokenBalance>{
        balance: nativeBalance,
        chain_id: chainId,
        decimals: chainMetadata.token.decimals.toString(),
        logo: chainMetadata.logo,
        name: chainMetadata.token.name,
        symbol: chainMetadata.token.symbol,
        thumbnail: chainMetadata.logo,
        token_address: chainMetadata.token.address,
      });
    }

    return tokens;
  }

  async nftsOf(chainId: ChainList, ownerAddress: string): Promise<NftOwner[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftsByOwner['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTs('${chainId}', '${ownerAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await Moralis.Web3API.account.getNFTs({
              address: ownerAddress,
              chain: chainId,
            });

            return response?.result
              ?.filter((it) => !['OPENSTORE'].includes(it.symbol))
              .map((nft) => ({
                ...nft,
                chain_id: chainId,
              }));
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      {
        ttl: 5000,
      },
    );
  }

  async nftMetadataOf(
    chainId: ChainList,
    contractAddress: string,
  ): Promise<NftContractMetadata> {
    validate([chainId, contractAddress], ['string', 'string']);

    const cacheKey = `moralis.metadata['${chainId}']['${contractAddress}']`;

    const debugMessage = `Web3API > getNFTMetadata('${chainId}', '${contractAddress}')`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const nftMetadata = await Moralis.Web3API.token.getNFTMetadata({
              address: contractAddress,
              chain: chainId,
            });

            return <NftContractMetadata>{
              ...nftMetadata,
              chain_id: chainId,
            };
          }),
          {
            onRetry: (error) =>
              logger.warn(`Retry due to ${error.message}: ${debugMessage}`),
          },
        ),
      { ttl: 3600000 },
    );
  }

  async tokenTransfersOf(
    chainId: ChainList,
    ownerAddress: string,
    offset = 0,
  ): Promise<TokenTransfer[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const cacheKey = `moralis.transfersOf['${chainId}']['${ownerAddress}'][${offset}]`;
    const debugMessage = `Web3API > getTokenTransfers('${chainId}', '${ownerAddress}', ${offset})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await Moralis.Web3API.account.getTokenTransfers({
              address: ownerAddress,
              chain: chainId,
              offset,
            });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 3600000,
      },
    );
  }

  async allTransactionsOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<Transaction[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const transactions = [];

    const cacheKey = `moralis.allTransactionsOf['${chainId}']['${ownerAddress}']`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        while (true) {
          const nextTransactions = await this.transactionsOf(
            chainId,
            ownerAddress,
            transactions.length,
          );

          if (nextTransactions.length === 0) {
            break;
          }

          transactions.push(
            ...nextTransactions.map((it) => ({ ...it, chain_id: chainId })),
          );
        }

        return transactions;
      },
      {
        ttl: 3600000,
      },
    );
  }

  async allTokenTransfersOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<TokenTransfer[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const transfers = [];

    const cacheKey = `moralis.allTokenTransfersOf['${chainId}']['${ownerAddress}']`;

    return this.cache.wrap(
      cacheKey,
      async () => {
        while (true) {
          const nextTransfers = await this.tokenTransfersOf(
            chainId,
            ownerAddress,
            transfers.length,
          );

          if (nextTransfers.length === 0) {
            break;
          }

          transfers.push(...nextTransfers);
        }

        return transfers;
      },
      {
        ttl: 3600000,
      },
    );
  }

  async transactionsOf(
    chainId: ChainList,
    ownerAddress: string,
    offset = 0,
  ): Promise<Transaction[]> {
    validate([chainId, ownerAddress, offset], ['string', 'string', 'number']);

    const cacheKey = `moralis.transactionsOf['${chainId}']['${ownerAddress}'][${offset}]`;
    const debugMessage = `Web3API > getTransactions('${chainId}', '${ownerAddress}', ${offset})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await Moralis.Web3API.account.getTransactions({
              address: ownerAddress,
              chain: chainId,
              offset,
            });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 3600000,
      },
    );
  }

  async nftContractTransfersOf(
    chainId: ChainList,
    contractAddress: string,
    offset = 0,
  ): Promise<NftTransfer[]> {
    validate(
      [chainId, contractAddress, offset],
      ['string', 'string', 'number'],
    );

    const cacheKey = `moralis.nftContractTransfersOf['${chainId}']['${contractAddress}'][${offset}]`;
    const debugMessage = `Web3API > getContractNFTTransfers('${chainId}', '${contractAddress}', ${offset})`;

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response =
              await Moralis.Web3API.token.getContractNFTTransfers({
                address: contractAddress,
                chain: chainId,
                offset,
              });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result.map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 900000,
      },
    );
  }

  async nftTransfersOf(
    chainId: ChainList,
    ownerAddress: string,
  ): Promise<NftTransfer[]> {
    validate([chainId, ownerAddress], ['string', 'string']);

    const cacheKey = `moralis.nftTransfersOf_a['${chainId}']['${ownerAddress}']`;
    const debugMessage = `Web3API > getNFTTransfers('${chainId}', '${ownerAddress}'`;

    // // TODO: once moralis has fixed ERC20 contracts appearing in the NFT list, can remove this
    const bannedContracts = ['0xe9e7cea3dedca5984780bafc599bd69add087d56'];

    return this.cache.wrap(
      cacheKey,
      () =>
        retry(
          this.limiter.wrap(async () => {
            logger.debug(debugMessage);

            const response = await Moralis.Web3API.account.getNFTTransfers({
              address: ownerAddress,
              chain: chainId,
            });

            if (!Array.isArray(response?.result)) {
              return [];
            }

            return response.result
              .filter((it) => !bannedContracts.includes(it.token_address))
              .map((it) => ({ ...it, chain_id: chainId }));
          }),
          {
            onRetry: (error: any) => {
              console.error(error);
              logger.warn(
                `Retry due to ${error.message ?? error.error}: ${debugMessage}`,
              );
            },
          },
        ),
      {
        ttl: 900000,
      },
    );
  }
}
