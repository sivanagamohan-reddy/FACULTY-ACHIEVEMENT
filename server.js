const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const { pool } = require('./db');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret-change-in-env';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '8h';
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const cookieSecure = String(process.env.COOKIE_SECURE || (isProduction ? 'true' : 'false')).toLowerCase() === 'true';
const configuredCorsOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const renderExternalUrl = String(process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
const fallbackOrigins = [`http://localhost:${port}`];
if (renderExternalUrl) fallbackOrigins.push(renderExternalUrl);
const allowedOrigins = new Set(configuredCorsOrigins.length ? configuredCorsOrigins : fallbackOrigins);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(hpp());
app.use(cookieParser());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      // Do not throw for non-allowed origins. Returning false omits CORS headers
      // while still allowing same-origin/static requests to proceed safely.
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', apiLimiter);
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

const typeToCategory = {
  publication: 'Paper Publications',
  fdp: 'FDP Attendeds',
  conference: 'Conferences',
  workshop: 'Workshops',
  patent: 'Patents',
};
const DEPARTMENTS = ['CSE', 'CSE(DS)', 'CSE(AI)', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'MBA'];

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

let useMemoryStore = !pool;
let authSchemaEnhanced = false;
let achievementsSchemaEnhanced = false;
let achievementsUserIdSupported = false;
const memoryAchievements = [
  {
    id: randomUUID(),
    type: 'publication',
    title: 'Advances and Challenges in AI',
    event_date: '2026-02-20',
    details: { journal: 'AI Review', keywords: 'AI, Diagnosis' },
    created_at: new Date('2026-02-20T09:00:00Z').toISOString(),
  },
  {
    id: randomUUID(),
    type: 'conference',
    title: 'International AI Congress',
    event_date: '2025-12-04',
    details: { role: 'Presenter', location: 'Bengaluru' },
    created_at: new Date('2025-12-04T09:00:00Z').toISOString(),
  },
];

function sanitizeText(value, maxLen = 255) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

function normalizeDepartment(value) {
  const input = sanitizeText(value, 120);
  if (!input) return '';
  const matched = DEPARTMENTS.find((dept) => dept.toLowerCase() === input.toLowerCase());
  return matched || '';
}

function buildAcademicYearLabel(startYear) {
  const nextYearShort = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${nextYearShort}`;
}

function getAcademicYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 3; y <= currentYear + 2; y += 1) {
    years.push(buildAcademicYearLabel(y));
  }
  return years;
}

function isAuthSetupError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('app_users') || msg.includes('database is not configured');
}

function isDbConnectionError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return (
    msg.includes('sasl') ||
    msg.includes('password') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('pg_hba') ||
    msg.includes('database') ||
    msg.includes('connect')
  );
}

function toIsoDateString(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function parseAcademicYearRange(label) {
  const value = sanitizeText(label, 16);
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const startYear = Number(match[1]);
  if (!Number.isFinite(startYear)) return null;
  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

function sanitizeAchievementDetails(details) {
  const safe = {};
  const input = details && typeof details === 'object' ? details : {};
  const allowedKeys = [
    'journal', 'authors', 'doi_url', 'impact_factor', 'indexing', 'status',
    'institution', 'end_date', 'duration_days', 'mode', 'sponsor',
    'paper_title', 'location', 'organizer', 'role', 'level', 'indexed_in',
    'duration_hours', 'topics', 'application_number', 'inventors', 'office',
    'grant_date', 'abstract', 'department', 'owner_id', 'owner_role',
  ];
  for (const key of allowedKeys) {
    if (input[key] === undefined || input[key] === null) continue;
    safe[key] = sanitizeText(String(input[key]), 600);
  }

  if (input.attachment && typeof input.attachment === 'object') {
    const att = input.attachment;
    const name = sanitizeText(att.name, 180);
    const type = sanitizeText(att.type, 80).toLowerCase();
    const size = Number(att.size || 0);
    const dataUrl = String(att.data_url || '');
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
    if (!allowedTypes.has(type)) {
      throw new Error('Invalid attachment type');
    }
    if (!Number.isFinite(size) || size <= 0 || size > 10 * 1024 * 1024) {
      throw new Error('Attachment must be <= 10MB');
    }
    if (!/^data:(image\/jpeg|image\/png|image\/webp|application\/pdf);base64,[A-Za-z0-9+/=\r\n]+$/.test(dataUrl)) {
      throw new Error('Invalid attachment data');
    }
    safe.attachment = { name, type, size, data_url: dataUrl };
  }

  return safe;
}

function toDisplayDate(value) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '';
  return dateFormatter.format(dt);
}

function withDisplayDate(item) {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    display_date: toDisplayDate(item.event_date),
  };
}

function toStats(items) {
  const stats = {
    publications: 0,
    fdps: 0,
    conferences: 0,
    workshops: 0,
    patents: 0,
  };

  for (const item of items) {
    if (item.type === 'publication') stats.publications += 1;
    if (item.type === 'fdp') stats.fdps += 1;
    if (item.type === 'conference') stats.conferences += 1;
    if (item.type === 'workshop') stats.workshops += 1;
    if (item.type === 'patent') stats.patents += 1;
  }
  return stats;
}

async function queryDb(sql, params = []) {
  if (!pool) throw new Error('Database is not configured');
  return pool.query(sql, params);
}

async function initializeDatabaseSchema() {
  if (!pool) {
    useMemoryStore = true;
    console.warn('Database pool is not configured. Starting server with in-memory fallback.');
    return;
  }

  try {
    await queryDb(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryDb(`
      CREATE TABLE IF NOT EXISTS app_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(80) UNIQUE NOT NULL,
        email VARCHAR(160) UNIQUE NOT NULL,
        full_name VARCHAR(160) NOT NULL,
        role VARCHAR(20) NOT NULL,
        department VARCHAR(120),
        password_hash TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryDb(`
      CREATE TABLE IF NOT EXISTS achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        details JSONB,
        user_id UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    authSchemaEnhanced = true;
    achievementsSchemaEnhanced = true;
    achievementsUserIdSupported = true;
    useMemoryStore = false;
    console.log('Database schema initialization completed.');
  } catch (error) {
    if (fallbackToMemory(error)) {
      console.warn('Database schema initialization failed. Continuing with in-memory fallback.');
      return;
    }
    console.error('Database schema initialization error:', error.message);
    throw error;
  }
}

async function ensureAuthSchemaEnhancements() {
  if (authSchemaEnhanced || !pool) return;
  try {
    await queryDb(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS department VARCHAR(120)`);
    authSchemaEnhanced = true;
  } catch (error) {
    if (String(error?.message || '').toLowerCase().includes('app_users')) {
      return;
    }
    throw error;
  }
}

