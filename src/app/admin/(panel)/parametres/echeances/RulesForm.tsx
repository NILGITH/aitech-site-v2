'use client'
import { useActionState } from 'react'
import { saveInstallmentRules, type FormState } from '@/app/actions'

export type Rule = { kind: string; enabled: boolean; max_installments: number; min_amount_xof: number; deposit_percent: number; interval_days: number; deadline_days: number | null }
const LABEL: Record<string, [string, string]> = {
  order: ['Boutique', 'Commandes de produits et de services.'],
  training: ['Formations', 'Le solde doit être réglé avant la date de début de la formation (si elle est renseignée dans la fiche).'],
  event: ['Événements', 'Le solde doit être réglé avant la date de l’événement.'],
}
const init: FormState = { ok: false, message: '' }

export default function RulesForm({ rules }: { rules: Record<string, Rule> }) {
  const [state, action, pending] = useActionState(saveInstallmentRules, init)
  return (
    <form action={action} className="stack" style={{ gap: 20 }}>
      <div className="keys">
        {(['order', 'training', 'event'] as const).map((k) => {
          const r = rules[k] ?? { enabled: false, max_installments: 3, min_amount_xof: 50000, deposit_percent: 40, interval_days: 30, deadline_days: k === 'order' ? null : 3 }
          return (
            <fieldset key={k}>
              <legend>{LABEL[k][0]}</legend>
              <p className="muted" style={{ fontSize: 15 }}>{LABEL[k][1]}</p>
              <label className="row" style={{ gap: 10, fontWeight: 600 }}><input type="checkbox" name={`${k}_enabled`} defaultChecked={r.enabled} style={{ width: 22, height: 22 }} /> Autoriser le paiement en plusieurs fois</label>
              <div className="two">
                <div className="field"><label htmlFor={`${k}-max`}>Nombre maximal de versements</label><input id={`${k}-max`} name={`${k}_max`} type="number" min={2} max={12} defaultValue={r.max_installments} /></div>
                <div className="field"><label htmlFor={`${k}-min`}>Montant minimal (FCFA)</label><input id={`${k}-min`} name={`${k}_min`} type="number" min={0} step={1000} defaultValue={r.min_amount_xof} /></div>
              </div>
              <div className="two">
                <div className="field"><label htmlFor={`${k}-dep`}>Premier versement (% du total)</label><input id={`${k}-dep`} name={`${k}_deposit`} type="number" min={1} max={99} defaultValue={r.deposit_percent} /></div>
                <div className="field"><label htmlFor={`${k}-int`}>Intervalle entre versements (jours)</label><input id={`${k}-int`} name={`${k}_interval`} type="number" min={1} max={180} defaultValue={r.interval_days} /></div>
              </div>
              {k !== 'order' && (
                <div className="field"><label htmlFor={`${k}-dl`}>Solde exigé au plus tard (jours avant le début)</label><input id={`${k}-dl`} name={`${k}_deadline`} type="number" min={0} max={90} defaultValue={r.deadline_days ?? 0} /></div>
              )}
            </fieldset>
          )
        })}
      </div>
      {state.message && <p role="status" className={state.ok ? 'notice' : 'notice err'}>{state.message}</p>}
      <button className="btn" type="submit" disabled={pending} style={{ alignSelf: 'flex-start' }}>{pending ? 'Enregistrement…' : 'Enregistrer les règles'}</button>
    </form>
  )
}
