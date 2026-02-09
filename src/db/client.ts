import { Pool } from 'pg';
import { config } from '../config';
import { logger } from '../config/logger';
import { VitalsRecord } from '../validation/schema-validator';

class DatabaseClient {
    private pool: Pool;
    private connected = false;

    constructor() {
        this.pool = new Pool({
            connectionString: config.database.url,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });

        this.pool.on('error', (err) => {
            logger.error({ err }, 'Unexpected database pool error');
        });
    }

    async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            this.connected = true;
            logger.info('Database connected');
        } catch (error) {
            logger.error({ error }, 'Failed to connect to database');
            throw error;
        }
    }

    async isHealthy(): Promise<boolean> {
        try {
            const client = await this.pool.connect();
            await client.query('SELECT 1');
            client.release();
            return true;
        } catch (error) {
            logger.error({ error }, 'Database health check failed');
            return false;
        }
    }

    async insertVitals(vitals: VitalsRecord): Promise<void> {
        const query = `
      INSERT INTO vitals (
        id,
        patient_id,
        recorded_at,
        heart_rate,
        blood_pressure_systolic,
        blood_pressure_diastolic,
        temperature,
        oxygen_saturation,
        device_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `;

        const values = [
            vitals.id,
            vitals.patient_id,
            vitals.recorded_at,
            vitals.heart_rate ?? null,
            vitals.blood_pressure?.systolic ?? null,
            vitals.blood_pressure?.diastolic ?? null,
            vitals.temperature ?? null,
            vitals.oxygen_saturation ?? null,
            vitals.device_id ?? null,
        ];

        try {
            await this.pool.query(query, values);
            logger.debug(
                { vitals_id: vitals.id, patient_id: vitals.patient_id },
                'Vitals inserted'
            );
        } catch (error) {
            logger.error({ error, vitals }, 'Failed to insert vitals');
            throw error;
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
        this.connected = false;
        logger.info('Database connection closed');
    }

    isConnected(): boolean {
        return this.connected;
    }
}

export const db = new DatabaseClient();
