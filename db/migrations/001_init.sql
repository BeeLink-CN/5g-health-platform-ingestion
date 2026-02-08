-- Initialize vitals table with TimescaleDB hypertable
-- This migration creates the core vitals table and converts it to a hypertable

-- Create vitals table
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    heart_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    temperature DECIMAL(4, 2),
    oxygen_saturation SMALLINT,
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create hypertable on recorded_at (fully idempotent)
-- Note: This requires TimescaleDB extension to be enabled
-- Run: CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
SELECT create_hypertable('vitals', 'recorded_at', if_not_exists => TRUE);

-- Create index for efficient patient queries
CREATE INDEX IF NOT EXISTS idx_vitals_patient_time 
    ON vitals (patient_id, recorded_at DESC);

-- Create index for device_id lookups
CREATE INDEX IF NOT EXISTS idx_vitals_device 
    ON vitals (device_id) 
    WHERE device_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE vitals IS 'Stores patient vitals data ingested from MQTT, partitioned by time using TimescaleDB';
COMMENT ON COLUMN vitals.id IS 'Unique identifier for the vitals record UUID (from source)';
COMMENT ON COLUMN vitals.patient_id IS 'Patient identifier UUID (must match contracts format: uuid)';
COMMENT ON COLUMN vitals.recorded_at IS 'Timestamp when vitals were recorded (partition key)';
COMMENT ON COLUMN vitals.heart_rate IS 'Heart rate in beats per minute (integer)';
COMMENT ON COLUMN vitals.blood_pressure_systolic IS 'Systolic blood pressure in mmHg (integer)';
COMMENT ON COLUMN vitals.blood_pressure_diastolic IS 'Diastolic blood pressure in mmHg (integer)';
COMMENT ON COLUMN vitals.temperature IS 'Body temperature in Celsius (decimal)';
COMMENT ON COLUMN vitals.oxygen_saturation IS 'Blood oxygen saturation percentage (integer 0-100)';
COMMENT ON COLUMN vitals.device_id IS 'Optional device identifier that captured the vitals';
