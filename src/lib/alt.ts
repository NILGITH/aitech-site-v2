/** Textes alternatifs des photos livrées avec le site. */
const ALT: Record<string, string> = {
  '/images/cctv.jpg': 'Caméras de vidéosurveillance fixées sur une façade',
  '/images/code.jpg': 'Développeur devant des écrans affichant du code',
  '/images/devs.jpg': 'Deux collègues travaillant ensemble sur un ordinateur portable',
  '/images/headset.jpg': 'Casque audio posé sur un bureau devant un écran',
  '/images/pay.jpg': 'Paiement mobile avec un téléphone posé sur un terminal',
  '/images/tech.jpg': 'Technicien contrôlant une baie de serveurs avec un appareil de mesure',
  '/images/network.jpg': 'Câbles réseau branchés sur un commutateur',
  '/images/meeting.jpg': 'Équipe en réunion autour d’une table',
  '/images/tote.jpg': 'Sac en toile aux couleurs d’Aitech',
}
export const altFor = (src: string | null | undefined, fallback: string) => (src && ALT[src]) || fallback

/** Variantes WebP allégées pour les photos livrées avec le site (les images envoyées depuis le backoffice restent telles quelles). */
export function photo(src: string, sizes = '(max-width: 760px) 90vw, 45vw') {
  if (!/^\/images\/[a-z]+\.jpg$/.test(src)) return { src }
  const base = src.slice(0, -4)
  return { src, srcSet: `${base}-480.webp 480w, ${base}-900.webp 900w`, sizes }
}
