/**
 * HomePage — Redesigned Week 7
 *
 * Aesthetic: editorial travel magazine — warm off-white, large display serif,
 * clean cards, generous negative space. Close to Easy Trip but TripMind-branded.
 *
 * All colours flow from tailwind.config.js tokens (surface/ink/brand/status).
 * To retheme: only edit tailwind.config.js.
 *
 * Fonts required in index.html <head>:
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;1,400&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet">
 */

import { useRef } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, type Variants } from 'framer-motion';

// ── Data ──────────────────────────────────────────────────────
const steps = [
  {
    number: '01',
    title: 'Chat with AI',
    description:
      'Tell our assistant your destination, travel dates, and budget — all in plain English. No forms, no friction.',
  },
  {
    number: '02',
    title: 'Get Your Plan',
    description:
      'A personalized itinerary is built for you instantly. Hidden gems, smart budget splits, day-by-day detail.',
  },
  {
    number: '03',
    title: 'Travel & Track',
    description:
      'Every trip lives on your interactive world map. Track progress, expenses, and real-time tips on the go.',
  },
];

const features = [
  { icon: '🤖', label: 'Multi-Agent AI',    desc: '5 specialized agents, one seamless flow' },
  { icon: '💰', label: 'Smart Budget',       desc: 'Real-time tracking & optimization' },
  { icon: '🌍', label: 'World Map',          desc: 'All trips, beautifully visualized' },
  { icon: '📄', label: 'PDF Export',         desc: 'Share your itinerary anywhere' },
];

// ── Animation helpers ─────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay },
  }),
};

