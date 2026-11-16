import 'server-only'
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'
import { publicClient } from './supabase'

/**
 * Clés Kkiapay : la clé publique est stockée en clair (elle est destinée au navigateur) ;
 * les clés privée et secrète sont chiffrées en AES-256-GCM avec une clé maîtresse qui n'existe
 * que dans la variable d'environnement PAYMENT_ENCRYPTION_KEY de Vercel, jamais en base.
 */
export type Mode = 'sandbox' | 'live'
export type PaymentRow = {
  enabled: boolean; mode: Mode
  sandbox_public: string | null; sandbox_private_enc: string | null; sandbox_secret_enc: string | null
  live_public: string | null; live_private_enc: string | null; live_secret_enc: string | null
  access_hash: string | null; updated_at: string | null
}
export type Keys = { publicKey: string; privateKey: string; secretKey: string; sandbox: boolean }

function master(): Buffer | null {
  const raw = process.env.PAYMENT_ENCRYPTION_KEY
  if (!raw || raw.length < 32) return null
  return createHash('sha256').update(raw).digest()
}
export const encryptionReady = () => master() !== null

export function encrypt(plain: string): string {
  const key = master()
  if (!key) throw new Error('PAYMENT_ENCRYPTION_KEY manquante')
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64')
}

export function decrypt(blob: string | null): string | null {
  const key = master()
  if (!key || !blob) return null
  try {
    const buf = Buffer.from(blob, 'base64')
    const d = createDecipheriv('aes-256-gcm', key, buf.subarray(0, 12))
    d.setAuthTag(buf.subarray(12, 28))
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8')
  } catch { return null }
}

/** Jeton serveur : prouve à la base que l'appel vient du site (seule son empreinte est stockée). */
export function accessToken(): string | null {
  const key = master()
  return key ? createHmac('sha256', key).update('aitech-payment-db-access').digest('hex') : null
}
export const accessHash = (token: string) => createHash('sha256').update(token).digest('hex')

export const mask = (v: string | null) => (v ? `••••${v.slice(-4)}` : null)

/** Clés de l'environnement actif, déchiffrées côté serveur uniquement. */
export async function activeKeys(): Promise<Keys | null> {
  const token = accessToken()
  const db = publicClient()
  if (!token || !db) return null
  const { data, error } = await db.rpc('payment_private_config', { p_token: token })
  if (error || !data) return null
  const row = data as PaymentRow
  if (!row.enabled) return null
  const m = row.mode
  const publicKey = row[`${m}_public`], privateKey = decrypt(row[`${m}_private_enc`]), secretKey = decrypt(row[`${m}_secret_enc`])
  if (!publicKey || !privateKey || !secretKey) return null
  return { publicKey, privateKey, secretKey, sandbox: m === 'sandbox' }
}

export type KkiapayTx = { status?: string; amount?: number | string; transactionId?: string; reason?: string }

/** Vérifie une transaction auprès de l'API Kkiapay (sandbox ou production). */
export async function verifyTransaction(keys: Keys, transactionId: string): Promise<KkiapayTx | null> {
  const base = keys.sandbox ? 'https://api-sandbox.kkiapay.me' : 'https://api.kkiapay.me'
  try {
    const r = await fetch(`${base}/api/v1/transactions/status`, {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'x-api-key': keys.publicKey, 'x-private-key': keys.privateKey, 'x-secret-key': keys.secretKey },
      body: JSON.stringify({ transactionId }),
    })
    if (!r.ok) return null
    return (await r.json()) as KkiapayTx
  } catch { return null }
}
