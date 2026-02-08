import {
    connect,
    NatsConnection,
    JetStreamClient,
    JetStreamManager,
    StringCodec,
    StorageType,
    RetentionPolicy,
} from 'nats';
import { config } from '../config';
import { logger } from '../config/logger';
import { VitalsRecordedEvent } from '../validation/schema-validator';

class NatsPublisher {
    private nc?: NatsConnection;
    private js?: JetStreamClient;
    private jsm?: JetStreamManager;
    private sc = StringCodec();
    private connected = false;

    async connect(): Promise<void> {
        try {
            this.nc = await connect({ servers: config.nats.url });
            this.js = this.nc.jetstream();
            this.jsm = await this.nc.jetstreamManager();

            logger.info({ url: config.nats.url }, 'NATS connected');
            this.connected = true;

            // Setup stream
            await this.setupStream();
        } catch (error) {
            logger.error({ error }, 'Failed to connect to NATS');
            throw error;
        }
    }

    private async setupStream(): Promise<void> {
        try {
            // Check if stream exists
            const streams = await this.jsm!.streams.list().next();
            const streamExists = streams.find(
                (s) => s.config.name === config.nats.stream
            );

            if (!streamExists) {
                logger.info(
                    { stream: config.nats.stream },
                    'Creating JetStream stream'
                );
                await this.jsm!.streams.add({
                    name: config.nats.stream,
                    subjects: [`${config.nats.subject}.*`, config.nats.subject],
                    storage: StorageType.File,
                    retention: RetentionPolicy.Limits,
                    max_age: 7 * 24 * 60 * 60 * 1e9, // 7 days in nanoseconds
                    max_msgs: 1000000,
                });
                logger.info('JetStream stream created');
            } else {
                logger.info('JetStream stream already exists');
            }
        } catch (error) {
            logger.error({ error }, 'Failed to setup JetStream stream');
            throw error;
        }
    }

    async publish(event: VitalsRecordedEvent): Promise<void> {
        if (!this.js) {
            throw new Error('NATS not connected');
        }

        try {
            const payload = this.sc.encode(JSON.stringify(event));
            const ack = await this.js.publish(config.nats.subject, payload);

            logger.debug(
                {
                    subject: config.nats.subject,
                    event_id: event.event_id,
                    stream: ack.stream,
                    seq: ack.seq,
                },
                'Event published to NATS'
            );
        } catch (error) {
            logger.error({ error, event }, 'Failed to publish event to NATS');
            throw error;
        }
    }

    async isHealthy(): Promise<boolean> {
        if (!this.nc) return false;

        try {
            const status = this.nc.status();
            return status !== undefined;
        } catch (error) {
            logger.error({ error }, 'NATS health check failed');
            return false;
        }
    }

    async close(): Promise<void> {
        if (this.nc) {
            await this.nc.drain();
            await this.nc.close();
            this.connected = false;
            logger.info('NATS connection closed');
        }
    }

    isConnected(): boolean {
        return this.connected;
    }
}

export const natsPublisher = new NatsPublisher();
