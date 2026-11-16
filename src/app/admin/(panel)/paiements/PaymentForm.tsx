'use client'
import { useActionState } from 'react'
import { savePaymentSettings, type FormState } from '@/app/actions'

type KeyState = { public: string | null; private: string | null; secret: string | null }
const init: FormState = { ok: false, message: '' }

function Keys({ m, label, s, disabled }: { m: 'sandbox' | 'live'; label: string; s: KeyState; disabled: boolean }) {
  const st = (v: string | null) => (v ? <>enregistrée <b>{v}</b></> : 'non renseignée')
  return (
    <fieldset className={m} disabled={disabled}>
      <legend>{label}</legend>
      <div className="field"><label htmlFor={`${m}-pub`}>Clé publique</label><input id={`${m}-pub`} name={`${m}_public`} autoComplete="off" spellCheck={false} placeholder={s.public ? 'Laisser vide pour conserver' : 'Coller la clé publique'} /><span className="keystate">Actuellement : {st(s.public)}</span></div>
      <div className="field"><label htmlFor={`${m}-priv`}>Clé privée</label><input id={`${m}-priv`} name={`${m}_private`} type="password" autoComplete="new-password" spellCheck={false} placeholder={s.private ? 'Laisser vide pour conserver' : 'Coller la clé privée'} /><span className="keystate">Actuellement : {st(s.private)}</span></div>
      <div className="field"><label htmlFor={`${m}-sec`}>Clé secrète</label><input id={`${m}-sec`} name={`${m}_secret`} type="password" autoComplete="new-password" spellCheck={false} placeholder={s.secret ? 'Laisser vide pour conserver' : 'Coller la clé secrète'} /><span className="keystate">Actuellement : {st(s.secret)}</span></div>
      <label className="row" style={{ gap: 10, fontSize: 15 }}><input type="checkbox" name={`${m}_clear`} /> Effacer les clés {m === 'live' ? 'de production' : 'sandbox'}</label>
    </fieldset>
  )
}

export default function PaymentForm({ ready, enabled, mode, sandbox, live, updatedAt }: { ready: boolean; enabled: boolean; mode: 'sandbox' | 'live'; sandbox: KeyState; live: KeyState; updatedAt: string | null }) {
  const [state, action, pending] = useActionState(savePaymentSettings, init)
  return (
    <form action={action} className="stack" style={{ gap: 24 }}>
      <fieldset className="stack" style={{ gap: 14, border: 0, padding: 0, margin: 0 }} disabled={!ready}>
        <legend className="h3" style={{ marginBottom: 10 }}>Environnement utilisé par le site</legend>
        <div className="modepick">
          <label><input type="radio" name="mode" value="sandbox" defaultChecked={mode === 'sandbox'} /> Sandbox (tests, aucun débit réel)</label>
          <label><input type="radio" name="mode" value="live" defaultChecked={mode === 'live'} /> Production (paiements réels)</label>
        </div>
        <label className="row" style={{ gap: 10, fontWeight: 600 }}><input type="checkbox" name="enabled" defaultChecked={enabled} style={{ width: 22, height: 22 }} /> Activer le paiement en ligne sur le site</label>
      </fieldset>
      <div className="keys">
        <Keys m="sandbox" label="Clés sandbox" s={sandbox} disabled={!ready} />
        <Keys m="live" label="Clés de production" s={live} disabled={!ready} />
      </div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <div className="row">
        <button className="btn" type="submit" disabled={pending || !ready}>{pending ? 'Enregistrement…' : 'Enregistrer les réglages'}</button>
        {updatedAt && <span className="muted">Dernière modification : {new Date(updatedAt).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}</span>}
      </div>
    </form>
  )
}
