/**
 * HomePage — Cartographic Editorial redesign
 *
 * Aesthetic: cartographic editorial — parchment, forest, gold, terrain.
 * Unauthenticated users see the landing page.
 * Authenticated users are redirected to /trips immediately.
 */

import { useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, useInView, type Variants } from 'framer-motion';
import { useUser } from '../context/UserContext';

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

const features: { icon: ReactNode; label: string; desc: string }[] = [
  {
    icon: (
      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    label: 'Multi-Agent AI',
    desc: '5 specialized agents, one seamless flow',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    label: 'Smart Budget',
    desc: 'Real-time tracking & optimization',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
    label: 'World Map',
    desc: 'All trips, beautifully visualized',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    label: 'PDF Export',
    desc: 'Share your itinerary anywhere',
  },
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
  const { userId } = useUser();

  if (userId) {
    return <Navigate to="/trips" replace />;
  }

  return (
    <div className="min-h-screen bg-parchment font-sans">

      {/* ══════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 carto-grid opacity-100 pointer-events-none" />

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
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF6F1] border border-[#C8D8C2] mb-7"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#3B6150]">
                  AI-Powered Travel Planning
                </span>
              </motion.div>

              {/* Display headline */}
              <motion.h1
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.08}
                className="font-display text-5xl sm:text-6xl lg:text-7xl leading-none text-forest mb-4"
              >
                Plan Your
                <br />
                <em className="text-gold" style={{ fontStyle: 'italic' }}>Escape.</em>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.16}
                className="text-[#7A8580] text-lg leading-relaxed max-w-md mb-10"
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
                  className="inline-flex items-center justify-center gap-2 bg-forest text-[#E8DECE] px-7 py-3.5 rounded-[8px] font-semibold text-sm hover:bg-forest/80 transition-colors"
                >
                  Start Planning
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigate('/trips')}
                  className="inline-flex items-center justify-center gap-2 bg-transparent text-forest px-7 py-3.5 rounded-[8px] font-semibold text-sm border border-[#DDD8CE] hover:bg-terrain/20 transition-colors"
                >
                  View My Trips
                </button>
              </motion.div>

              {/* Social proof strip */}
              {/* <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0.28}
                className="flex items-center gap-4 mt-10"
              >
                <div className="flex -space-x-2">
                  {['#D97706', '#059669', '#1C2B24', '#B59054'].map((color, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      {['A', 'B', 'C', 'D'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#8FA898]">
                  <span className="font-semibold text-[#3D3628]">Built for portfolio</span> — fully functional AI travel planner
                </p>
              </motion.div> */}
            </div>

            {/* ── Right: mock app card ──────────────────── */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0.18}
              className="relative flex justify-center lg:justify-end"
            >
              {/* Main card */}
              <div className="w-full max-w-sm bg-white rounded-3xl border border-[#DDD8CE] p-6 relative">
                {/* Card header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-sage mb-0.5">Upcoming trip</p>
                    <p className="font-display text-xl text-forest">Andaz Tokyo</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[9px] uppercase tracking-[0.08em] bg-[rgba(181,144,84,0.15)] border border-[rgba(181,144,84,0.4)] text-[#D9C8A8]">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    active
                  </span>
                </div>

                {/* Destination map thumbnail */}
                <div className="w-full h-36 rounded-2xl mb-5 relative overflow-hidden bg-terrain carto-grid flex items-end p-4">
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gold"
                    style={{ boxShadow: '0 0 0 4px rgba(181,144,84,0.25)' }}
                  />
                  <div className="relative z-10">
                    <p className="font-display text-sm text-forest">Andaz Tokyo</p>
                    <p className="font-mono text-[9px] text-sage">Sep 12 – Sep 26 · 14 days</p>
                  </div>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Budget',    value: '$3,200'  },
                    { label: 'Travelers', value: '2 adults' },
                    { label: 'Progress',  value: '74%'     },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-parchment rounded-xl p-3 text-center">
                      <p className="font-mono text-[8px] uppercase tracking-[0.08em] text-sage mb-0.5">{label}</p>
                      <p className="font-sans text-[12px] font-medium text-forest">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between font-mono text-[9px] text-sage mb-1.5">
                    <span>Trip progress</span>
                    <span>74%</span>
                  </div>
                  <div className="w-full h-[3px] bg-[#EEE8DA] rounded-full overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: '74%' }} />
                  </div>
                </div>

                {/* Explore button */}
                <button className="w-full mt-4 bg-forest text-[#E8DECE] py-3 rounded-xl font-mono text-[10px] uppercase tracking-[0.08em] hover:bg-forest/80 transition-colors">
                  View Trip Details →
                </button>
              </div>

              {/* Floating side card — Paris */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl border border-[#DDD8CE] p-4 w-48"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-terrain flex items-center justify-center text-sm">🗼</div>
                  <div>
                    <p className="font-sans text-[11px] font-medium text-forest">Paris</p>
                    <p className="font-mono text-[9px] text-sage">Mar 2025</p>
                  </div>
                </div>
                <div className="w-full h-1 bg-[#EEE8DA] rounded-full">
                  <div className="h-full rounded-full" style={{ width: '40%', background: '#D97706' }} />
                </div>
                <p className="font-mono text-[8px] text-sage mt-1">Planning · 40%</p>
              </motion.div>

              {/* Floating AI badge */}
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -top-4 -right-4 bg-forest text-[#E8DECE] rounded-2xl px-4 py-2.5"
              >
                <p className="font-mono text-[9px] text-[#E8DECE]">✨ AI Generated</p>
                <p className="font-mono text-[8px] text-sage">5-day itinerary ready</p>
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS
          ══════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="bg-white py-24 px-6 border-t border-[#DDD8CE]">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-16">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-sage mb-3">
              The Process
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-forest">
              Three steps to your<br />
              <em className="text-gold" style={{ fontStyle: 'italic' }}>dream trip.</em>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step, i) => (
              <RevealSection key={step.number} delay={i * 0.1}>
                <div className="group relative bg-parchment border border-[#DDD8CE] rounded-[12px] p-8 hover:border-gold transition-colors duration-300">
                  {/* Step number watermark */}
                  <p className="font-display text-7xl text-[#DDD8CE] leading-none mb-6 select-none">
                    {step.number}
                  </p>
                  <h3 className="font-sans font-medium text-forest text-lg mb-3">{step.title}</h3>
                  <p className="font-sans text-[12px] text-[#7A8580] leading-relaxed">{step.description}</p>

                  {/* Connector line for md+ */}
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-12 -right-5 lg:-right-8 w-6 lg:w-8 h-px bg-[#DDD8CE]" />
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
      <section id="features" className="bg-parchment py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-14">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-sage mb-3">
              What's inside
            </p>
            <h2 className="font-display text-4xl text-forest">
              Everything you need,<br />
              <em style={{ fontStyle: 'italic' }}>nothing you don't.</em>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <RevealSection key={f.label} delay={i * 0.07}>
                <div className="bg-white border border-[#DDD8CE] rounded-[10px] p-6 text-center">
                  <div className="w-[36px] h-[36px] bg-[#EEF6F1] rounded-[8px] flex items-center justify-center mx-auto mb-3">
                    {f.icon}
                  </div>
                  <p className="font-sans font-medium text-[12px] text-forest mb-1">{f.label}</p>
                  <p className="font-mono text-[9px] text-sage leading-relaxed">{f.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BOTTOM CTA
          ══════════════════════════════════════════════════════ */}
      <section className="bg-forest py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 carto-grid pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <RevealSection>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-sage mb-4">
              Ready when you are
            </p>
            <h2 className="font-display text-4xl sm:text-5xl text-[#E8DECE] mb-5 leading-tight">
              Your next adventure<br />
              <em className="text-gold" style={{ fontStyle: 'italic' }}>starts here.</em>
            </h2>
            <p className="text-sage text-[13px] mb-10 max-w-md mx-auto">
              Join the smarter way to plan and organize your travels.
              AI handles the details. You handle the memories.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center gap-2 bg-gold text-forest px-8 py-3.5 rounded-[8px] font-sans font-medium text-sm hover:bg-gold/80 transition-colors"
              >
                Start Planning
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/trips')}
                className="inline-flex items-center gap-2 text-sage border border-[rgba(255,255,255,0.15)] px-4 py-3.5 rounded-[8px] font-mono text-[10px] uppercase hover:text-[#E8DECE] transition-colors"
              >
                See my trips →
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest border-t border-[rgba(255,255,255,0.08)] px-6 py-4 flex items-center justify-between">
        <span className="font-display text-[14px] text-sage">TripMind</span>
        <span className="font-mono text-[9px] tracking-[0.08em] uppercase text-sage">
          Built by Daffa · Aspiring Software Engineer
        </span>
      </footer>

    </div>
  );
};

export default HomePage;
