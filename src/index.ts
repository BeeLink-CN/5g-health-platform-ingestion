import { logger } from './config/logger';
import { config } from './config';
import { schemaValidator } from './validation/schema-validator';
import { db } from './db/client';
import { natsPublisher } from './nats/publisher';
import { mqttSubscriber } from './mqtt/subscriber';
import { healthServer } from './health/server';

async function bootstrap() {
    logger.info('Starting 5G Health Platform Ingestion Service');
    logger.info({ config }, 'Configuration loaded');

    try {
        // Initialize schema validator
        await schemaValidator.initialize();

        // Connect to database
        await db.connect();

        // Connect to NATS
        await natsPublisher.connect();

        // Connect to MQTT (starts subscription)
        await mqttSubscriber.connect();

        // Start health server
        await healthServer.start();

        logger.info('Service started successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to start service');
        await shutdown();
        process.exit(1);
    }
}

async function shutdown() {
    logger.info('Shutting down service');

    try {
        // Close in reverse order
        await healthServer.stop();
        await mqttSubscriber.close();
        await natsPublisher.close();
        await db.close();

        logger.info('Service shutdown complete');
    } catch (error) {
        logger.error({ error }, 'Error during shutdown');
    }
}

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    logger.info('Received SIGINT');
    await shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM');
    await shutdown();
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
    logger.error({ error }, 'Uncaught Exception');
    shutdown().then(() => process.exit(1));
});

// Start the service
bootstrap();
