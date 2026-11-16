/** Adresse publique du site (à remplacer par le domaine définitif via NEXT_PUBLIC_SITE_URL). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://aitech-site-v2-rho.vercel.app').replace(/\/$/, '')
