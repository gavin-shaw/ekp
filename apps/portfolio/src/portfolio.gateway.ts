import { ClientStateEvent, ServerStateDto } from '@app/sdk';
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { validate } from 'bycontract';
import { PortfolioTokenService } from './token';
import { TokenDto } from './dto/token.dto';
import { PortfolioUiService, HomeSchema } from './ui';

@Injectable()
export class PortfolioGateway {
  constructor(
    private logger: Logger,
    private eventEmitter: EventEmitter2,
    private portfolioTokenService: PortfolioTokenService,
    private portfolioUiService: PortfolioUiService,
  ) {}

  @OnEvent('client-state')
  async handleClientState(event: ClientStateEvent) {
    const { clientId, state } = event;

    validate([clientId, state], ['string', 'object']);

    this.logger.log(`Handling client state event`, {
      clientId,
    });

    if (!state.walletAddress) {
      this.emitWalletRequiredState(clientId);
      return;
    }

    this.emitInProgressState(clientId);

    const tokensWithBalances =
      await this.portfolioTokenService.getTokensWithBalances(
        state.walletAddress,
      );

    const fiatId = state.currency?.id ?? 'usd';

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
      state,
    );

    this.emitServerState(tokenDtos, clientId);
  }

  emitServerState(tokenDtos: TokenDto[], clientId: string) {
    const serverState: ServerStateDto = {
      walletRequired: false,
      entities: {
        tokens: tokenDtos,
      },
      uiSchema: HomeSchema({ loading: false }),
      meta: { pluginName: 'Portfolio' },
    };

    this.eventEmitter.emit('server-state', { clientId, state: serverState });
  }

  emitInProgressState(clientId: string) {
    const serverState: ServerStateDto = {
      walletRequired: false,
      partial: true,
      uiSchema: HomeSchema({ loading: true }),
      meta: { pluginName: 'Portfolio' },
    };

    this.eventEmitter.emit('server-state', { clientId, state: serverState });
  }

  emitWalletRequiredState(clientId: string) {
    validate([clientId], ['string']);

    const serverState: ServerStateDto = {
      walletRequired: true,
      meta: { pluginName: 'Portfolio' },
    };

    this.eventEmitter.emit('server-state', { clientId, state: serverState });
  }
}
