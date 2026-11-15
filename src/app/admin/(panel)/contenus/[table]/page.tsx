import { notFound } from 'next/navigation'
import { deleteRow, saveRow } from '@/app/actions'
import { sessionClient } from '@/lib/supabase'
import { TABLES, type Field, type TableDef } from '@/lib/tables'

type Row = Record<string, unknown>

function Input({ field, row, uid }: { field: Field; row?: Row; uid: string }) {
  const id = `${uid}-${field.name}`
  const v = row?.[field.name]
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

function RowForm({ table, def, row }: { table: string; def: TableDef; row?: Row }) {
  const uid = row ? String(row[def.key]) : 'new'
  return (
    <div className="stack" style={{ gap: 12 }}>
      <form action={saveRow} className="stack" style={{ gap: 14 }}>
        <input type="hidden" name="_table" value={table} />
        <input type="hidden" name="_id" value={row ? String(row[def.key]) : ''} />
        {def.fields.map((f) => <Input key={f.name} field={f} row={row} uid={uid} />)}
        <button className="btn small" type="submit" style={{ alignSelf: 'flex-start' }}>{row ? 'Enregistrer' : 'Ajouter'}</button>
      </form>
      {row && (
        <form action={deleteRow}>
          <input type="hidden" name="_table" value={table} />
          <input type="hidden" name="_id" value={String(row[def.key])} />
          <button className="link" type="submit" style={{ background: 'none', border: 0, cursor: 'pointer', color: '#7A1F1A', font: '600 16px Urbanist, sans-serif' }}>Supprimer cet élément</button>
        </form>
      )}
    </div>
  )
}

export default async function ContentTable({ params }: { params: Promise<{ table: string }> }) {
  const { table } = await params
  const def = TABLES[table]
  if (!def) notFound()
  const db = (await sessionClient())!
  const { data } = await db.from(table).select('*').order(def.order, { ascending: true })
  const rows = (data ?? []) as Row[]
  return (
    <div className="stack" style={{ gap: 24, maxWidth: 860 }}>
      <h1 className="h2">{def.label}</h1>
      {rows.length === 0 && <p className="muted">Cette rubrique est vide dans la base : le site affiche pour l&apos;instant les contenus par défaut. Ajoutez un premier élément ci-dessous.</p>}
      {rows.map((row) => (
        <details key={String(row[def.key])} className="col" style={{ gap: 0 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 19, minHeight: 44 }}>{String(row[def.title] ?? '')}</summary>
          <div style={{ paddingTop: 16 }}><RowForm table={table} def={def} row={row} /></div>
        </details>
      ))}
      <details className="col" style={{ gap: 0 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 19, minHeight: 44 }}>Ajouter un élément</summary>
        <div style={{ paddingTop: 16 }}><RowForm table={table} def={def} /></div>
      </details>
    </div>
  )
}
