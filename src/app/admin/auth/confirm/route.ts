import { NextResponse } from 'next/server'
import { sessionClient } from '@/lib/supabase'

/** Retour des liens envoyés par Supabase (réinitialisation du mot de passe) : ouvre la session puis redirige. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') ?? '/admin'
  const safeNext = next.startsWith('/admin') ? next : '/admin'
  const db = await sessionClient()
  const code = url.searchParams.get('code'), tokenHash = url.searchParams.get('token_hash'), type = url.searchParams.get('type')
  if (db && code) {
    const { error } = await db.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
  }
  if (db && tokenHash && type === 'recovery') {
    const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin))
  }
  return NextResponse.redirect(new URL('/admin/mot-de-passe?expire=1', url.origin))
}