async function ensureAchievementsSchemaEnhancements() {
  if (achievementsSchemaEnhanced || !pool) return;
  try {
    await queryDb(`ALTER TABLE achievements ADD COLUMN IF NOT EXISTS user_id UUID`);
    achievementsUserIdSupported = true;
    achievementsSchemaEnhanced = true;
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('achievements') || msg.includes('permission')) {
      achievementsUserIdSupported = false;
      achievementsSchemaEnhanced = true;
      return;
    }
    throw error;
  }
}

async function getActorContext(reqUser) {
  await ensureAuthSchemaEnhancements();
  const fallbackDepartment = reqUser.role === 'hod' ? 'CSE(DS)' : '';
  if (!pool) {
    return {
      id: reqUser.sub,
      role: reqUser.role,
      username: sanitizeText(reqUser.username, 80).toLowerCase(),
      name: sanitizeText(reqUser.name, 160),
      department: normalizeDepartment(reqUser.department) || fallbackDepartment,
    };
  }
  const { rows } = await queryDb(
    `SELECT id, role, username, full_name, department FROM app_users WHERE id = $1 LIMIT 1`,
    [reqUser.sub]
  );
  if (!rows.length) {
    return {
      id: reqUser.sub,
      role: reqUser.role,
      username: sanitizeText(reqUser.username, 80).toLowerCase(),
      name: sanitizeText(reqUser.name, 160),
      department: normalizeDepartment(reqUser.department) || fallbackDepartment,
    };
  }
  const dbRole = rows[0].role;
  const dbFallbackDepartment = dbRole === 'hod' ? 'CSE(DS)' : '';
  return {
    id: rows[0].id,
    role: dbRole,
    username: sanitizeText(rows[0].username, 80).toLowerCase(),
    name: sanitizeText(rows[0].full_name, 160),
    department: normalizeDepartment(rows[0].department) || dbFallbackDepartment,
  };
}

function fallbackToMemory(error) {
  if (isDbConnectionError(error)) {
    useMemoryStore = true;
    console.warn('Database unavailable. Falling back to in-memory store:', error.message);
    return true;
  }
  return false;
}

