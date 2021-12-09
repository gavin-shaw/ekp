import { ClientStateEvent, CLIENT_STATE, ServerStateDto } from '@app/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import moment from 'moment';
import { TokenDto } from './dto/token.dto';
import { metadata } from './metadata';
import { PortfolioTokenService } from './token';
import { homeSchema, menuschema, PortfolioUiService } from './ui';
import { SERVER_STATE } from '../../../libs/sdk/src/gateway/event/server-state.event';

@Injectable()
export class PortfolioGateway {
  constructor(
    private logger: Logger,
    private eventEmitter: EventEmitter2,
    private portfolioTokenService: PortfolioTokenService,
    private portfolioUiService: PortfolioUiService,
  ) {}

  @OnEvent(CLIENT_STATE)
  async handleClientState(clientEvent: ClientStateEvent) {
    validate([clientEvent.clientId, clientEvent.state], ['string', 'object']);

    this.logger.log(`Handling client state event`, {
      client: clientEvent.clientId,
    });

    if (!clientEvent.state.connectedWallet) {
      this.emitWalletRequiredState(clientEvent);
      return;
    }

    this.emitLoadingState(clientEvent);

    const tokensWithBalances =
      await this.portfolioTokenService.getTokensWithBalances(
        clientEvent.state.connectedWallet,
      );

    // TODO: a better way to decide default currency
    const fiatId = clientEvent.state.currency?.id ?? 'usd';

    const tokensWithPrices =
      await this.portfolioTokenService.addPricingToTokens(
        tokensWithBalances,
        fiatId,
      );

    const tokensWithLogos = await this.portfolioTokenService.addLogosToTokens(
      tokensWithPrices,
    );

    const tokenDtos = await this.portfolioUiService.formatTokens(
      tokensWithLogos,
      clientEvent.state,
    );

    this.emitTokens(clientEvent, tokenDtos);
  }

  emitTokens(clientEvent: ClientStateEvent, tokens: TokenDto[]) {
    // TODO: make this DRY
    const now = moment().unix();

    const newServerState: ServerStateDto = {
      menuschema,
      metadata,
      overwrite: ['tokens'],
      shared: {
        tokens,
        uiSchema: [
          {
            created: now,
            match: '/plugins/porfolio',
            shema: homeSchema({ loading: false }),
            updated: now,
          },
        ],
      },
      timestamp: now,
    };

    this.eventEmitter.emit(SERVER_STATE, {
      clientId: clientEvent.clientId,
      state: newServerState,
    });
  }

  emitLoadingState(clientEvent: ClientStateEvent) {
    // TODO: make this DRY
    const now = moment().unix();

    const newServerState: ServerStateDto = {
      menuschema,
      metadata,
      shared: {
        uiSchema: [
          {
            created: now,
            match: '/plugins/porfolio',
            shema: homeSchema({ loading: true }),
            updated: now,
          },
        ],
      },
      timestamp: now,
    };
    this.eventEmitter.emit(SERVER_STATE, {
      clientId: clientEvent.clientId,
      state: newServerState,
    });
  }

  emitWalletRequiredState(clientEvent: ClientStateEvent) {
    // TODO: make this DRY
    const now = moment().unix();

    const newServerState: ServerStateDto = {
      menuschema,
      metadata,
      shared: {
        uiSchema: [
          {
            created: now,
            match: '/plugins/porfolio',
            shema: homeSchema({ walletRequired: true }),
            updated: now,
          },
        ],
      },
      timestamp: now,
    };

    this.eventEmitter.emit(SERVER_STATE, {
      clientId: clientEvent.clientId,
      state: newServerState,
    });
  }
}
