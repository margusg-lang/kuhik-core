// kuhik-core/backend/src/plugins/queues.ts
// BullMQ queue plugin for background job processing

import { FastifyInstance } from 'fastify';
import { Queue, ConnectionOptions } from 'bullmq';
import { config } from '../config.js';

let billingQueue: Queue | null = null;
let notificationQueue: Queue | null = null;

function createQueueIfRedisAvailable(name: string): Queue | null {
  if (!config.redisUrl) return null;
  try {
    const connection: ConnectionOptions = { url: config.redisUrl };
    return new Queue(name, { connection });
  } catch {
    return null;
  }
}

export async function registerQueuePlugin(app: FastifyInstance): Promise<void> {
  // Queues are optional — they only register if Redis is available
  billingQueue = createQueueIfRedisAvailable('billing');
  notificationQueue = createQueueIfRedisAvailable('notifications');

  app.decorate('queues', {
    billing: billingQueue,
    notifications: notificationQueue,
  });

  if (billingQueue) {
    app.log.info('BullMQ queues registered (Redis connected)');
  } else {
    app.log.warn('Redis not configured — queues disabled. Background jobs will not run.');
    app.log.warn('To enable queues, set REDIS_URL in .env and start Redis');
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    queues: {
      billing: Queue | null;
      notifications: Queue | null;
    };
  }
}

export { billingQueue, notificationQueue };