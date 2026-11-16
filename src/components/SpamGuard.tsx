'use client'
import { useEffect, useState } from 'react'

/** Protection anti-spam : champ piège invisible et heure d'ouverture du formulaire. */
export default function SpamGuard() {
  const [t, setT] = useState('')
  useEffect(() => { setT(String(Date.now())) }, [])
  return (
    <>
      <div className="hp" aria-hidden="true">
        <label>Ne remplissez pas ce champ<input name="website" tabIndex={-1} autoComplete="off" defaultValue="" /></label>
      </div>
      <input type="hidden" name="_t" value={t} />
    </>
  )
}
