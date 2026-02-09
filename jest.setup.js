// Jest setup file - sets required environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.MQTT_URL = 'mqtt://localhost:1883';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.CONTRACTS_PATH = './contracts/schemas';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
