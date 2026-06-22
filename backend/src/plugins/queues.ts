// kuhik-core/backend/src/plugins/queues.ts
// BullMQ queue plugin for background job processing

import { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';
import { config } from '../config.js';

let billingQueue: Queue | null = null;
let notificationQueue: Queue | null = null;

export async function registerQueuePlugin(app: FastifyInstance): Promise<void> {
  // Queues are optional — they only register if Redis is available
  try {
    billingQueue = new Queue('billing', { connection: { url: config.redisUrl } });
    notificationQueue = new Queue('notifications', { connection: { url: config.redisUrl } });

    app.decorate('queues', {
      billing: billingQueue,
      notifications: notificationQueue,
    });

    app.log.info('BullMQ queues registered (Redis connected)');
  } catch (err) {
    app.log.warn('Redis not available — queues disabled. Background jobs will not run.');
    app.log.warn('To enable queues, start Redis and set REDIS_URL in .env');
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