import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import Database from 'better-sqlite3'

const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('farmer', 'wholesaler', 'retailer', 'consumer', 'regulator')),
    farm_name TEXT NOT NULL DEFAULT '',
    farm_location TEXT NOT NULL DEFAULT '',
    latitude REAL,
    longitude REAL,
    password_hash TEXT NOT NULL,
    terms_accepted_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);

  CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL UNIQUE,
    farmer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    produce_name TEXT NOT NULL,
    quantity REAL NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL DEFAULT 'kg',
    harvest_date TEXT NOT NULL,
    farm_location TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    freshness_score REAL,
    ai_grade TEXT,
    blockchain_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'in_transit', 'processing', 'rejected')),
    revenue_amount REAL NOT NULL DEFAULT 0 CHECK (revenue_amount >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ai_analyses (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    farmer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freshness_score REAL NOT NULL,
    grade TEXT NOT NULL,
    confidence REAL NOT NULL,
    defects_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blockchain_transactions (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    farmer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_hash TEXT NOT NULL,
    network TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS produce_passports (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL UNIQUE REFERENCES batches(id) ON DELETE CASCADE,
    farmer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS batches_farmer_created_idx ON batches(farmer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS batches_farmer_status_idx ON batches(farmer_id, status);
  CREATE INDEX IF NOT EXISTS batches_farmer_grade_idx ON batches(farmer_id, ai_grade);
  CREATE INDEX IF NOT EXISTS activities_farmer_created_idx ON activities(farmer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS analyses_farmer_created_idx ON ai_analyses(farmer_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS blockchain_batch_idx ON blockchain_transactions(batch_id, created_at DESC);
`

export function createDatabase(filename = process.env.DATABASE_PATH ?? resolve('data/agrichain.sqlite')) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true })
  const db = new Database(filename)
  db.pragma('foreign_keys = ON')
  if (filename !== ':memory:') db.pragma('journal_mode = WAL')
  db.exec(schema)

  const userColumns = new Set(db.pragma('table_info(users)').map(({ name }) => name))
  if (!userColumns.has('farm_name')) db.exec("ALTER TABLE users ADD COLUMN farm_name TEXT NOT NULL DEFAULT ''")
  if (!userColumns.has('farm_location')) db.exec("ALTER TABLE users ADD COLUMN farm_location TEXT NOT NULL DEFAULT ''")
  if (!userColumns.has('latitude')) db.exec('ALTER TABLE users ADD COLUMN latitude REAL')
  if (!userColumns.has('longitude')) db.exec('ALTER TABLE users ADD COLUMN longitude REAL')

  return db
}
