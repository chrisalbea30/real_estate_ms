import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '@/lib/env'

// AES-256-GCM for the stored third-party logins. Output: v1:<iv>:<tag>:<ciphertext> (base64).
function key(): Buffer {
  if (!env.credentialsKey) throw new Error('CREDENTIALS_ENCRYPTION_KEY is not set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"')
  const k = Buffer.from(env.credentialsKey, 'base64')
  if (k.length !== 32) throw new Error('CREDENTIALS_ENCRYPTION_KEY must be 32 bytes, base64 encoded')
  return k
}

export function isEncryptionConfigured() {
  try {
    key()
    return true
  } catch {
    return false
  }
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

export function decryptSecret(payload: string): string {
  const [v, ivB, tagB, ctB] = payload.split(':')
  if (v !== 'v1' || !ivB || !tagB || !ctB) throw new Error('Unrecognised secret format')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]).toString('utf8')
}
