import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { logger } from '../config/logger';
import { config } from '../config';

export interface VitalsRecord {
    id: string;
    patient_id: string;
    recorded_at: string;
    heart_rate?: number;
    blood_pressure?: {
        systolic: number;
        diastolic: number;
    };
    temperature?: number;
    oxygen_saturation?: number;
    device_id?: string;
}

export interface VitalsRecordedEvent {
    event_name: string;
    event_version: string;
    event_id: string;
    timestamp: string;
    payload: {
        patient_id: string;
        vitals: VitalsRecord;
    };
}

class SchemaValidator {
    private ajv: Ajv;
    private vitalsValidator?: ValidateFunction;
    private eventValidator?: ValidateFunction;

    constructor() {
        this.ajv = new Ajv({
            allErrors: true,
            verbose: true,
            strict: false,
            loadSchema: this.loadSchemaAsync.bind(this),
        });
        addFormats(this.ajv);
    }

    private async loadSchemaAsync(uri: string): Promise<object> {
        logger.debug({ uri }, 'Loading schema reference');
        // Handle $ref resolution for local schemas
        const schemaPath = uri.replace('file://', '');
        const content = readFileSync(schemaPath, 'utf-8');
        return JSON.parse(content);
    }

    private loadSchema(relativePath: string): object {
        const schemaPath = resolve(config.contracts.path, relativePath);
        logger.info({ schemaPath }, 'Loading schema');

        try {
            const content = readFileSync(schemaPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            logger.error({ error, schemaPath }, 'Failed to load schema');
            throw new Error(`Failed to load schema from ${schemaPath}: ${error}`);
        }
    }

    async initialize(): Promise<void> {
        logger.info('Initializing schema validator');

        // Load and compile vitals domain schema
        const vitalsSchema = this.loadSchema('domain/vitals.json');
        this.vitalsValidator = this.ajv.compile(vitalsSchema);

        // Load and compile vitals-recorded event schema
        const eventSchema = this.loadSchema('events/vitals-recorded.json');
        this.eventValidator = this.ajv.compile(eventSchema);

        logger.info('Schema validator initialized');
    }

    validateVitals(data: unknown): data is VitalsRecord {
        if (!this.vitalsValidator) {
            throw new Error('Validator not initialized');
        }

        const valid = this.vitalsValidator(data);
        if (!valid) {
            logger.warn(
                { errors: this.vitalsValidator.errors, data },
                'Vitals validation failed'
            );
        }
        return valid;
    }

    validateEvent(data: unknown): data is VitalsRecordedEvent {
        if (!this.eventValidator) {
            throw new Error('Validator not initialized');
        }

        const valid = this.eventValidator(data);
        if (!valid) {
            logger.error(
                { errors: this.eventValidator.errors, data },
                'Event validation failed'
            );
        }
        return valid;
    }

    getVitalsErrors(): string {
        return this.ajv.errorsText(this.vitalsValidator?.errors);
    }

    getEventErrors(): string {
        return this.ajv.errorsText(this.eventValidator?.errors);
    }
}

export const schemaValidator = new SchemaValidator();
