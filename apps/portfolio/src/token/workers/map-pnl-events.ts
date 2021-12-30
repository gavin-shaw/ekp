import {
  chains,
  CoinPrice,
  CurrencyDto,
  formatters,
  logger,
  moralis,
  TokenMetadata,
} from '@app/sdk';
import { validate } from 'bycontract';
import { ethers } from 'ethers';
import _ from 'lodash';
import moment from 'moment';
import { expose } from 'threads/worker';
import { TokenPnlEvent } from '../dtos/token-pnl-event.document';

function mapPnlEvents(
  transfers: moralis.TokenTransfer[],
  transactions: moralis.Transaction[],
  tokens: TokenMetadata[],
  selectedCurrency: CurrencyDto,
  watchedWallets: { address: string }[],
  coinPrices: CoinPrice[],
): TokenPnlEvent[] {
  validate(
    [
      transfers,
      transactions,
      tokens,
      selectedCurrency,
      watchedWallets,
      coinPrices,
    ],
    [
      'Array.<object>',
      'Array.<object>',
      'Array.<object>',
      'object',
      'Array.<object>',
      'Array.<object>',
    ],
  );

  const watchedAddresses = watchedWallets.map((it) => it.address.toLowerCase());

  const tokenCostBases: Record<string, { fiat: number; token: number }>[] = [];

  const transfersMap = _.chain(transfers)
    .groupBy((it) => it.transaction_hash)
    .mapValues((it) => it[0])
    .value();

  const tokensMap = _.chain(tokens)
    .groupBy((it) => `${it.chainId}-${it.address.toLowerCase()}`)
    .mapValues((it) => it[0])
    .value();

  return _.chain(transactions)
    .sortBy((it) => it.block_timestamp)
    .map((transaction) => {
      // TODO: ignore deposits and withdrawals for now, as they will always be to your same wallet
      if (
        transaction.input.startsWith('0xd0e30db0') ||
        transaction.input.startsWith('0x2e1a7d4d')
      ) {
        return undefined;
      }

      const transfer = transfersMap[transaction.hash];

      let fromAddress = transaction.from_address;
      let toAddress = transaction.to_address;

      if (!!transfer) {
        fromAddress = transfer.from_address.toLowerCase();
        toAddress = transfer.to_address.toLowerCase();
      }

      if (
        watchedAddresses.includes(toAddress) &&
        watchedAddresses.includes(fromAddress)
      ) {
        return undefined;
      }

      const chain = chains[transaction.chain_id];

      let token = chain.token;

      if (!!transfer) {
        token =
          tokensMap[
            `${transaction.chain_id}_${transfer.address.toLowerCase()}`
          ];
      }

      if (!token?.coinId) {
        return undefined;
      }

      const tokenPrice = coinPrices.find(
        (it) =>
          it.coinId === token.coinId &&
          moment.unix(it.timestamp).isSame(transaction.block_timestamp, 'day'),
      );

      if (!tokenPrice) {
        logger.warn(
          `Skipping token transfer, could not find tokenPrice: ${token.coinId}`,
        );
        return undefined;
      }

      const timestampMoment = moment(transaction.block_timestamp);

      const nativePrice = coinPrices.find(
        (it) =>
          it.coinId === chain.token.coinId &&
          timestampMoment.isSame(it.timestamp, 'day'), // TODO: optimize this, better to index rather than create a moment inside two loops
      );

      if (!nativePrice) {
        return undefined;
      }

      const gas = Number(
        ethers.utils.formatEther(
          ethers.BigNumber.from(transaction.gas_price).mul(
            Number(transaction.receipt_gas_used),
          ),
        ),
      );

      const gasFiat = nativePrice.price * gas;

      let value = !!transaction.value
        ? Number(ethers.utils.formatEther(transaction.value))
        : undefined;

      if (!!transfer) {
        value = !!transfer.value
          ? Number(ethers.utils.formatUnits(transfer.value, token.decimals))
          : undefined;
      }

      if (!value) {
        return undefined;
      }

      const valueFiat = tokenPrice.price * value;

      let description = 'Unknown';

      if (watchedAddresses.includes(fromAddress)) {
        description = `Withdraw ${formatters.tokenValue(value)} ${
          token?.symbol
        }`;
      } else if (watchedAddresses.includes(toAddress)) {
        description = `Deposit ${formatters.tokenValue(value)} ${
          token?.symbol
        }`;
      }

      let costBasis: { token: number; fiat: number };
      let realizedGain: number;
      let realizedGainPc: number;
      let realizedValue: number;
      let unrealizedCost: number;

      const tokenId = `${token.chainId}_${token.address}`;

      const previousCostBasis = tokenCostBases[tokenId] ?? {
        token: 0,
        fiat: 0,
      };

      if (watchedAddresses.includes(toAddress)) {
        costBasis = {
          token: value,
          fiat: valueFiat,
        };

        previousCostBasis.token += costBasis.token;
        previousCostBasis.fiat += costBasis.fiat;
        unrealizedCost = previousCostBasis.fiat;
        tokenCostBases[tokenId] = previousCostBasis;
      }

      if (watchedAddresses.includes(fromAddress)) {
        costBasis = {
          token: -1 * value,
          fiat: -1 * (value / previousCostBasis.token) * previousCostBasis.fiat,
        };

        previousCostBasis.token += value;
        previousCostBasis.fiat += costBasis.fiat;
        realizedValue = valueFiat;
        realizedGain = valueFiat + costBasis.fiat;
        realizedGainPc = (valueFiat + costBasis.fiat) / costBasis.fiat;
        unrealizedCost = previousCostBasis.fiat;

        tokenCostBases[tokenId] = previousCostBasis;
      }

      return <TokenPnlEvent>{
        id: `transaction.hash`,
        blockNumber: Number(transaction.block_number),
        chain: {
          id: chain.id,
          logo: chain.logo,
          name: chain.name,
        },
        costBasis,
        description,
        fiatSymbol: selectedCurrency.symbol,
        gas,
        gasFiat, // TODO: calculate gasFiat at the client
        links: {
          transaction: `${chain.explorer}tx/${transaction.hash}`,
        },
        nativePrice: nativePrice?.price,
        realizedGain, // TODO: implement realized field for token line
        realizedGainPc, // TODO: implement realized pc field for token line
        realizedValue, // TODO:
        timestamp: moment(transaction.block_timestamp).unix(),
        token: {
          address: token.address,
          coinId: token.coinId,
          decimals: Number(token.decimals),
          logo: token.logo,
          name: token.name,
          symbol: token.symbol,
        },
        tokenPrice: tokenPrice?.price,
        unrealizedCost,
        value,
        valueFiat, // TODO: calculate value fiat at the client
      };
    })
    .filter((it) => !!it)
    .value();
}

expose(mapPnlEvents);
