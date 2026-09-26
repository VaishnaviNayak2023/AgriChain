import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { createApp } from './app.js'
import { createDatabase } from './db/database.js'

const port = Number(process.env.PORT ?? 4000)
const databasePath = process.env.DATABASE_PATH ?? resolve('data/agrichain.sqlite')
const db = createDatabase(databasePath)
const server = createServer(createApp(db))

server.listen(port, '127.0.0.1', () => {
  console.log(`AgriChain API listening on http://127.0.0.1:${port}`)
  console.log(`SQLite database: ${databasePath}`)
})

function shutdown() {
  server.close(() => {
    db.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
