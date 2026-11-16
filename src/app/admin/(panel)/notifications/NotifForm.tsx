'use client'
import { useActionState } from 'react'
import { saveNotificationSettings, sendTestNotification, type FormState } from '@/app/actions'

type N = Record<string, unknown> & { resend: string | null; kapso: string | null }
const init: FormState = { ok: false, message: '' }
const s = (v: unknown) => (v == null ? '' : String(v))

export default function NotifForm({ ready, n }: { ready: boolean; n: N }) {
  const [state, action, pending] = useActionState(saveNotificationSettings, init)
  return (
    <form action={action} className="stack" style={{ gap: 20 }}>
      <fieldset className="stack" style={{ gap: 10, border: 0, padding: 0, margin: 0 }} disabled={!ready}>
        <label className="row" style={{ gap: 10, fontWeight: 600 }}><input type="checkbox" name="notify_client" defaultChecked={n.notify_client !== false} style={{ width: 22, height: 22 }} /> Prévenir les clients (confirmation, paiement, rappels)</label>
        <label className="row" style={{ gap: 10, fontWeight: 600 }}><input type="checkbox" name="notify_admin" defaultChecked={n.notify_admin !== false} style={{ width: 22, height: 22 }} /> Prévenir l&apos;équipe AITECH à chaque nouvelle demande et chaque paiement</label>
      </fieldset>
      <div className="keys">
        <fieldset disabled={!ready}>
          <legend>E-mail (Resend)</legend>
          <label className="row" style={{ gap: 10, fontWeight: 600 }}><input type="checkbox" name="email_enabled" defaultChecked={Boolean(n.email_enabled)} style={{ width: 22, height: 22 }} /> Activer les e-mails</label>
          <div className="field"><label htmlFor="rs-key">Clé API Resend</label><input id="rs-key" name="resend_key" type="password" autoComplete="new-password" spellCheck={false} placeholder={n.resend ? 'Laisser vide pour conserver' : 're_…'} /><span className="keystate">Actuellement : {n.resend ? <>enregistrée <b>{n.resend}</b></> : 'non renseignée'}</span></div>
          <div className="field"><label htmlFor="rs-from">Expéditeur</label><input id="rs-from" name="email_from" defaultValue={s(n.email_from)} placeholder="AITECH <notifications@aitech-ci.com>" /><span className="keystate">Le domaine doit être vérifié dans Resend.</span></div>
          <div className="field"><label htmlFor="rs-reply">Adresse de réponse</label><input id="rs-reply" name="email_reply_to" type="email" defaultValue={s(n.email_reply_to)} placeholder="infos@aitech-ci.com" /></div>
          <div className="field"><label htmlFor="rs-admin">E-mails de l&apos;équipe à prévenir (séparés par des virgules)</label><input id="rs-admin" name="admin_emails" defaultValue={s(n.admin_emails)} placeholder="infos@aitech-ci.com" /></div>
          <label className="row" style={{ gap: 10, fontSize: 15 }}><input type="checkbox" name="resend_clear" /> Effacer la clé Resend</label>
        </fieldset>
        <fieldset disabled={!ready}>
          <legend>WhatsApp (Kapso)</legend>
          <label className="row" style={{ gap: 10, fontWeight: 600 }}><input type="checkbox" name="whatsapp_enabled" defaultChecked={Boolean(n.whatsapp_enabled)} style={{ width: 22, height: 22 }} /> Activer WhatsApp</label>
          <div className="field"><label htmlFor="kp-key">Clé API Kapso</label><input id="kp-key" name="kapso_key" type="password" autoComplete="new-password" spellCheck={false} placeholder={n.kapso ? 'Laisser vide pour conserver' : 'Clé du projet Kapso'} /><span className="keystate">Actuellement : {n.kapso ? <>enregistrée <b>{n.kapso}</b></> : 'non renseignée'}</span></div>
          <div className="field"><label htmlFor="kp-pn">Identifiant du numéro WhatsApp (Phone number ID)</label><input id="kp-pn" name="kapso_phone_number_id" defaultValue={s(n.kapso_phone_number_id)} inputMode="numeric" /></div>
          <div className="two">
            <div className="field"><label htmlFor="kp-tpl">Nom du modèle approuvé</label><input id="kp-tpl" name="wa_template" defaultValue={s(n.wa_template)} placeholder="aitech_notification" /></div>
            <div className="field"><label htmlFor="kp-lang">Langue du modèle</label><input id="kp-lang" name="wa_template_lang" defaultValue={s(n.wa_template_lang) || 'fr'} /></div>
          </div>
          <span className="keystate">Modèle de catégorie « Utilité » avec deux variables : {'{{1}}'} le nom, {'{{2}}'} le message. Sans modèle, WhatsApp n&apos;accepte les messages que dans les 24 h suivant un message du client.</span>
          <div className="field"><label htmlFor="kp-admin">Numéros WhatsApp de l&apos;équipe (séparés par des virgules)</label><input id="kp-admin" name="admin_whatsapp" defaultValue={s(n.admin_whatsapp)} placeholder="+225 07 48 96 02 31" /></div>
          <label className="row" style={{ gap: 10, fontSize: 15 }}><input type="checkbox" name="kapso_clear" /> Effacer la clé Kapso</label>
        </fieldset>
      </div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending || !ready} style={{ alignSelf: 'flex-start' }}>{pending ? 'Enregistrement…' : 'Enregistrer les réglages'}</button>
    </form>
  )
}

export function TestForm() {
  const [state, action, pending] = useActionState(sendTestNotification, init)
  return (
    <form action={action} className="form" style={{ maxWidth: 760 }}>
      <h2 className="h3">Envoyer un message de test</h2>
      <div className="two">
        <div className="field"><label htmlFor="t-ch">Canal</label><select id="t-ch" name="channel" defaultValue="email"><option value="email">E-mail</option><option value="whatsapp">WhatsApp</option></select></div>
        <div className="field"><label htmlFor="t-to">Destinataire (e-mail ou numéro)</label><input id="t-to" name="to" required /></div>
      </div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Envoi…' : 'Envoyer le test'}</button>
    </form>
  )
}
