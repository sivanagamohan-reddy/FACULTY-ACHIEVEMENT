const bcrypt = require('bcryptjs');
const { pool } = require('../db');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (!key.startsWith('--')) continue;
    args[key.slice(2)] = val;
    i += 1;
  }
  return args;
}

function required(args, key) {
  const value = String(args[key] || '').trim();
  if (!value) throw new Error(`Missing required argument --${key}`);
  return value;
}

function validateRole(role) {
  const allowed = ['faculty', 'hod', 'principal'];
  if (!allowed.includes(role)) {
    throw new Error(`Invalid role "${role}". Use one of: ${allowed.join(', ')}`);
  }
}

function normalizeDepartment(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  const allowed = ['CSE', 'CSE(DS)', 'CSE(AI)', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA'];
  const matched = allowed.find((d) => d.toLowerCase() === input.toLowerCase());
  if (!matched) {
    throw new Error(`Invalid department "${input}". Use one of: ${allowed.join(', ')}`);
  }
  return matched;
}

async function run() {
  if (!pool) {
    throw new Error('DATABASE_URL is missing. Configure .env first.');
  }

  const args = parseArgs(process.argv);
  const username = required(args, 'username').toLowerCase();
  const email = required(args, 'email').toLowerCase();
  const fullName = required(args, 'name');
  const role = required(args, 'role').toLowerCase();
  const password = required(args, 'password');
  const department = normalizeDepartment(args.department || '');
  validateRole(role);

  const hash = await bcrypt.hash(password, 12);
  const sql = `
    INSERT INTO app_users (username, email, full_name, role, department, password_hash, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, TRUE)
    ON CONFLICT (username) DO UPDATE
      SET email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          department = EXCLUDED.department,
          password_hash = EXCLUDED.password_hash,
          is_active = TRUE
    RETURNING id, username, email, role, department, full_name, is_active
  `;

  const { rows } = await pool.query(sql, [username, email, fullName, role, department || null, hash]);
  console.log('User created/updated successfully:');
  console.log(rows[0]);
}

run()
  .catch((error) => {
    console.error('Create user failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (pool) await pool.end();
    } catch (_e) {
      // ignore
    }
  });
