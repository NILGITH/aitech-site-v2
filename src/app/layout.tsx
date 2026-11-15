import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: "AITECH Côte d'Ivoire — Connecter, Innover, Transformer", template: '%s | AITECH' },
  description: "AITECH Côte d'Ivoire installe, développe et sécurise vos outils numériques : réseaux, vidéosurveillance, applications web et mobiles, paiement mobile.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}
