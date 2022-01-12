import { runCluster } from '@app/sdk';
import { PrimaryModule } from './primary.module';
import { WorkerModule } from './worker.module';

runCluster(PrimaryModule, WorkerModule);
