CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(32) NOT NULL CHECK (type IN ('publication', 'fdp', 'conference', 'workshop', 'patent')),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO achievements (type, title, event_date, details)
VALUES
('publication', 'Advances and Challenges in AI', '2026-02-20', '{"journal":"AI Review","keywords":"AI, Diagnosis"}'),
('conference', 'International AI Congress', '2025-12-04', '{"role":"Presenter","location":"Bengaluru"}'),
('workshop', 'Deep Learning in Healthcare', '2025-10-10', '{"mode":"Hybrid","duration_hours":8}'),
('fdp', 'Outcome Based Education FDP', '2025-08-15', '{"mode":"Online","duration_days":5}'),
('patent', 'Adaptive Diagnostic System', '2025-06-01', '{"status":"Filed","office":"Indian Patent Office"}')
ON CONFLICT DO NOTHING;
