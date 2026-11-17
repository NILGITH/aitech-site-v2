/** Cellule « personne » : nom, société, e-mail et téléphone cliquables, note éventuelle. */
export default function Contact({ name, company, email, phone, note }: { name: string; company?: string | null; email?: string | null; phone?: string | null; note?: string | null }) {
  return (
    <div className="a-contact">
      <strong>{name}{company ? <span> · {company}</span> : null}</strong>
      {email && <a href={`mailto:${email}`}>{email}</a>}
      {phone && <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>}
      {note && <p className="a-note" title={note}>{note}</p>}
    </div>
  )
}
