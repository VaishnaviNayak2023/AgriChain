import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import request from 'supertest'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/db/database.js'

let db
let app

before(() => {
  db = createDatabase(':memory:')
  app = createApp(db, { secureCookies: false })
})

after(() => db.close())

test('registration, duplicate protection, session lookup, login, and logout', async () => {
  const client = request.agent(app)
  const registration = {
    fullName: 'Maya Farmer',
    email: 'Maya@example.com',
    phone: '',
    role: 'farmer',
    password: 'harvest-strong-pass-92',
    termsAccepted: true,
  }

  const missingConsent = await request(app).post('/api/auth/register').send({ ...registration, termsAccepted: false })
  assert.equal(missingConsent.status, 400)

  const created = await client.post('/api/auth/register').send(registration)
  assert.equal(created.status, 201)
  assert.equal(created.body.user.email, 'maya@example.com')
  assert.equal(created.body.user.role, 'farmer')
  assert.equal('password_hash' in created.body.user, false)
  assert.ok(created.headers['set-cookie']?.some((cookie) => cookie.startsWith('agrichain_session=')))

  const session = await client.get('/api/auth/me')
  assert.equal(session.status, 200)
  assert.equal(session.body.user.fullName, 'Maya Farmer')

  const duplicate = await request(app).post('/api/auth/register').send(registration)
  assert.equal(duplicate.status, 409)

  await client.post('/api/auth/logout').send({}).expect(200)
  await client.get('/api/auth/me').expect(401)

  const badLogin = await request(app).post('/api/auth/login').send({ email: registration.email, password: 'incorrect-password' })
  assert.equal(badLogin.status, 401)

  const login = await client.post('/api/auth/login').send({ email: registration.email, password: registration.password, rememberMe: false })
  assert.equal(login.status, 200)
  assert.equal(login.body.user.id, created.body.user.id)
  await client.get('/api/auth/me').expect(200)
})
