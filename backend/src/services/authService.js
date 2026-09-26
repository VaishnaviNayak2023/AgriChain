import { createHash, randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

const PASSWORD_COST = 12
const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export function createAuthService(db) {
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?')
  const findPublicUser = db.prepare(`
    SELECT id, full_name AS fullName, email, phone, role,
      farm_name AS farmName, farm_location AS farmLocation,
      latitude, longitude, created_at AS createdAt
    FROM users WHERE id = ?
  `)
  const dummyHash = bcrypt.hash(randomUUID(), PASSWORD_COST)

  return {
    async register({ fullName, email, phone, role, password, farmName = '', farmLocation = '' }) {
      const passwordHash = await bcrypt.hash(password, PASSWORD_COST)
      const id = randomUUID()
      const now = new Date().toISOString()
      db.prepare(`
        INSERT INTO users (id, full_name, email, phone, role, farm_name, farm_location, password_hash, terms_accepted_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, fullName, email, phone, role, farmName, farmLocation, passwordHash, now, now)
      return findPublicUser.get(id)
    },

    async authenticate(email, password) {
      const user = findByEmail.get(email)
      const matches = await bcrypt.compare(password, user?.password_hash ?? await dummyHash)
      return matches && user ? findPublicUser.get(user.id) : null
    },

    createSession(userId, lifetimeMs) {
      const token = randomBytes(32).toString('base64url')
      const now = Date.now()
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now)
      db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(hashToken(token), userId, now + lifetimeMs, new Date(now).toISOString())
      return token
    },

    findUserBySession(token) {
      const session = db.prepare(`
        SELECT users.id FROM sessions
        INNER JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      `).get(hashToken(token), Date.now())
      return session ? findPublicUser.get(session.id) : null
    },

    deleteSession(token) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
    },
  }
}
