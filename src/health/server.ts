import Fastify, { FastifyInstance } from 'fastify';
import { config } from '../config';
import { logger } from '../config/logger';
import { db } from '../db/client';
import { mqttSubscriber } from '../mqtt/subscriber';
import { natsPublisher } from '../nats/publisher';

interface HealthStatus {
    status: 'ok' | 'degraded' | 'error';
    timestamp: string;
    checks: {
        database: boolean;
        mqtt: boolean;
        nats: boolean;
    };
}

class HealthServer {
    private server: FastifyInstance;

    constructor() {
        this.server = Fastify({
            logger: false, // Use our own logger
        });

        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.server.get('/health', async (request, reply) => {
            const checks = {
                database: await db.isHealthy(),
                mqtt: await mqttSubscriber.isHealthy(),
                nats: await natsPublisher.isHealthy(),
            };

            const allHealthy = Object.values(checks).every((v) => v === true);
            const status: HealthStatus = {
                status: allHealthy ? 'ok' : 'degraded',
                timestamp: new Date().toISOString(),
                checks,
            };

            const statusCode = allHealthy ? 200 : 503;
            return reply.status(statusCode).send(status);
        });

        this.server.get('/ready', async (request, reply) => {
            const ready =
                db.isConnected() &&
                mqttSubscriber.isConnected() &&
                natsPublisher.isConnected();

            if (ready) {
                return reply.status(200).send({ status: 'ready' });
            } else {
                return reply.status(503).send({ status: 'not ready' });
            }
        });

        this.server.get('/', async (request, reply) => {
            return reply.send({
                service: '5g-health-platform-ingestion',
                version: '1.0.0',
                status: 'running',
            });
        });
    }

    async start(): Promise<void> {
        try {
            await this.server.listen({
                port: config.service.port,
                host: '0.0.0.0',
            });
            logger.info(
                { port: config.service.port },
                'Health server listening'
            );
        } catch (error) {
            logger.error({ error }, 'Failed to start health server');
            throw error;
        }
    }

    async stop(): Promise<void> {
        await this.server.close();
        logger.info('Health server stopped');
    }
}

export const healthServer = new HealthServer();