async function listAchievements(filter = {}) {
  const role = filter.role || '';
  const userId = filter.userId || '';
  const department = normalizeDepartment(filter.department);
  const academicYear = sanitizeText(filter.academicYear, 16);
  const type = sanitizeText(filter.type, 32).toLowerCase();
  const range = parseAcademicYearRange(academicYear);

  if (useMemoryStore) {
    let source = [...memoryAchievements].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (type && typeToCategory[type]) {
      source = source.filter((item) => item.type === type);
    }
    if (!range) return source;
    return source.filter((item) => item.event_date >= range.from && item.event_date <= range.to);
  }
  try {
    await ensureAchievementsSchemaEnhancements();
    const useUserIdColumn = achievementsUserIdSupported;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (role === 'faculty' && userId) {
      if (useUserIdColumn) {
        conditions.push(`user_id = $${idx++}`);
      } else {
        conditions.push(`details->>'owner_id' = $${idx++}`);
      }
      params.push(userId);
    }
    if ((role === 'hod' || role === 'principal') && department) {
      conditions.push(`details->>'department' = $${idx++}`);
      params.push(department);
    }
    if (type && typeToCategory[type]) {
      conditions.push(`type = $${idx++}`);
      params.push(type);
    }
    if (range) {
      conditions.push(`event_date BETWEEN $${idx++}::date AND $${idx++}::date`);
      params.push(range.from, range.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const selectUserId = useUserIdColumn ? 'user_id' : 'NULL::uuid AS user_id';
    const { rows } = await queryDb(
      `SELECT id, title, type, event_date, details, created_at, ${selectUserId}
       FROM achievements
       ${where}
       ORDER BY created_at DESC`,
      params
    );
    const mapped = rows.map((row) => ({
      ...row,
      event_date: toIsoDateString(row.event_date),
      created_at: new Date(row.created_at).toISOString(),
      owner_id: sanitizeText(row?.details?.owner_id, 80) || sanitizeText(row?.user_id, 80),
      owner_name: sanitizeText(row?.details?.owner_name, 160),
      owner_username: sanitizeText(row?.details?.owner_username, 80).toLowerCase(),
    }));

    const needsOwnerLookup = mapped.some((item) => !item.owner_name || !item.owner_username || !item.owner_id);
    if (!needsOwnerLookup || !pool) return mapped;

    const candidateIds = new Set();
    for (const item of mapped) {
      const fromOwner = sanitizeText(item.owner_id, 80);
      if (isUuid(fromOwner)) candidateIds.add(fromOwner);
      const fromUserCol = sanitizeText(item.user_id, 80);
      if (isUuid(fromUserCol)) candidateIds.add(fromUserCol);
    }
    const idList = [...candidateIds];
    if (!idList.length) return mapped;

    const { rows: ownerRows } = await queryDb(
      `SELECT id, username, full_name FROM app_users WHERE id = ANY($1::uuid[])`,
      [idList]
    );
    const ownerMap = new Map(ownerRows.map((u) => [String(u.id), u]));

    return mapped.map((item) => {
      const lookupId = isUuid(item.owner_id) ? item.owner_id : (isUuid(item.user_id) ? item.user_id : '');
      const owner = ownerMap.get(String(lookupId));
      if (!owner) return item;
      return {
        ...item,
        owner_id: item.owner_id || String(owner.id),
        owner_name: item.owner_name || sanitizeText(owner.full_name, 160),
        owner_username: item.owner_username || sanitizeText(owner.username, 80).toLowerCase(),
      };
    });
  } catch (error) {
    if (fallbackToMemory(error)) return [...memoryAchievements];
    throw error;
  }
}

async function createAchievement(input, actor) {
  const payload = {
    id: randomUUID(),
    type: input.type,
    title: sanitizeText(input.title, 180),
    event_date: toIsoDateString(input.event_date),
    details: {
      ...sanitizeAchievementDetails(input.details || {}),
      department: normalizeDepartment(actor?.department) || '',
      owner_id: actor?.id || '',
      owner_role: actor?.role || 'faculty',
      owner_name: sanitizeText(actor?.name, 160),
      owner_username: sanitizeText(actor?.username, 80).toLowerCase(),
    },
    user_id: actor?.id || null,
    created_at: new Date().toISOString(),
  };

  if (useMemoryStore) {
    memoryAchievements.push(payload);
    return payload;
  }

  try {
    await ensureAchievementsSchemaEnhancements();
    const useUserIdColumn = achievementsUserIdSupported;
    const sql = useUserIdColumn
      ? `
      INSERT INTO achievements (type, title, event_date, details, user_id)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      RETURNING id, type, title, event_date, details, created_at, user_id
      `
      : `
      INSERT INTO achievements (type, title, event_date, details)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, type, title, event_date, details, created_at, NULL::uuid AS user_id
      `;
    const params = useUserIdColumn
      ? [payload.type, payload.title, payload.event_date, JSON.stringify(payload.details), payload.user_id]
      : [payload.type, payload.title, payload.event_date, JSON.stringify(payload.details)];
    const { rows } = await queryDb(sql, params);
    const row = rows[0];
    return {
      ...row,
      event_date: toIsoDateString(row.event_date),
      created_at: new Date(row.created_at).toISOString(),
    };
  } catch (error) {
    if (fallbackToMemory(error)) {
      memoryAchievements.push(payload);
      return payload;
    }
    throw error;
  }
}

async function findAuthUser(identifier) {
  await ensureAuthSchemaEnhancements();
  if (!pool) {
    throw new Error('Database is not configured for authentication');
  }

  const sql = `
    SELECT id, username, email, full_name, role, password_hash, is_active, department
    FROM app_users
    WHERE lower(username) = $1 OR lower(email) = $1
    LIMIT 1
  `;
  const { rows } = await queryDb(sql, [identifier]);
  if (!rows.length) return null;
  const row = rows[0];
  if (row.is_active === false) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    name: row.full_name,
    department: normalizeDepartment(row.department),
    passwordHash: row.password_hash,
  };
}

function canManageRole(actorRole, targetRole) {
  if (actorRole === 'principal') return ['faculty', 'hod', 'principal'].includes(targetRole);
  if (actorRole === 'hod') return targetRole === 'faculty';
  return false;
}

async function listManagedUsers(actor) {
  await ensureAuthSchemaEnhancements();
  const sql =
    actor.role === 'principal'
      ? `
        SELECT id, username, email, full_name, role, department, is_active, created_at
        FROM app_users
        ORDER BY created_at DESC
      `
      : `
        SELECT id, username, email, full_name, role, department, is_active, created_at
        FROM app_users
        WHERE role = 'faculty' AND department = $1
        ORDER BY created_at DESC
      `;

  const params = actor.role === 'principal' ? [] : [actor.department || ''];
  const { rows } = await queryDb(sql, params);
  return rows;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department || '',
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
}

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60 * 1000,
  });
}

