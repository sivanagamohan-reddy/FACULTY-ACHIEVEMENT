const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Environment Detection
 */
const connectionString = process.env.DATABASE_URL?.trim();
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * SSL Configuration
 * - Automatically enabled in production (Render requires SSL)
 * - Disabled in local development unless explicitly enabled
 */
let sslConfig = undefined;

if (isProduction && connectionString) {
  // Render PostgreSQL requires SSL with self-signed certs
  sslConfig = { rejectUnauthorized: false };
} else if (
  String(process.env.PGSSL || '').toLowerCase() === 'true' ||
  String(process.env.PGSSLMODE || '').toLowerCase() === 'require'
) {
  sslConfig = { rejectUnauthorized: false };
}

/**
 * Check for discrete PG config (for local development)
 */
const hasDiscreteConfig =
  Boolean(process.env.PGHOST) &&
  Boolean(process.env.PGUSER) &&
  Boolean(process.env.PGDATABASE);

/**
 * Final Pool Configuration
 */
let config = null;

if (connectionString) {
  config = {
    connectionString,
    ssl: sslConfig,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
  };
} else if (hasDiscreteConfig) {
  config = {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER,
    password: String(process.env.PGPASSWORD ?? ''),
    database: process.env.PGDATABASE,
    ssl: sslConfig,
    max: Number(process.env.PGPOOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
  };
}

/**
 * Initialize Pool
 */
const pool = config ? new Pool(config) : null;

/**
 * Optional: Log DB status on startup (production-safe)
 */
if (!pool) {
  console.warn('⚠️ PostgreSQL not configured. DATABASE_URL missing.');
} else {
  pool.on('connect', () => {
    console.log('✅ PostgreSQL connected');
  });

  pool.on('error', (err) => {
    console.error('❌ Unexpected PostgreSQL error:', err.message);
  });
}

module.exports = { pool };