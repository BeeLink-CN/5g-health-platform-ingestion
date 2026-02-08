# 5G Health Platform - Ingestion Service

[![CI](https://github.com/YOUR_ORG/5g-health-platform-ingestion/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_ORG/5g-health-platform-ingestion/actions/workflows/ci.yml)

**Mission**: Ingest home/ambulance vitals from MQTT, validate payloads using shared contracts, persist into Postgres/TimescaleDB, and publish standardized events to NATS JetStream.

## Overview

This service is part of the 5G Health Platform ecosystem. It:

1. **Subscribes** to MQTT topic pattern `home/+/vitals` (e.g., `home/<patient_id>/vitals`)
2. **Validates** incoming JSON payloads against the contracts domain schema (`schemas/domain/vitals.json`)
3. **Persists** validated vitals to a TimescaleDB hypertable
4. **Publishes** standardized events to NATS JetStream with subject `vitals.recorded`

All events strictly conform to the contracts event schema (`schemas/events/vitals-recorded.json`).

## Architecture

```
MQTT (home/+/vitals)
      ↓
  Subscriber → Schema Validation (AJV)
      ↓
   Database (TimescaleDB)
      ↓
  NATS Publisher (JetStream)
```

### Components

- **MQTT Subscriber** (`src/mqtt/subscriber.ts`): Listens to vitals topics
- **Schema Validator** (`src/validation/schema-validator.ts`): AJV-based validation against contracts
- **Database Client** (`src/db/client.ts`): PostgreSQL/TimescaleDB persistence
- **NATS Publisher** (`src/nats/publisher.ts`): JetStream event publishing
- **Health Server** (`src/health/server.ts`): Fastify server with `/health`, `/ready` endpoints

## Prerequisites

- **Node.js** 18+
- **Infrastructure Stack**: Ensure the [5g-health-platform-infra](../5g-health-platform-infra) repository is running
  - PostgreSQL/TimescaleDB
  - NATS with JetStream
  - Mosquitto MQTT broker
- **Contracts**: The [5g-health-platform-contracts](../5g-health-platform-contracts) repository

## Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd 5g-health-platform-ingestion
npm install
```

### 2. Integrate Contracts

**Option A: Git Submodule (Recommended)**

```bash
# Add contracts as submodule
git submodule add https://github.com/YOUR_ORG/5g-health-platform-contracts.git contracts

# Checkout specific version
cd contracts
git checkout v1.0.0  # or desired tag
cd ..

# Commit submodule
git add .gitmodules contracts
git commit -m "Add contracts submodule at v1.0.0"
```

**Option B: Vendored/Manual Copy**

```bash
# Clone contracts to temp location
git clone https://github.com/YOUR_ORG/5g-health-platform-contracts.git temp-contracts
cd temp-contracts
git checkout v1.0.0

# Copy schemas to project
mkdir -p contracts
cp -r schemas ../contracts/

# Update CONTRACTS_PATH in .env
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` to match your setup (defaults work with the infra stack):

```env
MQTT_URL=mqtt://localhost:1883
NATS_URL=nats://localhost:4222
DATABASE_URL=postgresql://platform_user:platform_secret@localhost:5432/5g_health_platform
CONTRACTS_PATH=./contracts/schemas
```

### 4. Database Migration

Run the TimescaleDB migration:

```bash
# Using psql
psql -h localhost -U platform_user -d 5g_health_platform -f db/migrations/001_init.sql

# Or via Docker
docker exec -i timescaledb psql -U platform_user -d 5g_health_platform < db/migrations/001_init.sql
```

## Running the Service

### Development Mode

```bash
npm run dev
```

This uses `tsx` with watch mode for hot reloading.

### Production Mode

```bash
npm run build
npm start
```

### Docker (with Infra Stack)

Ensure the `5g-platform-network` external network exists:

```bash
# In the infra repo
cd ../5g-health-platform-infra
make up
```

Then run this service:

```bash
docker compose up -d
```

## Testing

### Run Simulator

Publishes random vitals every 2 seconds to MQTT:

```bash
# Default patient (uses default UUID)
npm run simulate

# Specific patient (must be valid UUID)
npm run simulate 550e8400-e29b-41d4-a716-446655440001
```

Example output:

```
[1] Published to home/550e8400-e29b-41d4-a716-446655440000/vitals
    ❤️  Heart Rate: 75 bpm
    🩸 BP: 120/80 mmHg
    🌡️  Temp: 37.2°C
    💨 SpO2: 98%
```

### Unit Tests

```bash
npm test
npm run test:watch
```

### End-to-End Validation

1. **Start infra stack**:
   ```bash
   cd ../5g-health-platform-infra
   make up
   ```

2. **Run migration**:
   ```bash
   make db-migrate
   ```

3. **Start ingestion service**:
   ```bash
   npm run dev
   ```

4. **Run simulator**:
   ```bash
   npm run simulate patient-001
   ```

5. **Verify data in database**:
   ```bash
   psql -h localhost -U platform_user -d 5g_health_platform -c "SELECT * FROM vitals ORDER BY recorded_at DESC LIMIT 5;"
   ```

6. **Monitor NATS events**:
   ```bash
   nats sub "vitals.recorded"
   ```

### Health Checks

```bash
# Overall health
curl http://localhost:8091/health

# Readiness
curl http://localhost:8091/ready

# Service info
curl http://localhost:8091/
```

Example health response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "checks": {
    "database": true,
    "mqtt": true,
    "nats": true
  }
}
```

## Data Schema

### Input (MQTT Message)

Topic: `home/<patient_id>/vitals`

Payload conforms to `contracts/schemas/domain/vitals.json`:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "patient_id": "550e8400-e29b-41d4-a716-446655440001",
  "recorded_at": "2024-01-01T12:00:00Z",
  "heart_rate": 72,
  "blood_pressure": {
    "systolic": 120,
    "diastolic": 80
  },
  "temperature": 37.0,
  "oxygen_saturation": 98,
  "device_id": "device-001"
}
```

### Output (NATS Event)

Subject: `vitals.recorded`

Payload conforms to `contracts/schemas/events/vitals-recorded.json`:

```json
{
  "event_name": "vitals.recorded",
  "event_version": "1.0.0",
  "event_id": "660e8400-e29b-41d4-a716-446655440001",
  "timestamp": "2024-01-01T12:00:00.123Z",
  "payload": {
    "patient_id": "550e8400-e29b-41d4-a716-446655440001",
    "vitals": { ... }
  }
}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MQTT_URL` | `mqtt://localhost:1883` | MQTT broker URL |
| `MQTT_TOPIC` | `home/+/vitals` | Topic pattern to subscribe |
| `MQTT_CLIENT_ID` | `ingestion-service` | MQTT client identifier |
| `NATS_URL` | `nats://localhost:4222` | NATS server URL |
| `NATS_STREAM` | `vitals-events` | JetStream stream name |
| `NATS_SUBJECT` | `vitals.recorded` | Event subject |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `SERVICE_PORT` | `8091` | HTTP health server port |
| `NODE_ENV` | `development` | Environment mode |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `CONTRACTS_PATH` | `./contracts/schemas` | Path to contracts schemas |

## Troubleshooting

### Schema Validation Errors

**Problem**: "Failed to load schema" errors

**Solution**:
- Verify `CONTRACTS_PATH` points to correct directory
- Ensure contracts submodule is initialized: `git submodule update --init --recursive`
- Check schema files exist: `ls contracts/schemas/domain/vitals.json`

### Database Connection Issues

**Problem**: "Failed to connect to database"

**Solution**:
- Verify TimescaleDB is running: `docker ps | grep timescaledb`
- Test connection: `psql $DATABASE_URL -c "SELECT NOW()"`
- Check network connectivity if using Docker: `docker network ls`
- Ensure migration ran: `psql $DATABASE_URL -c "\d vitals"`

### MQTT Not Receiving Messages

**Problem**: No messages being processed

**Solution**:
- Check MQTT broker: `docker logs mosquitto`
- Verify topic pattern matches: Default is `home/+/vitals`
- Test with simulator: `npm run simulate`
- Monitor MQTT traffic: `mosquitto_sub -h localhost -t "home/#" -v`

### NATS Events Not Publishing

**Problem**: Events not appearing in NATS

**Solution**:
- Verify NATS JetStream is enabled: `docker logs nats`
- Check stream exists: `nats stream ls`
- Monitor events: `nats sub "vitals.recorded"`
- Check service logs for validation errors

### Docker Network Issues

**Problem**: Services can't communicate

**Solution**:
- Verify external network exists: `docker network ls | grep 5g-platform-network`
- Recreate network from infra repo: `cd ../5g-health-platform-infra && make network`
- Use `docker compose logs` to check connection errors

## Development

### Code Structure

```
src/
├── config/          # Configuration and logger
├── db/              # Database client
├── health/          # Health check server
├── mqtt/            # MQTT subscriber
├── nats/            # NATS publisher
├── validation/      # Schema validation
└── index.ts         # Application entry point
```

### Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Build TypeScript to `dist/`
- `npm start` - Run production build
- `npm test` - Run Jest tests
- `npm run lint` - ESLint check
- `npm run typecheck` - TypeScript type checking
- `npm run simulate` - Run vitals simulator

### Linting and Formatting

```bash
npm run lint
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push/PR:

1. Install dependencies
2. TypeScript type checking
3. ESLint linting
4. Jest unit tests
5. Build verification
6. Docker image build test

## Graceful Shutdown

The service handles `SIGINT` and `SIGTERM` signals gracefully:

1. Stop accepting new MQTT messages
2. Close health server
3. Drain MQTT client
4. Close NATS connection
5. Close database pool

## Contracts Version Management

### Updating Contracts

**Submodule approach**:

```bash
cd contracts
git fetch --tags
git checkout v1.1.0  # or desired version
cd ..
git add contracts
git commit -m "Update contracts to v1.1.0"
```

**Vendored approach**:

1. Download new version from contracts repo
2. Replace `contracts/schemas/` directory
3. Commit changes

### Pinning Strategy

- **Development**: Use `latest` or `main` branch
- **Staging**: Pin to specific tag (e.g., `v1.0.0`)
- **Production**: Always use explicit version tags

## License

MIT

## Support

For issues or questions:
- Open an issue in this repository
- Check the [5g-health-platform-infra](../5g-health-platform-infra) docs
- Review [5g-health-platform-contracts](../5g-health-platform-contracts) schemas
