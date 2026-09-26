import { mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import multer from 'multer'

export const UPLOAD_DIR = resolve(import.meta.dirname, '../../data/uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

const extensionByMime = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
])

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_request, file, callback) => callback(null, `${randomUUID()}.${extensionByMime.get(file.mimetype)}`),
})

export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!extensionByMime.has(file.mimetype)) return callback(new Error('Upload a JPG, PNG, WebP, or AVIF image.'))
    return callback(null, true)
  },
})

export function resolveUploadedImage(imageUrl) {
  const match = /^\/uploads\/([0-9a-f-]+\.(?:jpg|png|webp|avif))$/i.exec(imageUrl ?? '')
  return match ? resolve(UPLOAD_DIR, match[1]) : null
}
