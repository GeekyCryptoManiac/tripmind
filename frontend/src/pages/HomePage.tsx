import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';

const steps = [
  {
    number: 1,
    icon: '💬',
    title: 'Chat with AI',
    description:
      'Tell our AI assistant your destination, travel dates, budget, and preferences — all in plain English.',
  },
  {
    number: 2,
    icon: '🗺️',
    title: 'Get Your Plan',
    description:
      'AI builds a personalized itinerary, suggests hidden gems, and automatically optimizes your budget.',
  },
  {
    number: 3,
    icon: '✈️',
    title: 'Travel & Track',
    description:
      'See all your trips on an interactive world map. Track your progress and get real-time travel tips.',
  },
];

const features = [
  { icon: '🤖', label: 'Multi-Agent AI',  desc: '5 specialized agents working together' },
  { icon: '💰', label: 'Smart Budget',    desc: 'Real-time budget tracking & optimization' },
  { icon: '🌍', label: 'World Map',       desc: 'Interactive trip visualization' },
  { icon: '💬', label: 'Live Chat',       desc: 'Ask anything, anytime' },
];

const HomePage: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">

      {/* ════════════════════════════════════════════════════
          HERO
          ════════════════════════════════════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 30%, #4338ca 65%, #5b21b6 100%)' }}
      >
        {/* Decorative blobs — pure visual depth, no content */}
        <div className="absolute rounded-full" style={{
          width: '500px', height: '500px', top: '-120px', right: '-120px',
          background: 'radial-gradient(circle, rgba(96,165,250,0.4), transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div className="absolute rounded-full" style={{
          width: '400px', height: '400px', bottom: '-100px', left: '-100px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.3), transparent 70%)',
          filter: 'blur(50px)',
        }} />
        <div className="absolute rounded-full" style={{
          width: '250px', height: '250px', top: '35%', left: '65%',
          background: 'radial-gradient(circle, rgba(125,211,252,0.25), transparent 70%)',
          filter: 'blur(40px)',
        }} />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge pill */}
          <div
            className="inline-flex items-center px-4 py-1.5 rounded-full mb-8"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className="text-white text-sm font-medium">✨ AI-Powered Travel Planning</span>
          </div>

          {/* Headline — two lines for visual weight */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            Plan Your Perfect Trip
          </h1>
          <p className="text-2xl sm:text-3xl font-medium mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
            with the power of AI
          </p>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            Tell our AI where you want to go. It builds your itinerary, manages your budget,
            and keeps every detail of your trip organized — so you can focus on the adventure.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/chat')}
              className="w-full sm:w-auto px-8 py-3.5 bg-white text-blue-700 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
            >
              Start Planning →
            </button>
            <button
              onClick={() => navigate('/trips')}
              className="w-full sm:w-auto px-8 py-3.5 text-white rounded-xl font-semibold text-base transition-all"
              style={{ border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.1)' }}
            >
              View My Trips
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Scroll
          </span>
          <div className="w-px h-8 animate-pulse" style={{ background: 'rgba(255,255,255,0.35)' }} />
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          HOW IT WORKS
          ════════════════════════════════════════════════════ */}
      <section className="bg-gray-50 py-20 sm:py-28 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500 text-lg">Three simple steps to your dream vacation</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="bg-white rounded-2xl border border-gray-200 p-8 text-center hover:shadow-md transition-shadow"
              >
                {/* Icon + step-number badge */}
                <div className="relative inline-flex">
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl">
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold flex items-center justify-center shadow-sm">
                    {step.number}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mt-5 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          FEATURES STRIP
          ════════════════════════════════════════════════════ */}
      <section className="bg-white py-16 px-4 border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon, label, desc }) => (
              <div key={label} className="text-center p-2">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="font-semibold text-gray-900 text-sm">{label}</p>
                <p className="text-gray-400 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════
          BOTTOM CTA
          ════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden py-20 sm:py-28 px-4"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #4338ca 100%)' }}
      >
        {/* Subtle decorative blob — matches hero family */}
        <div className="absolute bottom-0 right-0 rounded-full" style={{
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.3), transparent 70%)',
          filter: 'blur(40px)',
        }} />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to start your journey?
          </h2>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Join the smarter way to plan and organize your travels.
          </p>
          <button
            onClick={() => navigate('/chat')}
            className="px-8 py-3.5 bg-white text-blue-700 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
          >
            Start Planning →
          </button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;