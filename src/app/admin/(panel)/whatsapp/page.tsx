import Link from 'next/link'
import { can, requirePerm } from '@/lib/access'
import { kapsoReady } from '@/lib/kapso'
import Inbox from './Inbox'

export default async function WhatsAppInbox() {
  const a = await requirePerm('messagerie')
  const ready = await kapsoReady()
  return (
    <div className="stack">
      <div className="a-head">
        <div><h1 className="h2">Messagerie WhatsApp</h1><p>Les messages reçus sur le numéro WhatsApp d&apos;AITECH. Les réponses envoyées ici apparaissent aussi dans la boîte de réception Kapso, et inversement.</p></div>
        <a className="btn small dark" href="https://app.kapso.ai" target="_blank" rel="noopener">Ouvrir Kapso</a>
      </div>
      {ready ? <Inbox /> : (
        <p className="warn">WhatsApp n&apos;est pas encore configuré : renseignez la clé Kapso et l&apos;identifiant du numéro{can(a, 'parametres') ? <> dans <Link href="/admin/parametres/notifications">Paramètres &gt; Notifications</Link></> : ' (demandez à un administrateur)'}.</p>
      )}
    </div>
  )
}
