const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const connectionString = process.env.DATABASE_URL?.trim();
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const sslRequired =
  String(process.env.PGSSL || '').toLowerCase() === 'true' ||
  String(process.env.PGSSLMODE || '').toLowerCase() === 'require' ||
  (isProduction && Boolean(connectionString));
const sslConfig = sslRequired
  ? { rejectUnauthorized: String(process.env.PGSSL_REJECT_UNAUTHORIZED || 'false').toLowerCase() === 'true' }
  : undefined;

const hasDiscreteConfig = Boolean(process.env.PGHOST || process.env.PGUSER || process.env.PGDATABASE);

const config = connectionString
  ? {
      connectionString,
      ssl: sslConfig,
      max: Number(process.env.PGPOOL_MAX || 10),
      idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
      connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
    }
  : hasDiscreteConfig
    ? {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER,
        password: String(process.env.PGPASSWORD ?? ''),
        database: process.env.PGDATABASE,
        ssl: sslConfig,
        max: Number(process.env.PGPOOL_MAX || 10),
        idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 30000),
        connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS || 10000),
      }
    : null;

const pool = config ? new Pool(config) : null;

module.exports = { pool };
