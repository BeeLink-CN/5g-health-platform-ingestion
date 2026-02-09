import pino from 'pino';
import { config } from '.';

export const logger = pino({
    level: config.service.logLevel,
    transport:
        config.service.nodeEnv === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            }
            : undefined,
});
