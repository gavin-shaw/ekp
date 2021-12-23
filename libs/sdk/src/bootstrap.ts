import { NestFactory } from '@nestjs/core';
import { DefaultLogger } from './utils';
import * as cluster from 'cluster';
import * as os from 'os';

export async function ekpbootstrap(module: any) {
  const bootstrap = async () => {
    const app = await NestFactory.create(module, {
      logger: new DefaultLogger(),
    });

    await app.listen(3001);
  };

  bootstrap();

  // Cluster.register(16, bootstrap);
}

class Cluster {
  static register(workers: number, callback: () => Promise<void>): void {
    if (cluster.default.isPrimary) {
      console.log(`Primary server started on ${process.pid}`);

      //ensure workers exit cleanly
      process.on('SIGINT', function () {
        console.log('Cluster shutting down...');
        for (const id in cluster.default.workers) {
          cluster.default.workers[id].kill();
        }
        // exit the master process
        process.exit(0);
      });

      const cpus = os.cpus().length;
      if (workers > cpus) workers = cpus;

      for (let i = 0; i < workers; i++) {
        cluster.default.fork();
      }
      cluster.default.on('online', function (worker) {
        console.log('Worker %s is online', worker.process.pid);
      });
      cluster.default.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting`);
        cluster.default.fork();
      });
    } else {
      callback();
    }
  }
}
