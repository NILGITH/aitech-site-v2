import Header from './Header'
import Footer from './Footer'
import Assistant from './Assistant'
import { getFaqs, getServices, getSettings } from '@/lib/data'

export default async function Site({ children }: { children: React.ReactNode }) {
  const [faqs, services, settings] = await Promise.all([getFaqs(), getServices(), getSettings()])
  const hours = settings.hours.map(([d, h]) => `${d} ${h}`).join(', ')
  const fill = (t: string) => t.replace('{phones}', settings.phones.join(' ou ')).replace('{email}', settings.email)
    .replace('{address}', settings.address).replace('{hours}', hours)
  const whatsapp = (settings.whatsapp || settings.phones[0] || '').replace(/\D/g, '')
  return (
    <>
      <Header /><main>{children}</main><Footer />
      <Assistant
        whatsapp={whatsapp}
        faqs={faqs.map((f) => ({ question: f.question, answer: fill(f.answer), keywords: f.keywords ?? [] }))}
        services={services.map((s) => ({ title: s.title, summary: s.summary, features: s.features ?? [] }))}
      />
    </>
  )
}
