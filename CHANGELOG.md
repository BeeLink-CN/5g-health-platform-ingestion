# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release of 5G Health Platform Ingestion Service
- MQTT subscriber for vitals data from `home/+/vitals` topic pattern
- AJV-based schema validation against contracts repository
- TimescaleDB integration with hypertable for time-series data
- NATS JetStream publisher for standardized events
- Health check endpoints (`/health`, `/ready`)
- Graceful shutdown handling
- Vitals simulator for end-to-end testing
- Docker and Docker Compose support
- GitHub Actions CI/CD pipeline
- Comprehensive documentation and troubleshooting guide

### Architecture
- Clean separation of concerns: config, mqtt, db, nats, validation, health
- TypeScript with strict mode
- Structured logging with Pino
- Connection pooling for PostgreSQL
- Automatic JetStream stream creation

### Infrastructure
- Database migration for vitals hypertable
- Index optimization for patient and time-based queries
- Docker external network support for infra integration
- Development and production Docker configurations

## [1.0.0] - YYYY-MM-DD

### Initial Release
- MVP functionality for vitals ingestion pipeline
- Integration with 5g-health-platform-infra
- Contracts validation using 5g-health-platform-contracts
