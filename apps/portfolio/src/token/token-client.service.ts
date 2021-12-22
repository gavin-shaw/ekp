import {
  chainIds,
  chains,
  ClientStateChangedEvent,
  CLIENT_STATE_CHANGED,
  CoingeckoService,
  CoinPrice,
  EventsService,
  LayerDto,
  moralis,
  MoralisService,
} from '@app/sdk';
import { Injectable } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { TokenContractDocument } from './dtos';

@Injectable()
export class TokenClientService {
  constructor(
    private coingeckoService: CoingeckoService,
    private eventsService: EventsService,
    private moralisService: MoralisService,
  ) {}

  @EventPattern(CLIENT_STATE_CHANGED)
  async handleClientStateChangedEvent(
    clientStateChangedEvent: ClientStateChangedEvent,
  ) {
    const clientId = validate(clientStateChangedEvent.clientId, 'string');

    const selectedCurrency = validate(
      clientStateChangedEvent.state?.client.selectedCurrency,
      'object',
    );

    const watchedWallets = validate(
      clientStateChangedEvent.state?.client.watchedWallets,
      'Array.<object>',
    );

    const requestPromises = [];

    for (const chainId of chainIds) {
      for (const watchedWallet of watchedWallets) {
        const address = validate(watchedWallet.address, 'string');

        requestPromises.push(this.moralisService.tokensOf(chainId, address));
      }
    }

    const tokenBalances: moralis.TokenBalance[] = _.flatten(
      await Promise.all(requestPromises),
    );

    const coinIds = tokenBalances
      .map((it) =>
        this.coingeckoService.coinIdOf(it.chain_id, it.token_address),
      )
      .filter((it) => !!it);

    const coinPrices = await this.coingeckoService.latestPricesOf(
      coinIds,
      selectedCurrency,
    );

    const tokens = this.mapTokenContractDocuments(tokenBalances, coinPrices);

    for (const token of tokens) {
      this.fillAndEmitContract(clientId, token);
    }
  }

  private async fillAndEmitContract(
    clientId: string,
    token: TokenContractDocument,
  ) {
    const imageUrl = await this.coingeckoService.getImageUrl(token.coinId);

    const updatedToken = {
      ...token,
      logo:
        imageUrl ??
        'https://media.istockphoto.com/vectors/question-mark-in-a-shield-icon-vector-sign-and-symbol-isolated-on-vector-id1023572464?k=20&m=1023572464&s=170667a&w=0&h=EopKUPT7ix-yq92EZkAASv244wBsn_z-fbNpyxxTl6o=',
    };

    const layers = <LayerDto[]>[
      {
        id: `token-contract-${token.id}`,
        collectionName: 'token-contracts',
        set: [updatedToken],
      },
    ];

    this.eventsService.emitLayers(clientId, layers);
  }

  private mapTokenContractDocuments(
    tokenBalances: moralis.TokenBalance[],
    coinPrices: CoinPrice[],
  ): TokenContractDocument[] {
    const tokensById = _.groupBy(
      tokenBalances,
      (tokenBalance) =>
        `${tokenBalance.chain_id}_${tokenBalance.token_address}`,
    );

    const now = moment().unix();

    return Object.entries(tokensById).map(([id, tokens]) => {
      const balance = _.sumBy(tokens, (token) =>
        Number(ethers.utils.formatUnits(token.balance, token.decimals)),
      );

      const chainMetadata = chains[tokens[0].chain_id];

      const coinId = this.coingeckoService.coinIdOf(
        tokens[0].chain_id,
        tokens[0].token_address,
      );

      const coinPrice = coinPrices.find(
        (it) => it.coinId.toLowerCase() === coinId,
      );

      return {
        id,
        created: now,
        updated: now,
        allowSwap: !!coinPrice,
        allowBurnToken: !!coinPrice,
        balance,
        chain: {
          id: chainMetadata.id,
          logo: chainMetadata.logo,
          name: chainMetadata.name,
        },
        coinId,
        contractAddress: tokens[0].token_address,
        decimals: Number(tokens[0].decimals),
        links: {
          swap: `https://poocoin.app/swap?inputCurrency=${tokens[0].token_address}`,
          token: !!coinId
            ? `https://www.coingecko.com/en/coins/${coinId}`
            : `https://bscscan.com/token/${tokens[0].token_address}`,
        },
        logo: tokens[0].logo,
        name: tokens[0].name,
        priceFiat: coinPrice.price,
        symbol: tokens[0].symbol,
        valueFiat: {
          _eval: true,
          scope: {
            price: '$.priceFiat',
            balance: '$.balance',
          },
          expression: 'balance * price',
        },
      };
    });
  }
}