function authRequired(req, res, next) {
  const token = req.cookies?.auth_token;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, jwtSecret);
    return next();
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
}

function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have access to this resource' });
    }
    return next();
  };
}

app.post('/api/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const username = sanitizeText(req.body?.username, 120).toLowerCase();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    return res.status(400).json({ message: 'Username/email and password are required' });
  }

  try {
    const user = await findAuthUser(username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      user: { id: user.id, username: user.username, email: user.email, role: user.role, name: user.name, department: user.department || '' },
      redirect: `#${user.role}-dashboard`,
    });
  } catch (error) {
    if (isAuthSetupError(error)) {
      return res.status(500).json({
        message: 'Authentication DB is not initialized. Run: npm.cmd run auth:init, then create users.',
      });
    }
    return res.status(500).json({ message: 'Authentication service failed. Please contact admin.' });
  }
}));

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.json({ ok: true });
});

app.get('/api/auth/me', authRequired, (req, res) => {
  return res.json({ user: req.user });
});

app.get('/api/meta/options', authRequired, asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  return res.json({
    academic_years: getAcademicYears(),
    default_academic_year: buildAcademicYearLabel(new Date().getFullYear()),
    departments: DEPARTMENTS,
    default_department: actor.department || 'CSE(DS)',
  });
}));

app.get('/api/profile', authRequired, asyncHandler(async (req, res) => {
  try {
    const { rows } = await queryDb(
      `SELECT id, username, email, full_name, role, department, is_active, created_at
       FROM app_users
       WHERE id = $1
       LIMIT 1`,
      [req.user.sub]
    );
    if (rows.length) {
      return res.json({ profile: rows[0] });
    }
  } catch (error) {
    if (!isAuthSetupError(error)) throw error;
  }

  return res.json({
    profile: {
      id: req.user.sub,
      username: '',
      email: req.user.email || '',
      full_name: req.user.name || '',
      role: req.user.role || '',
      department: req.user.department || '',
      is_active: true,
      created_at: null,
    },
  });
}));

