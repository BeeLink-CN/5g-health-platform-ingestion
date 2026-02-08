import mqtt from 'mqtt';
import { randomUUID } from 'crypto';

// Configuration
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883';
const PATIENT_ID = process.argv[2] || 'patient-001';
const INTERVAL_MS = 2000;

interface VitalsRecord {
    id: string;
    patient_id: string;
    recorded_at: string;
    heart_rate: number;
    blood_pressure: {
        systolic: number;
        diastolic: number;
    };
    temperature: number;
    oxygen_saturation: number;
    device_id: string;
}

function generateRandomVitals(): VitalsRecord {
    return {
        id: randomUUID(),
        patient_id: PATIENT_ID,
        recorded_at: new Date().toISOString(),
        heart_rate: Math.floor(Math.random() * 40) + 60, // 60-100 bpm
        blood_pressure: {
            systolic: Math.floor(Math.random() * 30) + 110, // 110-140 mmHg
            diastolic: Math.floor(Math.random() * 20) + 70, // 70-90 mmHg
        },
        temperature: parseFloat((Math.random() * 2 + 36.0).toFixed(2)), // 36.0-38.0°C
        oxygen_saturation: parseFloat((Math.random() * 5 + 95.0).toFixed(2)), // 95.0-100.0%
        device_id: `device-${PATIENT_ID}`,
    };
}

function main() {
    console.log('='.repeat(60));
    console.log('5G Health Platform - Vitals Simulator');
    console.log('='.repeat(60));
    console.log(`MQTT URL: ${MQTT_URL}`);
    console.log(`Patient ID: ${PATIENT_ID}`);
    console.log(`Interval: ${INTERVAL_MS}ms`);
    console.log('='.repeat(60));
    console.log('\nConnecting to MQTT...\n');

    const client = mqtt.connect(MQTT_URL, {
        clientId: `simulator-${PATIENT_ID}`,
    });

    client.on('connect', () => {
        console.log('✓ Connected to MQTT broker\n');
        console.log('Publishing vitals every 2 seconds...');
        console.log('Press Ctrl+C to stop\n');

        let count = 0;

        const interval = setInterval(() => {
            const vitals = generateRandomVitals();
            const topic = `home/${PATIENT_ID}/vitals`;
            const payload = JSON.stringify(vitals, null, 2);

            client.publish(topic, payload, { qos: 1 }, (err) => {
                if (err) {
                    console.error('❌ Publish error:', err);
                } else {
                    count++;
                    console.log(`[${count}] Published to ${topic}`);
                    console.log(`    ❤️  Heart Rate: ${vitals.heart_rate} bpm`);
                    console.log(`    🩸 BP: ${vitals.blood_pressure.systolic}/${vitals.blood_pressure.diastolic} mmHg`);
                    console.log(`    🌡️  Temp: ${vitals.temperature}°C`);
                    console.log(`    💨 SpO2: ${vitals.oxygen_saturation}%`);
                    console.log('');
                }
            });
        }, INTERVAL_MS);

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\nShutting down simulator...');
            clearInterval(interval);
            client.end(() => {
                console.log('✓ Disconnected from MQTT broker');
                console.log(`Total vitals published: ${count}`);
                process.exit(0);
            });
        });
    });

    client.on('error', (error) => {
        console.error('❌ MQTT connection error:', error);
        process.exit(1);
    });
}

main();
