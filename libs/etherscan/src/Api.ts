import { Account } from './Account';
import { Config } from './Config';
import { Contract } from './Contract';
import { Query } from './Query';
import { Stats } from './Stats';
import { Token } from './Token';

export class Api {
  readonly account: Account;
  readonly contract: Contract;
  readonly query: Query;
  readonly stats: Stats;
  readonly token: Token;

  constructor(config: Config) {
    this.query = new Query({
      maxRequestsPerSecond: 5,
      ...config,
    });

    this.account = new Account(this.query);
    this.contract = new Contract(this.query);
    this.stats = new Stats(this.query);
    this.token = new Token(this.query);
  }
}