app.get('/api/admin/profile', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  await ensureAuthSchemaEnhancements();
  const { rows } = await queryDb(
    `SELECT id, username, email, full_name, role, department, is_active, created_at
     FROM app_users
     WHERE id = $1
     LIMIT 1`,
    [req.user.sub]
  );
  if (!rows.length) return res.status(404).json({ message: 'Profile not found' });
  return res.json({ profile: rows[0] });
}));

app.get('/api/admin/users', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  if (actor.role === 'hod' && !actor.department) {
    return res.status(400).json({ message: 'HOD department is not configured' });
  }
  const users = await listManagedUsers(actor);
  return res.json({ users });
}));

app.get('/api/admin/users/removed', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  await ensureAuthSchemaEnhancements();

  const sql = actor.role === 'principal'
    ? `SELECT id, username, email, full_name, role, department, is_active, created_at
       FROM app_users
       WHERE is_active = FALSE
       ORDER BY created_at DESC`
    : `SELECT id, username, email, full_name, role, department, is_active, created_at
       FROM app_users
       WHERE is_active = FALSE AND role = 'faculty' AND department = $1
       ORDER BY created_at DESC`;
  const params = actor.role === 'principal' ? [] : [actor.department];
  const { rows } = await queryDb(sql, params);
  return res.json({ users: rows });
}));

