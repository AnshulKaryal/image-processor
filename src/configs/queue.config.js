import Queue from 'bull';
import logger from '../utils/winston.logger.js';

// Create processing queue
const imageProcessingQueue = new Queue('imageProcessing', {
    redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || '127.0.0.1',
        password: process.env.REDIS_PASSWORD,
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        },
        removeOnComplete: 100, // Keep only 100 completed jobs
        removeOnFail: 100 // Keep only 100 failed jobs
    }
});


// Explicitly check Redis connection
(async () => {
    try {
        await imageProcessingQueue.client.ping();
        logger.info('Successfully connected to Redis!');
    } catch (error) {
        logger.error(`Failed to connect to Redis: ${error.message}`);
    }
})();


// Check for Redis connection issues
imageProcessingQueue.on('error', (error) => {
    logger.error(`Queue connection error: ${error.message}`);
});

imageProcessingQueue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed for request ${job.data.requestId}`);
});

imageProcessingQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed for request ${job.data.requestId}: ${err.message}`);
});

imageProcessingQueue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled for request ${job.data.requestId}`);
});

export { imageProcessingQueue };
