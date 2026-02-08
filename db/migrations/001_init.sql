-- Initialize vitals table with TimescaleDB hypertable
-- This migration creates the core vitals table and converts it to a hypertable

-- Create vitals table
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY,
    patient_id VARCHAR(255) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    heart_rate INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    temperature DECIMAL(4, 2),
    oxygen_saturation DECIMAL(5, 2),
    device_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create hypertable on recorded_at
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
COMMENT ON COLUMN vitals.id IS 'Unique identifier for the vitals record (from source)';
COMMENT ON COLUMN vitals.patient_id IS 'Patient identifier';
COMMENT ON COLUMN vitals.recorded_at IS 'Timestamp when vitals were recorded (partition key)';
COMMENT ON COLUMN vitals.heart_rate IS 'Heart rate in beats per minute';
COMMENT ON COLUMN vitals.blood_pressure_systolic IS 'Systolic blood pressure in mmHg';
COMMENT ON COLUMN vitals.blood_pressure_diastolic IS 'Diastolic blood pressure in mmHg';
COMMENT ON COLUMN vitals.temperature IS 'Body temperature in Celsius';
COMMENT ON COLUMN vitals.oxygen_saturation IS 'Blood oxygen saturation percentage';
COMMENT ON COLUMN vitals.device_id IS 'Optional device identifier that captured the vitals';