app.post('/api/admin/users/single', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const actorRole = actor.role;
  const username = sanitizeText(req.body?.username, 80).toLowerCase();
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  const fullName = sanitizeText(req.body?.full_name || req.body?.name, 160);
  const password = String(req.body?.password || '');
  const requestedRole = sanitizeText(req.body?.role, 20).toLowerCase() || 'faculty';
  const requestedDepartment = normalizeDepartment(req.body?.department);
  const department = actorRole === 'hod'
    ? actor.department
    : (requestedDepartment || 'CSE(DS)');
  const role = actorRole === 'hod' ? 'faculty' : requestedRole;

  if (!username || !email || !fullName || !password) {
    return res.status(400).json({ message: 'username, email, full_name, and password are required' });
  }
  if (actorRole === 'hod' && !actor.department) {
    return res.status(400).json({ message: 'HOD department is not configured' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!canManageRole(actorRole, role)) {
    return res.status(403).json({ message: 'You cannot create this role' });
  }
  if (!department) {
    return res.status(400).json({ message: 'Department is required for user creation' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await queryDb(
      `INSERT INTO app_users (username, email, full_name, role, department, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, username, email, full_name, role, department, is_active, created_at`,
      [username, email, fullName, role, department, passwordHash]
    );
    return res.status(201).json({ user: rows[0] });
  } catch (error) {
    if (String(error.code) === '23505') {
      return res.status(409).json({ message: 'Username or email already exists' });
    }
    throw error;
  }
}));

app.post('/api/admin/users/bulk', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const actorRole = actor.role;
  const users = Array.isArray(req.body?.users) ? req.body.users : [];
  if (!users.length) {
    return res.status(400).json({ message: 'users array is required' });
  }
  if (users.length > 200) {
    return res.status(400).json({ message: 'Maximum 200 users per bulk request' });
  }
  if (actorRole === 'hod' && !actor.department) {
    return res.status(400).json({ message: 'HOD department is not configured' });
  }

  let created = 0;
  let skipped = 0;
  const errors = [];
  const candidates = [];
  const seenUsername = new Set();
  const seenEmail = new Set();

  users.forEach((raw, index) => {
    const row = Number(raw?.row_number) > 0 ? Number(raw.row_number) : index + 2;
    const username = sanitizeText(raw?.username, 80).toLowerCase();
    const email = sanitizeText(raw?.email, 160).toLowerCase();
    const fullName = sanitizeText(raw?.full_name || raw?.name, 160);
    const password = String(raw?.password || '');
    const requestedRole = sanitizeText(raw?.role, 20).toLowerCase() || 'faculty';
    const requestedDepartment = normalizeDepartment(raw?.department);
    const department = actorRole === 'hod'
      ? actor.department
      : (requestedDepartment || 'CSE(DS)');
    const role = actorRole === 'hod' ? 'faculty' : requestedRole;

    if (!username || !email || !fullName || !password) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Missing required fields' });
      return;
    }
    if (password.length < 8) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Password must be at least 8 characters' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Invalid email format' });
      return;
    }
    if (!canManageRole(actorRole, role)) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Insufficient access for requested role' });
      return;
    }
    if (!department) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Department is required' });
      return;
    }
    if (seenUsername.has(username)) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Duplicate username in upload file' });
      return;
    }
    if (seenEmail.has(email)) {
      skipped += 1;
      errors.push({ row, username, email, reason: 'Duplicate email in upload file' });
      return;
    }

    seenUsername.add(username);
    seenEmail.add(email);
    candidates.push({ row, username, email, fullName, password, role, department });
  });

  if (candidates.length) {
    const usernames = candidates.map((u) => u.username);
    const emails = candidates.map((u) => u.email);
    const { rows: existingRows } = await queryDb(
      `SELECT lower(username) AS username, lower(email) AS email
       FROM app_users
       WHERE lower(username) = ANY($1::text[]) OR lower(email) = ANY($2::text[])`,
      [usernames, emails]
    );
    const existingUsernames = new Set(existingRows.map((r) => String(r.username || '').toLowerCase()).filter(Boolean));
    const existingEmails = new Set(existingRows.map((r) => String(r.email || '').toLowerCase()).filter(Boolean));

    for (const user of candidates) {
      if (existingUsernames.has(user.username) || existingEmails.has(user.email)) {
        skipped += 1;
        errors.push({ row: user.row, username: user.username, email: user.email, reason: 'Username/email already exists' });
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 12);
      try {
        await queryDb(
          `INSERT INTO app_users (username, email, full_name, role, department, password_hash, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
          [user.username, user.email, user.fullName, user.role, user.department, passwordHash]
        );
        created += 1;
      } catch (error) {
        skipped += 1;
        errors.push({ row: user.row, username: user.username, email: user.email, reason: String(error.code) === '23505' ? 'Username/email already exists' : 'Insert failed' });
      }
    }
  }

  return res.status(201).json({ created, skipped, errors });
}));

app.post('/api/admin/users/password-reset', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const actorRole = actor.role;
  const username = sanitizeText(req.body?.username, 80).toLowerCase();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' });
  }
  if (actorRole === 'hod' && !actor.department) {
    return res.status(400).json({ message: 'HOD department is not configured' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  const { rows: existingRows } = await queryDb(
    `SELECT id, username, role, department
     FROM app_users
     WHERE lower(username) = $1
     LIMIT 1`,
    [username]
  );
  if (!existingRows.length) {
    return res.status(404).json({ message: 'User not found' });
  }

  const target = existingRows[0];
  if (!canManageRole(actorRole, target.role)) {
    return res.status(403).json({ message: 'You cannot update this user' });
  }
  const targetDepartment = normalizeDepartment(target.department) || actor.department;
  if (actorRole === 'hod' && targetDepartment !== actor.department) {
    return res.status(403).json({ message: 'You can update password for your department users only' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await queryDb(
    `UPDATE app_users SET password_hash = $1 WHERE id = $2`,
    [passwordHash, target.id]
  );

  return res.json({ ok: true, username: target.username });
}));

app.post('/api/admin/users/remove', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const actorRole = actor.role;
  const username = sanitizeText(req.body?.username, 80).toLowerCase();
  if (!username) return res.status(400).json({ message: 'username is required' });
  if (req.user.username && username === String(req.user.username).toLowerCase()) {
    return res.status(400).json({ message: 'You cannot remove your own account' });
  }

  const { rows: existingRows } = await queryDb(
    `SELECT id, username, role, department, is_active
     FROM app_users
     WHERE lower(username) = $1
     LIMIT 1`,
    [username]
  );
  if (!existingRows.length) return res.status(404).json({ message: 'User not found' });
  const target = existingRows[0];
  if (!canManageRole(actorRole, target.role)) {
    return res.status(403).json({ message: 'You cannot remove this user' });
  }
  if (actorRole === 'principal' && !['faculty', 'hod'].includes(target.role)) {
    return res.status(403).json({ message: 'Principal can remove faculty and HOD users only' });
  }
  if (actorRole === 'hod' && normalizeDepartment(target.department) !== actor.department) {
    return res.status(403).json({ message: 'You can remove faculty from your department only' });
  }

  await queryDb(
    `UPDATE app_users
     SET is_active = FALSE
     WHERE id = $1`,
    [target.id]
  );
  return res.json({ ok: true, username: target.username });
}));

app.post('/api/admin/users/update-by-username', authRequired, roleRequired('principal'), asyncHandler(async (req, res) => {
  const username = sanitizeText(req.body?.username, 80).toLowerCase();
  const password = String(req.body?.password || '');
  const nextRole = sanitizeText(req.body?.role, 20).toLowerCase();
  const nextDepartment = normalizeDepartment(req.body?.department);

  if (!username || !password || !nextRole || !nextDepartment) {
    return res.status(400).json({ message: 'username, password, role and department are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  if (!['faculty', 'hod'].includes(nextRole)) {
    return res.status(403).json({ message: 'Principal can assign only faculty or HOD role here' });
  }

  const { rows: existingRows } = await queryDb(
    `SELECT id, role
     FROM app_users
     WHERE lower(username) = $1
     LIMIT 1`,
    [username]
  );
  if (!existingRows.length) return res.status(404).json({ message: 'User not found' });
  const existing = existingRows[0];
  if (!canManageRole('principal', existing.role)) {
    return res.status(403).json({ message: 'You cannot update this user' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const { rows } = await queryDb(
    `UPDATE app_users
     SET role = $1,
         department = $2,
         password_hash = $3
     WHERE id = $4
     RETURNING id, username, email, full_name, role, department, is_active, created_at`,
    [nextRole, nextDepartment, passwordHash, existing.id]
  );
  return res.json({ user: rows[0] });
}));

app.put('/api/admin/users/:id', authRequired, roleRequired('hod', 'principal'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const actorRole = actor.role;
  const targetId = sanitizeText(req.params.id, 64);
  const email = sanitizeText(req.body?.email, 160).toLowerCase();
  const fullName = sanitizeText(req.body?.full_name || req.body?.name, 160);
  const requestedRole = sanitizeText(req.body?.role, 20).toLowerCase();
  const requestedDepartment = normalizeDepartment(req.body?.department);
  const isActive = typeof req.body?.is_active === 'boolean' ? req.body.is_active : null;
  const password = String(req.body?.password || '');
  if (actorRole === 'hod' && !actor.department) {
    return res.status(400).json({ message: 'HOD department is not configured' });
  }

  const { rows: existingRows } = await queryDb(
    `SELECT id, role, department FROM app_users WHERE id = $1 LIMIT 1`,
    [targetId]
  );
  if (!existingRows.length) return res.status(404).json({ message: 'User not found' });
  const existing = existingRows[0];
  if (!canManageRole(actorRole, existing.role)) {
    return res.status(403).json({ message: 'You cannot update this user' });
  }
  const existingDepartment = normalizeDepartment(existing.department) || actor.department;
  if (actorRole === 'hod' && existingDepartment !== actor.department) {
    return res.status(403).json({ message: 'You can update users from your department only' });
  }

  const nextRole = actorRole === 'hod' ? 'faculty' : (requestedRole || existing.role);
  const nextDepartment = actorRole === 'hod'
    ? actor.department
    : (requestedDepartment || existingDepartment || 'CSE(DS)');
  if (!canManageRole(actorRole, nextRole)) {
    return res.status(403).json({ message: 'You cannot assign this role' });
  }

  const updates = [];
  const values = [];
  let idx = 1;
  if (email) {
    updates.push(`email = $${idx++}`);
    values.push(email);
  }
  if (fullName) {
    updates.push(`full_name = $${idx++}`);
    values.push(fullName);
  }
  if (nextRole) {
    updates.push(`role = $${idx++}`);
    values.push(nextRole);
  }
  if (nextDepartment) {
    updates.push(`department = $${idx++}`);
    values.push(nextDepartment);
  }
  if (isActive !== null) {
    updates.push(`is_active = $${idx++}`);
    values.push(isActive);
  }
  if (password) {
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    const passwordHash = await bcrypt.hash(password, 12);
    updates.push(`password_hash = $${idx++}`);
    values.push(passwordHash);
  }

  if (!updates.length) {
    return res.status(400).json({ message: 'No valid fields provided for update' });
  }

  values.push(targetId);
  try {
    const { rows } = await queryDb(
      `UPDATE app_users
       SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, username, email, full_name, role, department, is_active, created_at`,
      values
    );
    return res.json({ user: rows[0] });
  } catch (error) {
    if (String(error.code) === '23505') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    throw error;
  }
}));

app.get('/api/faculty-dashboard/summary', authRequired, roleRequired('faculty'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const academicYear = sanitizeText(req.query?.academic_year, 16) || buildAcademicYearLabel(new Date().getFullYear());
  const items = await listAchievements({ role: 'faculty', userId: actor.id, academicYear });
  const stats = toStats(items);
  const recent = [...items].sort((a, b) => b.event_date.localeCompare(a.event_date)).slice(0, 5).map(withDisplayDate);
  res.json({
    stats,
    recent,
    source: useMemoryStore ? 'memory' : 'postgres',
    filters: { academic_year: academicYear, department: actor.department || '' },
  });
}));

app.get('/api/hod-dashboard/summary', authRequired, roleRequired('hod'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const academicYear = sanitizeText(req.query?.academic_year, 16) || buildAcademicYearLabel(new Date().getFullYear());
  const items = await listAchievements({ role: 'hod', department: actor.department, academicYear });
  const stats = toStats(items);
  res.json({
    headline: 'Department Performance Overview',
    stats,
    facultyCount: 42,
    complianceRate: 91,
    filters: {
      academic_year: academicYear,
      department: actor.department || 'CSE(DS)',
    },
  });
}));

app.get('/api/principal-dashboard/summary', authRequired, roleRequired('principal'), asyncHandler(async (req, res) => {
  const academicYear = sanitizeText(req.query?.academic_year, 16) || buildAcademicYearLabel(new Date().getFullYear());
  const department = normalizeDepartment(req.query?.department) || '';
  const items = await listAchievements({ role: 'principal', department, academicYear });
  const stats = toStats(items);
  res.json({
    headline: 'Institution Performance Snapshot',
    stats,
    departments: 8,
    accreditationScore: 4.3,
    filters: {
      academic_year: academicYear,
      department,
    },
  });
}));

app.get('/api/achievements', authRequired, asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const academicYear = sanitizeText(req.query?.academic_year, 16) || '';
  const type = sanitizeText(req.query?.type, 32).toLowerCase();
  const requestedDepartment = normalizeDepartment(req.query?.department);
  const scopedDepartment = actor.role === 'principal'
    ? requestedDepartment
    : (actor.role === 'hod' ? actor.department : '');
  const items = await listAchievements({
    role: actor.role,
    userId: actor.id,
    department: scopedDepartment,
    academicYear,
    type,
  });
  res.json({ items: items.slice(0, 100), source: useMemoryStore ? 'memory' : 'postgres' });
}));

app.post('/api/achievements', authRequired, roleRequired('faculty'), asyncHandler(async (req, res) => {
  const actor = await getActorContext(req.user);
  const { type, title, event_date, details = {} } = req.body || {};

  if (!type || !title || !event_date) {
    return res.status(400).json({ message: 'type, title, and event_date are required' });
  }

  if (!typeToCategory[type]) {
    return res.status(400).json({ message: 'Unsupported type' });
  }

  try {
    const item = await createAchievement({
      type: sanitizeText(type, 24),
      title,
      event_date,
      details,
    }, actor);
    return res.status(201).json({ item, source: useMemoryStore ? 'memory' : 'postgres' });
  } catch (error) {
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('attachment')) {
      return res.status(400).json({ message: String(error.message) });
    }
    throw error;
  }
}));

app.get('/api/setup-principal', asyncHandler(async (_req, res) => {
  if (String(process.env.ALLOW_SETUP || '').toLowerCase() !== 'true') {
    return res.status(403).json({ message: 'Setup is disabled' });
  }

  await ensureAuthSchemaEnhancements();

  const { rows: existing } = await queryDb(
    `SELECT id FROM app_users WHERE role = 'principal' LIMIT 1`
  );
  if (existing.length) {
    return res.json({ message: 'Principal already exists' });
  }

  const username = 'principal';
  const email = 'principal@college.com';
  const fullName = 'Principal Admin';
  const role = 'principal';
  const department = 'CSE(DS)';
  const plainPassword = 'Admin@123';
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  await queryDb(
    `INSERT INTO app_users (username, email, full_name, role, department, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, TRUE)
     ON CONFLICT (username) DO NOTHING`,
    [username, email, fullName, role, department, passwordHash]
  );

  const { rows: verify } = await queryDb(
    `SELECT id FROM app_users WHERE username = $1 AND role = 'principal' LIMIT 1`,
    [username]
  );
  if (!verify.length) {
    return res.json({ message: 'Principal already exists' });
  }

  return res.json({
    message: 'Principal created successfully',
    login: { username, password: plainPassword },
  });
}));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, _req, res, _next) => {
  if (String(err?.type || '').toLowerCase() === 'entity.too.large') {
    return res.status(413).json({ message: 'Uploaded payload is too large. Maximum allowed size is 10MB.' });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

async function startServer() {
  await initializeDatabaseSchema();
  app.listen(port, () => {
    console.log(`Faculty Tracker running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
