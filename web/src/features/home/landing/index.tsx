/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'
import {
  Bot,
  Code2,
  Image as ImageIcon,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
  Zap,
} from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { JETCLOUD } from '@/brand/jetcloud'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { formatPrice } from '@/features/pricing/lib/price'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { JetMark } from './jet-mark'
import './landing.css'

const PROVIDERS = [
  { name: 'OpenAI', icon: 'OpenAI.Color' },
  { name: 'Claude', icon: 'Claude.Color' },
  { name: 'Gemini', icon: 'Gemini.Color' },
  { name: 'Grok', icon: 'Grok.Color' },
  { name: 'DeepSeek', icon: 'DeepSeek.Color' },
  { name: 'Llama', icon: 'Meta.Color' },
  { name: 'Mistral', icon: 'Mistral.Color' },
  { name: 'Qwen', icon: 'Qwen.Color' },
  { name: 'Kimi', icon: 'Moonshot.Color' },
  { name: 'GLM', icon: 'Zhipu.Color' },
  { name: 'Midjourney', icon: 'Midjourney.Color' },
  { name: 'Stability', icon: 'Stability.Color' },
] as const

const DEMO_MODELS = [
  { id: 'gpt', label: 'GPT', model: 'gpt-4o' },
  { id: 'claude', label: 'Claude', model: 'claude-sonnet' },
  { id: 'gemini', label: 'Gemini', model: 'gemini-2.5-pro' },
  { id: 'grok', label: 'Grok', model: 'grok-3' },
  { id: 'deepseek', label: 'DeepSeek', model: 'deepseek-chat' },
] as const

type DemoId = (typeof DEMO_MODELS)[number]['id']

const DEMO_REPLIES: Record<DemoId, string> = {
  gpt: 'Landing demo reply GPT',
  claude: 'Landing demo reply Claude',
  gemini: 'Landing demo reply Gemini',
  grok: 'Landing demo reply Grok',
  deepseek: 'Landing demo reply DeepSeek',
}

type LandingProps = {
  isAuthenticated?: boolean
}

export function Landing(props: LandingProps) {
  const { t } = useTranslation()
  const primaryHref = props.isAuthenticated ? '/dashboard' : '/sign-up'
  const primaryLabel = props.isAuthenticated
    ? t('Go to Dashboard')
    : t('Create an account')

  return (
    <div className='jet-landing' data-testid='jet-landing'>
      <div className='jet-noise' aria-hidden='true' />
      <Hero primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <Marquee />
      <Demo />
      <Bento />
      <UseCases />
      <PricingTeaser />
      <Steps />
      <Faq />
      <FinalCta primaryHref={primaryHref} primaryLabel={primaryLabel} />
      <LandingFooter />
    </div>
  )
}

function Hero(props: { primaryHref: string; primaryLabel: string }) {
  const { t } = useTranslation()
  return (
    <section className='relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-24 pb-16 md:px-8 lg:grid-cols-2 lg:pt-28'>
      <div>
        <p className='text-sm font-medium text-[#7c3aed] dark:text-[#c4b5fd]'>
          {t('Supported models')}
        </p>
        <h1 className='mt-3 text-4xl leading-[1.25] font-bold md:text-6xl md:leading-[1.2]'>
          {t('Every top model. One key.')}
        </h1>
        <p className='text-muted-foreground mt-5 max-w-xl text-base leading-8 md:text-lg'>
          {t(
            'JetCloud puts the models you want behind a single OpenAI-compatible key. Charge in rial, watch every request, and skip the foreign card.'
          )}
        </p>
        <div className='mt-8 flex flex-wrap gap-3'>
          <Button
            className='h-11 rounded-full bg-[#7c3aed] px-5 text-white hover:bg-[#6d28d9]'
            render={<Link to={props.primaryHref} />}
          >
            {props.primaryLabel}
          </Button>
          <Button
            variant='outline'
            className='h-11 rounded-full px-5'
            render={<Link to='/pricing' />}
          >
            {t('Models and prices')}
          </Button>
        </div>
      </div>
      <Constellation />
    </section>
  )
}