// Section that fades in when it enters the viewport
const RevealSection: FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children, className = '', delay = 0,
}) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────────
const HomePage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-bg font-sans">

      {/* ══════════════════════════════════════════════════════
          HERO
          Layout: left copy block + right mock card (Easy Trip style)
          ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        {/* Soft lavender blob — top right, Easy Trip's signature tone */}
        <div
          className="absolute top-0 right-0 w-[55%] h-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 80% 30%, #E8E4F8 0%, #EDE9FE 30%, transparent 70%)',
          }}
        />
        {/* Warm blob — bottom left */}
        <div
          className="absolute bottom-0 left-0 w-[40%] h-[50%] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 20% 80%, #FEF3C7 0%, transparent 65%)',
          }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* ── Left: copy ─────────────────────────────── */}
            <div>
              {/* Eyebrow label */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 ring-1 ring-brand-200 mb-7"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">
                  AI-Powered Travel Planning
                </span>
              </motion.div>

              {/* Display headline — mixed serif + italic weight like Easy Trip */}
              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.08}
                className="font-display text-5xl sm:text-6xl lg:text-7xl leading-none text-ink mb-4"
              >
                Plan Your
                <br />
                <em className="not-italic" style={{ fontStyle: 'italic' }}>Escape.</em>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.16}
                className="text-ink-secondary text-lg leading-relaxed max-w-md mb-10"
              >
                Tell TripMind where you want to go. It builds your itinerary,
                manages your budget, and keeps every detail organized — so you
                can focus on the adventure.
              </motion.p>

              {/* CTAs */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.22}
                className="flex flex-col sm:flex-row gap-3"
              >
                <button
                  onClick={() => navigate('/chat')}
                  className="inline-flex items-center justify-center gap-2 bg-white text-ink px-7 py-3.5 rounded-2xl font-semibold text-sm hover:bg-surface-muted transition-colors ring-1 shadow-sm"
                >
                  Start Planning
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigate('/trips')}
                  className="inline-flex items-center justify-center gap-2 bg-white text-ink px-7 py-3.5 rounded-2xl font-semibold text-sm hover:bg-surface-muted transition-colors ring-1 ring-surface-muted shadow-card"
                >
                  View My Trips
                </button>
              </motion.div>

              {/* Social proof strip */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.28}
                className="flex items-center gap-4 mt-10"
              >
                <div className="flex -space-x-2">
                  {['#FDA4AF','#86EFAC','#93C5FD','#FCD34D'].map((color, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      {['A','B','C','D'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink-tertiary">
                  <span className="font-semibold text-ink">Built for portfolio</span> — fully functional AI travel planner
                </p>
              </motion.div>
            </div>

            {/* ── Right: mock app card (Easy Trip phone-style) ── */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.18}
              className="relative flex justify-center lg:justify-end"
            >
              {/* Main card */}
              <div className="w-full max-w-sm bg-white rounded-3xl shadow-modal p-6 relative">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-ink-tertiary mb-0.5">Upcoming trip</p>
                    <p className="font-display text-xl text-ink">Exotic Bali</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    completed
                  </span>
                </div>

                {/* Destination image placeholder */}
                <div
                  className="w-full h-36 rounded-2xl mb-5 flex items-end p-4 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #86EFAC 0%, #34D399 40%, #059669 100%)',
                  }}
                >
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")'}}
                  />
                  <div className="relative">
                    <p className="text-white font-semibold text-sm">The Bali Dream Villa</p>
                    <p className="text-white/70 text-xs">Nov 24 – Dec 2 · 8 days</p>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Budget',   value: '$3,200' },
                    { label: 'Travelers', value: '2 adults' },
                    { label: 'Progress', value: '74%' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-surface-bg rounded-xl p-3 text-center">
                      <p className="text-xs text-ink-tertiary mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-ink">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-ink-tertiary mb-1.5">
                    <span>Trip progress</span>
                    <span>74%</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full bg-brand-500 rounded-full" style={{ width: '74%' }} />
                  </div>
                </div>

                {/* Explore button */}
                <button className="w-full mt-4 bg-ink text-white py-3 rounded-xl text-sm font-semibold hover:bg-ink/80 transition-colors">
                  View Trip Details →
                </button>
              </div>

              {/* Floating side card — another trip snippet */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-card-hover p-4 w-48"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-sm">🗼</div>
                  <div>
                    <p className="text-xs font-semibold text-ink">Paris</p>
                    <p className="text-xs text-ink-tertiary">Mar 2025</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-surface-muted rounded-full">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '40%' }} />
                </div>
                <p className="text-xs text-ink-tertiary mt-1">Planning · 40%</p>
              </motion.div>

              {/* Floating AI badge */}
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -top-4 -right-4 bg-ink text-white rounded-2xl px-4 py-2.5 shadow-card-hover"
              >
                <p className="text-xs font-semibold">✨ AI Generated</p>
                <p className="text-xs text-white/60">5-day itinerary ready</p>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
          Clean numbered steps, editorial typography
          ══════════════════════════════════════════════════════ */}
      <section className="bg-white py-24 px-6 border-t border-surface-muted">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              The Process
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-ink">
              Three steps to your<br />
              <em style={{ fontStyle: 'italic' }}>dream trip.</em>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step, i) => (
              <RevealSection key={step.number} delay={i * 0.1}>
                <div className="group relative bg-surface-bg rounded-3xl p-8 hover:bg-brand-50 transition-colors duration-300">
                  {/* Step number — large display watermark */}
                  <p className="font-display text-7xl text-surface-muted group-hover:text-brand-100 transition-colors duration-300 leading-none mb-6 select-none">
                    {step.number}
                  </p>
                  <h3 className="font-semibold text-ink text-lg mb-3">{step.title}</h3>
                  <p className="text-ink-secondary text-sm leading-relaxed">{step.description}</p>

                  {/* Connector line for md+ */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 -right-5 lg:-right-8 w-6 lg:w-8 h-px bg-surface-muted" />
                  )}
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES GRID
          ══════════════════════════════════════════════════════ */}
      <section className="bg-surface-bg py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-3">
              What's inside
            </p>
            <h2 className="font-display text-4xl text-ink">
              Everything you need,<br />
              <em style={{ fontStyle: 'italic' }}>nothing you don't.</em>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <RevealSection key={f.label} delay={i * 0.07}>
                <div className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-shadow group text-center">
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <p className="font-semibold text-ink text-sm mb-1">{f.label}</p>
                  <p className="text-ink-tertiary text-xs leading-relaxed">{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BOTTOM CTA
          Warm, minimal — contrasts with the rest
          ══════════════════════════════════════════════════════ */}
      <section className="bg-surface-bg py-24 px-6 relative overflow-hidden">
        {/* Subtle blob decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)', filter: 'blur(60px)' }}
        />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.1), transparent 70%)', filter: 'blur(50px)' }}
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <RevealSection>
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
              Ready when you are
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-black mb-5 leading-tight">
              Your next adventure<br />
              <em style={{ fontStyle: 'italic' }}>starts here.</em>
            </h2>
            <p className="text-black/50 text-base mb-10 max-w-md mx-auto">
              Join the smarter way to plan and organize your travels.
              AI handles the details. You handle the memories.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 bg-white text-ink px-8 py-3.5 rounded-2xl font-semibold text-sm hover:text-slate-300 transition-colors shadow-sm"
              >
                Start Planning
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/trips')}
                className="inline-flex items-center gap-2 text-ink/70 hover:text-slate-300 text-sm font-medium transition-colors px-4 py-3.5"
              >
                See my trips →
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

    </div>
  );
};

export default HomePage;