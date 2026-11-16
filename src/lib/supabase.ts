import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anon)

/** Lecture publique (contenus publiés) et envois anonymes (devis, sondage). */
export function publicClient() {
  if (!url || !anon) return null
  return createClient(url, anon, { auth: { persistSession: false } })
}

/** Client lié à la session de l'administrateur connecté (cookies). */
export async function sessionClient() {
  if (!url || !anon) return null
  const store = await cookies()
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          // appelé depuis un composant serveur : les cookies ne sont pas modifiables ici
        }
      },
    },
  })
}
