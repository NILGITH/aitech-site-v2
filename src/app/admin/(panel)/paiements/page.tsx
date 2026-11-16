import { encryptionReady, decrypt, mask, type PaymentRow } from '@/lib/payment'
import { formatXof } from '@/lib/format'
import { sessionClient } from '@/lib/supabase'
import PaymentForm, { ManualVerify } from './PaymentForm'

const KIND: Record<string, string> = { order: 'Commande', training: 'Formation', event: 'Événement' }

export default async function Payments() {
  const db = (await sessionClient())!
  const [{ data }, { data: txs }] = await Promise.all([
    db.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
    db.from('payment_transactions').select('*').order('created_at', { ascending: false }).limit(100),
  ])
  const row = (data ?? {}) as Partial<PaymentRow>
  const ready = encryptionReady()
  const state = (m: 'sandbox' | 'live') => ({
    public: row[`${m}_public`] ? mask(row[`${m}_public`]!) : null,
    private: row[`${m}_private_enc`] ? (mask(decrypt(row[`${m}_private_enc`]!)) ?? 'illisible : clé de chiffrement modifiée') : null,
    secret: row[`${m}_secret_enc`] ? (mask(decrypt(row[`${m}_secret_enc`]!)) ?? 'illisible : clé de chiffrement modifiée') : null,
  })
  return (
    <div className="stack" style={{ gap: 28 }}>
      <h1 className="h2">Paiements en ligne (Kkiapay)</h1>
      <p className="muted" style={{ maxWidth: 760 }}>Les clés se trouvent dans votre tableau de bord Kkiapay, rubrique Développeurs. La clé publique sert au formulaire de paiement ; les clés privée et secrète sont chiffrées avant d&apos;être enregistrées et ne sont jamais renvoyées vers le navigateur.</p>
      {(['sandbox', 'live'] as const).filter((m) => { const s = state(m); const v = [s.public, s.private, s.secret].filter(Boolean); return new Set(v).size < v.length }).map((m) => (
        <p key={m} className="warn" role="alert">Attention : plusieurs clés {m === 'live' ? 'de production' : 'sandbox'} se terminent par les mêmes caractères. La même valeur a sans doute été collée dans plusieurs champs ; Kkiapay refusera alors les paiements. Recopiez les trois clés depuis Kkiapay.</p>
      ))}
      {!ready && <p className="warn" role="alert">La clé de chiffrement n&apos;est pas configurée : ajoutez la variable PAYMENT_ENCRYPTION_KEY (au moins 32 caractères) dans Vercel puis redéployez. En attendant, aucune clé ne peut être enregistrée.</p>}
      <PaymentForm ready={ready} enabled={!!row.enabled} mode={row.mode === 'live' ? 'live' : 'sandbox'} sandbox={state('sandbox')} live={state('live')} updatedAt={row.updated_at ?? null} />
      <ManualVerify />
      <div className="stack" style={{ gap: 12 }}>
        <h2 className="h3">Derniers paiements vérifiés</h2>
        {(txs ?? []).length === 0 ? <p className="muted">Aucun paiement en ligne pour le moment.</p> : (
          <div className="scroll"><table className="table">
            <thead><tr><th>Date</th><th>Type</th><th>Référence</th><th>Montant</th><th>Mode</th><th>Transaction Kkiapay</th></tr></thead>
            <tbody>{(txs ?? []).map((t) => (
              <tr key={t.transaction_id}><td>{new Date(t.created_at).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}</td><td>{KIND[t.kind]}</td><td><strong>{t.reference}</strong></td><td>{formatXof(t.amount_xof)}</td><td>{t.mode === 'live' ? 'Production' : 'Sandbox'}</td><td>{t.transaction_id}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
