const { pool } = require('../db');

async function run() {
  if (!pool) {
    throw new Error('DATABASE_URL is missing. Configure .env first.');
  }

  const sql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(80) UNIQUE NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('faculty','hod','principal')),
      department VARCHAR(120),
      password_hash TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department VARCHAR(120);

    CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users (lower(username));
    CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (lower(email));
  `;

  await pool.query(sql);
  console.log('Auth schema initialized successfully.');
}

run()
  .catch((error) => {
    console.error('Auth schema init failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (pool) await pool.end();
    } catch (_e) {
      // ignore
    }
  });
