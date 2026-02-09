import mqtt, { MqttClient } from 'mqtt';
import { config } from '../config';
import { logger } from '../config/logger';
import { schemaValidator } from '../validation/schema-validator';
import { db } from '../db/client';
import { natsPublisher } from '../nats/publisher';
import { randomUUID } from 'crypto';

class MqttSubscriber {
    private client?: MqttClient;
    private connected = false;

    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client = mqtt.connect(config.mqtt.url, {
                clientId: config.mqtt.clientId,
                clean: true,
                reconnectPeriod: 5000,
            });

            this.client.on('connect', () => {
                logger.info({ url: config.mqtt.url }, 'MQTT connected');
                this.connected = true;
                this.subscribe();
                resolve();
            });

            this.client.on('error', (error) => {
                logger.error({ error }, 'MQTT connection error');
                reject(error);
            });

            this.client.on('message', this.handleMessage.bind(this));

            this.client.on('offline', () => {
                logger.warn('MQTT offline');
                this.connected = false;
            });

            this.client.on('reconnect', () => {
                logger.info('MQTT reconnecting');
            });
        });
    }

    private subscribe(): void {
        if (!this.client) return;

        this.client.subscribe(config.mqtt.topic, { qos: 1 }, (err) => {
            if (err) {
                logger.error({ err, topic: config.mqtt.topic }, 'MQTT subscribe failed');
            } else {
                logger.info({ topic: config.mqtt.topic }, 'Subscribed to MQTT topic');
            }
        });
    }

    private async handleMessage(topic: string, payload: Buffer): Promise<void> {
        const startTime = Date.now();

        try {
            // Parse payload
            const messageStr = payload.toString();
            logger.debug({ topic, message: messageStr }, 'Received MQTT message');

            let vitals: unknown;
            try {
                vitals = JSON.parse(messageStr);
            } catch (error) {
                logger.error({ error, topic, payload: messageStr }, 'Invalid JSON payload');
                return;
            }

            // Validate against vitals schema
            if (!schemaValidator.validateVitals(vitals)) {
                logger.warn(
                    {
                        topic,
                        errors: schemaValidator.getVitalsErrors(),
                        payload: vitals,
                    },
                    'Vitals validation failed'
                );
                return;
            }

            // Extract patient_id from topic (home/<patient_id>/vitals)
            const topicParts = topic.split('/');
            const topicPatientId = topicParts[1];

            // Verify patient_id matches
            if (topicPatientId !== vitals.patient_id) {
                logger.warn(
                    {
                        topic,
                        topic_patient_id: topicPatientId,
                        payload_patient_id: vitals.patient_id,
                    },
                    'Patient ID mismatch between topic and payload'
                );
            }

            // Insert into database
            await db.insertVitals(vitals);

            // Create and publish event
            const event = {
                event_name: 'vitals.recorded',
                event_version: '1.0.0',
                event_id: randomUUID(),
                timestamp: new Date().toISOString(),
                payload: {
                    patient_id: vitals.patient_id,
                    vitals: vitals,
                },
            };

            // Validate event before publishing
            if (!schemaValidator.validateEvent(event)) {
                logger.error(
                    {
                        errors: schemaValidator.getEventErrors(),
                        event,
                    },
                    'Event validation failed - not publishing'
                );
                return;
            }

            // Publish to NATS with retry logic (MVP approach)
            await this.publishWithRetry(event, 3);

            const duration = Date.now() - startTime;
            logger.info(
                {
                    topic,
                    patient_id: vitals.patient_id,
                    vitals_id: vitals.id,
                    duration_ms: duration,
                },
                'Vitals processed successfully'
            );
        } catch (error) {
            logger.error({ error, topic }, 'Failed to process MQTT message');
        }
    }

    async isHealthy(): Promise<boolean> {
        return this.connected && this.client !== undefined;
    }

    async close(): Promise<void> {
        if (this.client) {
            await new Promise<void>((resolve) => {
                this.client!.end(false, {}, () => {
                    this.connected = false;
                    logger.info('MQTT connection closed');
                    resolve();
                });
            });
        }
    }

    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Publish event to NATS with exponential backoff retry
     * MVP approach: simple retry with backoff
     * TODO: In production, consider outbox table pattern for exactly-once delivery
     */
    private async publishWithRetry(
        event: any,
        maxRetries: number = 3
    ): Promise<void> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                await natsPublisher.publish(event);
                if (attempt > 0) {
                    logger.info(
                        { event_id: event.event_id, attempt: attempt + 1 },
                        'Event published after retry'
                    );
                }
                return; // Success
            } catch (error) {
                lastError = error as Error;
                logger.warn(
                    {
                        error,
                        event_id: event.event_id,
                        attempt: attempt + 1,
                        max_retries: maxRetries,
                    },
                    'NATS publish failed, retrying...'
                );

                if (attempt < maxRetries - 1) {
                    // Exponential backoff: 100ms, 200ms, 400ms
                    const delayMs = 100 * Math.pow(2, attempt);
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                }
            }
        }

        // All retries exhausted
        logger.error(
            {
                error: lastError,
                event_id: event.event_id,
                patient_id: event.payload.patient_id,
            },
            'Failed to publish event after all retries - DATA PERSISTED IN DB BUT EVENT LOST'
        );
        // Note: Data is already in DB. Event lost but queryable via DB.
        // TODO: Write to outbox table for background publisher in production
    }
}

export const mqttSubscriber = new MqttSubscriber();
