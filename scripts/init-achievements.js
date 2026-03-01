const { pool } = require('../db');

async function run() {
  if (!pool) {
    throw new Error('DATABASE_URL is missing. Configure .env first.');
  }

  const sql = `
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    CREATE TABLE IF NOT EXISTS achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(32) NOT NULL CHECK (type IN ('publication', 'fdp', 'conference', 'workshop', 'patent')),
      title TEXT NOT NULL,
      event_date DATE NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      user_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE achievements ADD COLUMN IF NOT EXISTS user_id UUID;

    INSERT INTO achievements (type, title, event_date, details)
    SELECT 'publication', 'Advances and Challenges in AI', '2026-02-20', '{"journal":"AI Review","keywords":"AI, Diagnosis"}'::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM achievements WHERE title = 'Advances and Challenges in AI'
    );
  `;

  await pool.query(sql);
  console.log('Achievements schema initialized successfully.');
}

run()
  .catch((error) => {
    console.error('Achievements schema init failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (pool) await pool.end();
    } catch (_e) {
      // ignore
    }
  });
