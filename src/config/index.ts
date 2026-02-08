import dotenv from 'dotenv';
import { env } from 'process';

dotenv.config();

export interface Config {
    mqtt: {
        url: string;
        topic: string;
        clientId: string;
    };
    nats: {
        url: string;
        stream: string;
        subject: string;
    };
    database: {
        url: string;
    };
    service: {
        port: number;
        nodeEnv: string;
        logLevel: string;
    };
    contracts: {
        path: string;
        version: string;
    };
}

function getEnv(key: string, defaultValue?: string): string {
    const value = env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const config: Config = {
    mqtt: {
        url: getEnv('MQTT_URL', 'mqtt://localhost:1883'),
        topic: getEnv('MQTT_TOPIC', 'home/+/vitals'),
        clientId: getEnv('MQTT_CLIENT_ID', 'ingestion-service'),
    },
    nats: {
        url: getEnv('NATS_URL', 'nats://localhost:4222'),
        stream: getEnv('NATS_STREAM', 'vitals-events'),
        subject: getEnv('NATS_SUBJECT', 'vitals.recorded'),
    },
    database: {
        url: getEnv('DATABASE_URL'),
    },
    service: {
        port: parseInt(getEnv('SERVICE_PORT', '8091'), 10),
        nodeEnv: getEnv('NODE_ENV', 'development'),
        logLevel: getEnv('LOG_LEVEL', 'info'),
    },
    contracts: {
        path: getEnv('CONTRACTS_PATH', './contracts/schemas'),
        version: getEnv('CONTRACTS_VERSION', 'latest'),
    },
};