function Constellation() {
  return (
    <div className='relative mx-auto aspect-square w-full max-w-[440px]'>
      <div
        aria-hidden='true'
        className='absolute inset-[18%] rounded-full bg-[radial-gradient(circle,rgb(139_92_246/35%),transparent_68%)]'
      />
      <div className='jet-orbit absolute inset-0'>
        {PROVIDERS.map((provider, index) => {
          const angle = (360 / PROVIDERS.length) * index
          return (
            <div
              key={provider.name}
              className='absolute top-1/2 left-1/2'
              style={{
                transform: `rotate(${angle}deg) translateY(-168px) rotate(-${angle}deg)`,
              }}
            >
              <div className='-mt-6 -ms-6'>
                <div className='jet-orbit-icon'>
                  <div className='jet-glass grid size-12 place-items-center rounded-2xl'>
                    {getLobeIcon(provider.icon, 26)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className='absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2'>
        <JetMark animated className='size-full drop-shadow-xl' />
      </div>
    </div>
  )
}

function Marquee() {
  const { t } = useTranslation()
  const loops = ['a', 'b'] as const
  return (
    <section aria-label={t('Supported models')} className='py-6'>
      <div className='overflow-hidden' dir='ltr'>
        <div className='jet-marquee-track flex w-max gap-3 px-3'>
          {loops.flatMap((loop) =>
            PROVIDERS.map((provider) => (
            <div
              key={`${loop}-${provider.name}`}
              className='jet-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm'
            >
              {getLobeIcon(provider.icon, 18)}
              <span>{provider.name}</span>
            </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

function Demo() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState<DemoId>('gpt')
  const model = DEMO_MODELS.find((item) => item.id === active) ?? DEMO_MODELS[0]
  const fullReply = t(DEMO_REPLIES[active])
  const [shown, setShown] = useState(fullReply)

  useEffect(() => {
    if (reduceMotion) {
      setShown(fullReply)
      return
    }
    setShown('')
    let index = 0
    const timer = window.setInterval(() => {
      index += 1
      setShown(fullReply.slice(0, index))
      if (index >= fullReply.length) window.clearInterval(timer)
    }, 28)
    return () => window.clearInterval(timer)
  }, [fullReply, reduceMotion])

  return (
    <section className='mx-auto grid max-w-6xl gap-6 px-5 py-16 md:px-8 lg:grid-cols-2'>
      <div>
        <h2 className='text-3xl font-bold'>{t('Same request. Swap the model.')}</h2>
        <p className='text-muted-foreground mt-3 leading-7'>
          {t(
            'Pick a model and the reply streams in. The request stays the same — only the model name changes.'
          )}
        </p>
        <div className='mt-6 flex flex-wrap gap-2' role='tablist'>
          {DEMO_MODELS.map((item) => (
            <button
              key={item.id}
              type='button'
              role='tab'
              aria-selected={item.id === active}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                item.id === active
                  ? 'border-transparent bg-[#7c3aed] text-white'
                  : 'border-border bg-transparent'
              )}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div
          role='tabpanel'
          className='jet-glass mt-4 min-h-28 rounded-3xl p-5 leading-8'
        >
          {shown}
        </div>
      </div>
      <pre
        dir='ltr'
        className='jet-glass overflow-x-auto rounded-3xl p-5 text-left text-sm leading-7'
      >
        <code>
          {`curl https://jetcloudapi.com/v1/chat/completions \\
  -H "Authorization: Bearer $KEY" \\
  -d '{"model":"${model.model}","messages":[{"role":"user","content":"..."}]}'`}
        </code>
      </pre>
    </section>
  )
}

const BENTO = [
  {
    icon: KeyRound,
    title: 'One key, every model',
    body: 'Send chat, code, and images through the same key. Swap the model name and keep your app.',
  },
  {
    icon: Wallet,
    title: 'Pay in rial',
    body: 'Top up in rial with local payment. No foreign card and no extra hop just to pay.',
  },
  {
    icon: Sparkles,
    title: 'Works with your tools',
    body: 'OpenAI-compatible routes. Point an existing client at JetCloud and change the base URL.',
  },
  {
    icon: ShieldCheck,
    title: 'See every rial',
    body: 'A live usage dashboard shows which model, key, and user spent what.',
  },
  {
    icon: Zap,
    title: 'Stays up',
    body: 'Requests fail over to the next healthy channel when one provider slows down.',
  },
  {
    icon: Workflow,
    title: 'Teams with limits',
    body: 'Give each teammate a key, a budget, and a rate limit.',
  },
] as const

function Bento() {
  const { t } = useTranslation()
  return (
    <section className='mx-auto max-w-6xl px-5 py-8 md:px-8'>
      <h2 className='text-3xl font-bold'>{t('Built around one key')}</h2>
      <div className='mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {BENTO.map((item) => (
          <BentoCard key={item.title} title={t(item.title)} body={t(item.body)}>
            <item.icon className='size-5 text-[#8b5cf6]' aria-hidden='true' />
          </BentoCard>
        ))}
      </div>
    </section>
  )
}

function BentoCard(props: {
  title: string
  body: string
  children: ReactNode
}) {
  return (
    <article
      className='jet-glass group relative overflow-hidden rounded-3xl p-5'
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty(
          '--mx',
          `${event.clientX - rect.left}px`
        )
        event.currentTarget.style.setProperty(
          '--my',
          `${event.clientY - rect.top}px`
        )
      }}
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100'
        style={{
          background:
            'radial-gradient(18rem circle at var(--mx) var(--my), rgb(139 92 246 / 22%), transparent 60%)',
        }}
      />
      <div className='relative'>
        {props.children}
        <h3 className='mt-4 text-lg font-semibold'>{props.title}</h3>
        <p className='text-muted-foreground mt-2 text-sm leading-7'>{props.body}</p>
      </div>
    </article>
  )
}

const CASES = [
  { icon: Bot, title: 'Chatbots', body: 'Answer customers without wiring a new provider for every model.' },
  { icon: Sparkles, title: 'Content', body: 'Draft, rewrite, and translate with the model that fits the tone.' },
  { icon: Code2, title: 'Coding', body: 'Point your editor at one endpoint and pick the coding model per task.' },
  { icon: ImageIcon, title: 'Images', body: 'Generate images from the same key you already use for chat.' },
  { icon: Workflow, title: 'Automation', body: 'Call several models from one workflow and one bill.' },
] as const

function UseCases() {
  const { t } = useTranslation()
  return (
    <section className='mx-auto max-w-6xl px-5 py-16 md:px-8'>
      <h2 className='text-3xl font-bold'>{t('Where teams use it')}</h2>
      <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
        {CASES.map((item) => (
          <article key={item.title} className='jet-glass rounded-3xl p-4'>
            <item.icon className='size-5 text-[#ec4899]' aria-hidden='true' />
            <h3 className='mt-3 font-semibold'>{t(item.title)}</h3>
            <p className='text-muted-foreground mt-2 text-sm leading-7'>{t(item.body)}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function PricingTeaser() {
  const { t } = useTranslation()
  const { models } = usePricingData()
  const preview = models.slice(0, 4)
  return (
    <section className='mx-auto max-w-6xl px-5 py-8 md:px-8'>
      <div className='jet-glass rounded-[2rem] p-6 md:p-8'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h2 className='text-3xl font-bold'>{t('Models and prices')}</h2>
            <p className='text-muted-foreground mt-2 max-w-xl leading-7'>
              {t('Live prices from the public catalog, when models are published.')}
            </p>
          </div>
          <Button variant='outline' className='rounded-full' render={<Link to='/pricing' />}>
            {t('Models and prices')}
          </Button>
        </div>
        {preview.length > 0 ? (
          <ul className='mt-6 grid gap-3 sm:grid-cols-2'>
            {preview.map((model) => (
              <li
                key={model.model_name}
                className='flex items-center justify-between rounded-2xl border border-white/40 px-4 py-3 dark:border-white/10'
              >
                <span className='font-medium'>{model.model_name}</span>
                <span className='text-sm' dir='ltr'>
                  {formatPrice(model, 'input', 'M', false, 1, 1)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-muted-foreground mt-6 text-sm'>
            {t('Prices appear here as soon as models are available.')}
          </p>
        )}
      </div>
    </section>
  )
}

const STEPS = [
  { title: 'Create a key', body: 'Make one API key in the console.' },
  { title: 'Call a model', body: 'Use the OpenAI-compatible endpoint and set the model name.' },
  { title: 'Watch the cost', body: 'Usage and rial spend show up as the requests land.' },
] as const

function Steps() {
  const { t } = useTranslation()
  return (
    <section className='mx-auto max-w-6xl px-5 py-16 md:px-8'>
      <h2 className='text-3xl font-bold'>{t('How it starts')}</h2>
      <ol className='mt-8 grid gap-4 md:grid-cols-3'>
        {STEPS.map((step, index) => (
          <li key={step.title} className='jet-glass rounded-3xl p-5'>
            <span className='text-sm font-semibold text-[#8b5cf6]'>
              {index + 1}
            </span>
            <h3 className='mt-3 text-lg font-semibold'>{t(step.title)}</h3>
            <p className='text-muted-foreground mt-2 text-sm leading-7'>{t(step.body)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

const FAQS = [
  {
    q: 'Do I need a separate key for each model?',
    a: 'No. One JetCloud key can call every model your account is allowed to use. Change the model field, not the key.',
  },
  {
    q: 'Can I pay in rial?',
    a: 'Yes. Credit is charged in rial through local payment. You do not need a foreign card to top up.',
  },
  {
    q: 'Will my current OpenAI client work?',
    a: 'If it speaks the OpenAI chat API, point it at the JetCloud base URL and use your JetCloud key.',
  },
  {
    q: 'What happens if a provider is slow?',
    a: 'Routing can move the request to another healthy channel so the call does not sit on a stalled provider.',
  },
] as const

function Faq() {
  const { t } = useTranslation()
  return (
    <section className='mx-auto max-w-3xl px-5 py-8 md:px-8'>
      <h2 className='text-3xl font-bold'>{t('Questions')}</h2>
      <Accordion className='mt-6'>
        {FAQS.map((item) => (
          <AccordionItem key={item.q} value={item.q}>
            <AccordionTrigger>{t(item.q)}</AccordionTrigger>
            <AccordionContent>{t(item.a)}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}

function FinalCta(props: { primaryHref: string; primaryLabel: string }) {
  const { t } = useTranslation()
  return (
    <section className='mx-auto max-w-6xl px-5 py-16 md:px-8'>
      <div className='jet-glass rounded-[2rem] px-6 py-12 text-center md:px-12'>
        <h2 className='text-3xl font-bold md:text-5xl'>{t('Ready when you are')}</h2>
        <p className='text-muted-foreground mx-auto mt-4 max-w-xl leading-8'>
          {t('Create an account, add credit in rial, and send the first request.')}
        </p>
        <Button
          className='mt-8 h-11 rounded-full bg-[#7c3aed] px-6 text-white hover:bg-[#6d28d9]'
          render={<Link to={props.primaryHref} />}
        >
          {props.primaryLabel}
        </Button>
      </div>
    </section>
  )
}

function LandingFooter() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()
  return (
    <footer className='mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8'>
      <div className='flex items-center gap-3'>
        <img src={JETCLOUD.logo} alt='' className='size-9' />
        <div>
          <div className='font-semibold'>{JETCLOUD.name}</div>
          <div className='text-muted-foreground text-sm'>{JETCLOUD.nameEn}</div>
        </div>
      </div>
      <nav className='text-muted-foreground flex flex-wrap gap-4 text-sm'>
        <Link to='/pricing'>{t('Models and prices')}</Link>
        <Link to='/about'>{t('About')}</Link>
        <Link to='/sign-in'>{t('Sign in')}</Link>
      </nav>
      <p className='text-muted-foreground text-sm'>
        © {year} {JETCLOUD.name}
      </p>
    </footer>
  )
}
