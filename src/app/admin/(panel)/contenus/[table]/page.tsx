import { permForTable, requirePerm } from '@/lib/access'
import { notFound } from 'next/navigation'
import { deleteRow, saveRow } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import ImageField from '@/components/ImageField'
import { TABLES, type Field, type TableDef } from '@/lib/tables'

type Row = Record<string, unknown>

type Refs = Record<string, { id: string; label: string }[]>

function Input({ field, row, uid, table, refs }: { field: Field; row?: Row; uid: string; table: string; refs: Refs }) {
  const id = `${uid}-${field.name}`
  const v = row?.[field.name]
  if (field.type === 'image') return <ImageField id={id} name={field.name} label={field.label} value={v == null ? '' : String(v)} folder={table} />
  if (field.type === 'ref') {
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
        <select id={id} name={field.name} defaultValue={v == null ? '' : String(v)} required={field.required}>
          <option value="">Choisir…</option>
          {(refs[field.name] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
    )
  }
  if (field.type === 'date') {
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
        <input id={id} name={field.name} type="date" defaultValue={v ? String(v).slice(0, 10) : ''} required={field.required} />
      </div>
    )
  }
  if (field.type === 'datetime') {
    const local = v ? new Date(String(v)).toISOString().slice(0, 16) : ''
    return (
      <div className="field">
        <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
        <input id={id} name={field.name} type="datetime-local" defaultValue={local} required={field.required} />
      </div>
    )
  }
  if (field.type === 'bool') {
    return <label htmlFor={id} className="row" style={{ gap: 8, minHeight: 44 }}><input id={id} type="checkbox" name={field.name} defaultChecked={row ? Boolean(v) : true} style={{ width: 22, height: 22 }} />{field.label}</label>
  }
  const text = field.type === 'list' ? ((v as string[] | undefined) ?? []).join('\n') : field.type === 'json' ? (v ? JSON.stringify(v, null, 2) : '') : v == null ? '' : String(v)
  return (
    <div className="field">
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
      {field.type === 'textarea' || field.type === 'list' || field.type === 'json'
        ? <textarea id={id} name={field.name} rows={field.type === 'textarea' ? 4 : 6} defaultValue={text} required={field.required} />
        : field.type === 'select'
          ? <select id={id} name={field.name} defaultValue={text || field.options?.[0]}>{field.options?.map((o) => <option key={o} value={o}>{o}</option>)}</select>
          : <input id={id} name={field.name} type={field.type === 'number' ? 'number' : 'text'} defaultValue={text} required={field.required} />}
    </div>
  )
}

function RowForm({ table, def, row, refs }: { table: string; def: TableDef; row?: Row; refs: Refs }) {
  const uid = row ? String(row[def.key]) : 'new'
  const wide = (f: Field) => ['textarea', 'image', 'list', 'json'].includes(f.type)
  return (
    <div className="a-edit">
      <form action={saveRow} id={`f-${uid}`} className="a-grid">
        <input type="hidden" name="_table" value={table} />
        <input type="hidden" name="_id" value={row ? String(row[def.key]) : ''} />
        {def.fields.map((f) => <div key={f.name} className={wide(f) ? 'span' : undefined}><Input field={f} row={row} uid={uid} table={table} refs={refs} /></div>)}
      </form>
      <div className="a-edit-foot">
        <button className="btn" type="submit" form={`f-${uid}`}>{row ? 'Enregistrer les modifications' : 'Ajouter'}</button>
        {row && (
          <form action={deleteRow}>
            <input type="hidden" name="_table" value={table} />
            <input type="hidden" name="_id" value={String(row[def.key])} />
            <button className="a-danger" type="submit">Supprimer</button>
          </form>
        )}
      </div>
    </div>
  )
}

const money = (n: unknown) => `${new Intl.NumberFormat('fr-FR').format(Number(n))} FCFA`.replace(/\u202f/g, ' ')

/** Résumé d'une ligne : vignette, titre, informations clés et état de publication. */
function Summary({ def, row, refLabel }: { def: TableDef; row: Row; refLabel?: string }) {
  const img = def.fields.find((f) => f.type === 'image')
  const src = img ? (row[img.name] as string | null) : null
  const meta: string[] = []
  if (refLabel) meta.push(refLabel)
  for (const f of def.fields) {
    const v = row[f.name]
    if (v == null || v === '' || f.name === def.title) continue
    if (f.type === 'select' && meta.length < 3) meta.push(String(v))
    if (f.name === 'price_xof' || f.name === 'price') meta.push(Number(v) > 0 ? money(v) : 'Gratuit')
    if ((f.type === 'datetime' || f.type === 'date') && f.name.startsWith('start')) meta.push(new Date(String(v)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }))
  }
  const pubField = def.fields.find((f) => f.name === 'published' || f.name === 'active')
  const on = pubField ? row[pubField.name] !== false : true
  return (
    <summary className="a-row">
      {img && (src ? <img src={src} alt="" className="a-thumb" /> : <span className="a-thumb empty" aria-hidden="true" />)}
      <span className="a-row-main"><strong>{String(row[def.title] ?? 'Sans titre')}</strong>{meta.length > 0 && <span>{meta.join(' · ')}</span>}</span>
      {pubField && <span className={`a-pill ${on ? 'ok' : 'off'}`}>{on ? (pubField.name === 'active' ? 'En vente' : 'Publié') : (pubField.name === 'active' ? 'Retiré' : 'Masqué')}</span>}
      <span className="a-row-edit">Modifier</span>
    </summary>
  )
}

export default async function ContentTable({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params
  const def = TABLES[table]
  if (!def) notFound()
  await requirePerm(permForTable(table))
  const db = (await sessionClient())!
  const { data } = await db.from(table).select('*').order(def.order, { ascending: def.order !== 'starts_at' })
  const rows = (data ?? []) as Row[]
  const refs: Refs = {}
  for (const f of def.fields) {
    if (f.type !== 'ref' || !f.ref) continue
    const { data: opts } = await db.from(f.ref.table).select(`id, ${f.ref.label}`).order('position', { ascending: true })
    refs[f.name] = ((opts ?? []) as unknown as Row[]).map((o) => ({ id: String(o.id), label: String(o[f.ref!.label] ?? '') }))
  }
  const refField = def.fields.find((f) => f.type === 'ref')
  const refLabel = (row: Row) => (refField ? refs[refField.name]?.find((o) => o.id === String(row[refField.name]))?.label : undefined)
  return (
    <div className="stack" style={{ maxWidth: 1080 }}>
      <div className="a-head"><div><h1 className="h2">{def.label}</h1><p>{rows.length} élément{rows.length > 1 ? 's' : ''}. Cliquez sur une ligne pour la modifier ; les changements apparaissent sur le site en moins d&apos;une minute.</p></div></div>
      <details className="a-card a-add">
        <summary className="a-row"><span className="a-add-ico" aria-hidden="true">+</span><span className="a-row-main"><strong>Ajouter un élément</strong></span></summary>
        <RowForm table={table} def={def} refs={refs} />
      </details>
      {rows.length === 0 ? <p className="a-empty a-card">Cette rubrique est vide dans la base : le site affiche pour l&apos;instant les contenus par défaut.</p> : (
        <div className="a-card a-rows">
          {rows.map((row) => (
            <details key={String(row[def.key])}>
              <Summary def={def} row={row} refLabel={refLabel(row)} />
              <RowForm table={table} def={def} row={row} refs={refs} />
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
